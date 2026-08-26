import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RbacUtil } from '../auth/rbac/rbac.util';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRolesDto } from './dto/query-roles.dto';
import { QueryRoleUsersDto } from './dto/query-role-users.dto';
import { Prisma } from '@prisma/client';
import { roleNameAliases } from '../common/constants/role-ids';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private rbacUtil: RbacUtil,
  ) {}

  /**
   * Find role ID by name (case-insensitive; includes legacy aliases)
   */
  async findIdByName(name: string): Promise<string> {
    const aliases = roleNameAliases(name);
    const role = await this.prisma.role.findFirst({
      where: {
        OR: aliases.map((alias) => ({
          name: {
            equals: alias,
            mode: 'insensitive' as const,
          },
        })),
      },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException(`Role with name "${name}" not found`);
    }

    return role.id;
  }

  async findAll(query: QueryRolesDto = {}) {
    const {
      search,
      type = 'ALL',
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const searchWhere: Prisma.RoleWhereInput | undefined = search?.trim()
      ? {
          OR: [
            {
              name: {
                contains: search.trim(),
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search.trim(),
                mode: 'insensitive',
              },
            },
          ],
        }
      : undefined;

    const typeWhere: Prisma.RoleWhereInput | undefined =
      type === 'SYSTEM'
        ? { isSystem: true }
        : type === 'CUSTOM'
          ? { isSystem: false }
          : undefined;

    const where: Prisma.RoleWhereInput = {
      ...(searchWhere ?? {}),
      ...(typeWhere ?? {}),
    };

    const countBaseWhere: Prisma.RoleWhereInput = {
      ...(searchWhere ?? {}),
    };

    const [roles, total, allCount, systemCount, customCount] =
      await Promise.all([
        this.prisma.role.findMany({
          where,
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.role.count({ where }),
        this.prisma.role.count({ where: countBaseWhere }),
        this.prisma.role.count({
          where: { ...countBaseWhere, isSystem: true },
        }),
        this.prisma.role.count({
          where: { ...countBaseWhere, isSystem: false },
        }),
      ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      roles: roles.map((role) => this.mapRole(role)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      counts: {
        all: allCount,
        system: systemCount,
        custom: customCount,
      },
    };
  }

  async findAssignedUsers(roleId: string, query: QueryRoleUsersDto = {}) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = { roleId };

    const [userRoles, total] = await Promise.all([
      this.prisma.userRole.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              mobileNumber: true,
              employeeCode: true,
              profileImage: true,
              accountStatus: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.userRole.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      users: userRoles.map((ur) => ({
        id: ur.user.id,
        name: ur.user.name,
        email: ur.user.email,
        mobileNumber: ur.user.mobileNumber,
        employeeCode: ur.user.employeeCode,
        profileImage: ur.user.profileImage,
        accountStatus: ur.user.accountStatus,
        createdAt: ur.user.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      select: {
        id: true,
        key: true,
        description: true,
      },
    });

    return permissions;
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      ...this.mapRole(role),
      assignedUserCount: role._count.userRoles,
    };
  }

  async createRole(dto: CreateRoleDto, createdById: string) {
    const name = dto.name.trim();
    await this.assertUniqueRoleName(name);
    const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name,
          description: dto.description?.trim() || null,
          isSystem: false,
          createdById,
          rolePermissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      });
      return created;
    });

    return {
      success: true,
      data: this.mapRole(role),
      message: `Role "${role.name}" created successfully`,
    };
  }

  async updateRole(roleId: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be modified');
    }

    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== role.name.toLowerCase()) {
      await this.assertUniqueRoleName(name, roleId);
    }

    const permissionIds =
      dto.permissionKeys !== undefined
        ? await this.resolvePermissionIds(dto.permissionKeys)
        : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }

      return tx.role.update({
        where: { id: roleId },
        data: {
          ...(name ? { name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
        },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      });
    });

    if (permissionIds) {
      const assigned = await this.prisma.userRole.findMany({
        where: { roleId },
        select: { userId: true },
      });
      for (const row of assigned) {
        this.rbacUtil.clearUserCache(row.userId);
      }
    }

    return {
      success: true,
      data: this.mapRole(updated),
      message: `Role "${updated.name}" updated successfully`,
    };
  }

  async deleteRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }

    if (role._count.userRoles > 0) {
      throw new ConflictException(
        `Cannot delete role "${role.name}" while it is assigned to ${role._count.userRoles} user(s). Reassign those users first.`,
      );
    }

    await this.prisma.role.delete({ where: { id: roleId } });

    return {
      success: true,
      data: { id: role.id, name: role.name },
      message: `Role "${role.name}" deleted successfully`,
    };
  }

  async assignRoleToUser(assignRoleDto: AssignRoleDto) {
    const { userId, roleId } = assignRoleDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if role is already assigned
    const existingUserRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existingUserRole) {
      throw new ConflictException('Role is already assigned to this user');
    }

    // Assign role to user
    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.rbacUtil.clearUserCache(userId);

    return {
      success: true,
      data: {
        userId: userRole.userId,
        roleId: userRole.roleId,
        roleName: userRole.role.name,
        userName: userRole.user.name,
        userEmail: userRole.user.email,
      },
      message: `Role "${userRole.role.name}" assigned to user "${userRole.user.name}" successfully`,
    };
  }

  async removeRoleFromUser(userId: string, roleId: string) {
    // Check if user role exists
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException('User role assignment not found');
    }

    // Remove role from user
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    this.rbacUtil.clearUserCache(userId);

    return {
      success: true,
      data: {
        userId: userRole.userId,
        roleId: userRole.roleId,
        roleName: userRole.role.name,
        userName: userRole.user.name,
        userEmail: userRole.user.email,
      },
      message: `Role "${userRole.role.name}" removed from user "${userRole.user.name}" successfully`,
    };
  }

  async getUserRoles(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
            createdBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return userRoles.map((ur) => this.mapRole(ur.role));
  }

  private mapRole(role: {
    id: string;
    name: string;
    description: string | null;
    isSystem?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: { id: string; name: string } | null;
    rolePermissions: Array<{ permission: { key: string } }>;
  }) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem ?? false,
      createdAt: role.createdAt?.toISOString?.() ?? role.createdAt,
      updatedAt: role.updatedAt?.toISOString?.() ?? role.updatedAt,
      createdBy: role.createdBy
        ? { id: role.createdBy.id, name: role.createdBy.name }
        : null,
      permissions: role.rolePermissions.map((rp) => rp.permission.key),
    };
  }

  private async assertUniqueRoleName(name: string, excludeId?: string) {
    const existing = await this.prisma.role.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Role name "${name}" already exists`);
    }
  }

  private async resolvePermissionIds(permissionKeys: string[]): Promise<string[]> {
    const uniqueKeys = [...new Set(permissionKeys.map((k) => k.trim()).filter(Boolean))];

    if (uniqueKeys.length === 0) {
      throw new BadRequestException('At least one permission is required');
    }

    if (uniqueKeys.includes('*')) {
      throw new BadRequestException(
        'Wildcard permission "*" is not allowed on custom roles',
      );
    }

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: uniqueKeys } },
      select: { id: true, key: true },
    });

    if (permissions.length !== uniqueKeys.length) {
      const found = new Set(permissions.map((p) => p.key));
      const missing = uniqueKeys.filter((key) => !found.has(key));
      throw new BadRequestException(
        `Unknown permission key(s): ${missing.join(', ')}`,
      );
    }

    return permissions.map((p) => p.id);
  }
}
