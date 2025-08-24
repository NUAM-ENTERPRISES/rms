import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => rp.permission.key),
    }));
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
          },
        },
      },
    });

    return userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
      permissions: ur.role.rolePermissions.map((rp) => rp.permission.key),
    }));
  }
}
