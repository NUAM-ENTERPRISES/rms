import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface UserRolesAndPermissions {
  roles: string[];
  permissions: string[];
  teamIds: string[];
  userVersion: number;
}

interface CacheEntry {
  data: UserRolesAndPermissions;
  timestamp: number;
}

@Injectable()
export class RbacUtil {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 60000; // 60 seconds

  constructor(private prisma: PrismaService) {}

  async getUserRolesAndPermissions(
    userId: string,
  ): Promise<UserRolesAndPermissions> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Fetch from database
    const userRoles = await (this.prisma as any).userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Get user's team assignments
    const userTeams = await (this.prisma as any).userTeam.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const roles = userRoles.map((ur) => ur.role.name);
    const permissions = new Set<string>();
    const teamIds = userTeams.map((ut) => ut.teamId);

    // Collect all permissions from user's roles
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.key);
      }
    }

    // Get user's updatedAt for version tracking
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { updatedAt: true },
    });

    const result: UserRolesAndPermissions = {
      roles,
      permissions: Array.from(permissions),
      teamIds,
      userVersion: user?.updatedAt.getTime() || Date.now(),
    };

    // Cache the result
    this.cache.set(userId, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  async getEffectiveScope(
    userId: string,
  ): Promise<'all' | { teamIds: string[] }> {
    const { roles, permissions, teamIds } =
      await this.getUserRolesAndPermissions(userId);

    // Global admins have access to all teams
    if (
      roles.includes('CEO') ||
      roles.includes('Director') ||
      permissions.includes('*') ||
      permissions.includes('read:all')
    ) {
      return 'all';
    }

    // Return team-scoped access
    return { teamIds };
  }

  async hasRole(userId: string, requiredRoles: string[]): Promise<boolean> {
    const { roles } = await this.getUserRolesAndPermissions(userId);

    // Check for global admin roles (CEO, Director)
    if (roles.includes('CEO') || roles.includes('Director')) {
      return true;
    }

    return requiredRoles.some((role) => roles.includes(role));
  }

  async hasPermission(
    userId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const { permissions } = await this.getUserRolesAndPermissions(userId);

    // Check for global permissions
    if (
      permissions.includes('*') ||
      permissions.includes('manage:all') ||
      permissions.includes('read:all')
    ) {
      return true;
    }

    return requiredPermissions.some((permission) =>
      permissions.includes(permission),
    );
  }

  async checkTeamAccess(
    userId: string,
    resourceTeamId: string,
  ): Promise<boolean> {
    const { roles, permissions } =
      await this.getUserRolesAndPermissions(userId);

    // Global admins have access to all teams
    if (
      roles.includes('CEO') ||
      roles.includes('Director') ||
      permissions.includes('*')
    ) {
      return true;
    }

    // Managers have access to multiple teams
    if (roles.includes('Manager') && permissions.includes('read:all')) {
      return true;
    }

    // Check if user is assigned to the specific team
    const userTeam = await (this.prisma as any).userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: resourceTeamId,
        },
      },
    });

    return !!userTeam;
  }

  clearUserCache(userId: string): void {
    this.cache.delete(userId);
  }

  clearAllCache(): void {
    this.cache.clear();
  }
}
