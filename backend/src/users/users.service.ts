import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { UserWithRoles, PaginatedUsers } from './types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    createdByUserId?: string,
  ): Promise<UserWithRoles> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await argon2.hash(createUserDto.password);

    const user = await (this.prisma as any).user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        phone: createUserDto.phone,
        dateOfBirth: createUserDto.dateOfBirth
          ? new Date(createUserDto.dateOfBirth)
          : null,
      },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    const { password, ...userWithoutPassword } = user;

    // Audit log the user creation
    if (createdByUserId) {
      await this.auditService.logUserAction(
        'create',
        createdByUserId,
        user.id,
        {
          email: createUserDto.email,
          name: createUserDto.name,
          phone: createUserDto.phone,
          dateOfBirth: createUserDto.dateOfBirth,
        },
        { action: 'user_created' },
      );
    }

    return userWithoutPassword as UserWithRoles;
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedUsers> {
    const {
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const total = await this.prisma.user.count({ where });

    const users = await (this.prisma as any).user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    return {
      users: usersWithoutPasswords as UserWithRoles[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserWithRoles> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserWithRoles;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedByUserId?: string,
  ): Promise<UserWithRoles> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updateData: any = { ...updateUserDto };
    if (updateUserDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    }

    const user = await (this.prisma as any).user.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    const { password, ...userWithoutPassword } = user;

    // Audit log the user update
    if (updatedByUserId) {
      await this.auditService.logUserAction(
        'update',
        updatedByUserId,
        user.id,
        updateData,
        { action: 'user_updated' },
      );
    }

    return userWithoutPassword as UserWithRoles;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let isValid = false;
    if (user.password.startsWith('$argon2')) {
      isValid = await argon2.verify(
        user.password,
        changePasswordDto.currentPassword,
      );
    } else {
      isValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );
    }

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await argon2.hash(changePasswordDto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Audit log the password change
    await this.auditService.logAuthAction('password_change', userId, {
      action: 'password_changed',
      timestamp: new Date(),
    });

    return { message: 'Password changed successfully' };
  }

  async remove(
    id: string,
    deletedByUserId?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    // Audit log the user deletion
    if (deletedByUserId) {
      await this.auditService.logUserAction(
        'delete',
        deletedByUserId,
        user.id,
        {
          email: user.email,
          name: user.name,
        },
        { action: 'user_deleted' },
      );
    }

    return { message: 'User deleted successfully' };
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await (this.prisma as any).userRole.findMany({
      where: { userId },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return userRoles.map((ur) => ur.role.name);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await (this.prisma as any).userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.key);
      }
    }

    return Array.from(permissions);
  }
}
