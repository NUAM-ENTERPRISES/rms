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
import { UploadService } from '../upload/upload.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    createdByUserId?: string,
  ): Promise<UserWithRoles> {
    // Check for existing phone number + country code combination
    const existingPhone = await this.prisma.user.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode: createUserDto.countryCode,
          mobileNumber: createUserDto.mobileNumber,
        },
      },
    });

    if (existingPhone) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Check for existing email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await argon2.hash(createUserDto.password);

    // Create user with role assignments in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await (tx as any).user.create({
        data: {
          email: createUserDto.email,
          name: createUserDto.name,
          password: hashedPassword,
          countryCode: createUserDto.countryCode,
          mobileNumber: createUserDto.mobileNumber,
          dateOfBirth: createUserDto.dateOfBirth
            ? new Date(createUserDto.dateOfBirth)
            : null,
          profileImage: createUserDto.profileImage,
        },
      });

      // Assign roles if provided
      if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
        // Verify all roles exist
        const existingRoles = await tx.role.findMany({
          where: { id: { in: createUserDto.roleIds } },
        });

        if (existingRoles.length !== createUserDto.roleIds.length) {
          throw new ConflictException('One or more roles not found');
        }

        // Create user role assignments
        await tx.userRole.createMany({
          data: createUserDto.roleIds.map((roleId) => ({
            userId: newUser.id,
            roleId,
          })),
        });
      }

      // Return user with roles
      return await (tx as any).user.findUnique({
        where: { id: newUser.id },
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
          mobileNumber: createUserDto.mobileNumber,
          dateOfBirth: createUserDto.dateOfBirth,
          roleIds: createUserDto.roleIds,
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

    const usersWithoutPasswords = users.map(({ password, ...user }) =>
      this.transformUserData(user),
    );

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
    return this.transformUserData(userWithoutPassword) as UserWithRoles;
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

    // Handle role assignment if provided
    const { roleIds, ...userUpdateData } = updateData;

    // Update user with role assignments in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Update user data (excluding roleIds)
      const updatedUser = await (tx as any).user.update({
        where: { id },
        data: userUpdateData,
      });

      // Handle role assignment if roleIds is provided
      if (roleIds !== undefined) {
        // Remove all existing role assignments
        await tx.userRole.deleteMany({
          where: { userId: id },
        });

        // Assign new roles if provided
        if (roleIds && roleIds.length > 0) {
          // Verify all roles exist
          const existingRoles = await tx.role.findMany({
            where: { id: { in: roleIds } },
          });

          if (existingRoles.length !== roleIds.length) {
            throw new ConflictException('One or more roles not found');
          }

          // Create new user role assignments
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({
              userId: id,
              roleId,
            })),
          });
        }
      }

      // Return user with roles
      return await (tx as any).user.findUnique({
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
    });

    const { password, ...userWithoutPassword } = user;

    // Audit log the user update
    if (updatedByUserId) {
      await this.auditService.logUserAction(
        'update',
        updatedByUserId,
        user.id,
        { ...userUpdateData, roleIds },
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

  /**
   * Convert relative profile image path to full URL
   */
  private getProfileImageUrl(relativePath?: string): string | null {
    if (!relativePath) return null;
    return this.uploadService.getFileUrl(relativePath);
  }

  /**
   * Transform user data to include full profile image URL
   */
  private transformUserData(user: any): any {
    if (user.profileImage) {
      user.profileImage = this.getProfileImageUrl(user.profileImage);
    }
    return user;
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
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
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user analytics/stats
    const stats = await this.getUserStats(userId);

    // Extract roles and permissions
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.key),
    );

    // Format profile data
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      countryCode: user.countryCode,
      dateOfBirth: user.dateOfBirth,
      profileImage: user.profileImage
        ? this.getProfileImageUrl(user.profileImage)
        : null,
      location: null, // Field doesn't exist in schema
      timezone: null, // Field doesn't exist in schema
      roles,
      permissions,
      createdAt: user.createdAt,
      lastLogin: null, // Field doesn't exist in schema
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: true,
        },
        theme: 'light',
        language: 'en',
      },
      stats,
    };

    return profile;
  }

  private async getUserStats(userId: string) {
    // Get candidates assigned to this user (if they're a recruiter)
    const candidatesManaged = await this.prisma.candidateProjects.count({
      where: {
        recruiterId: userId,
      },
    });

    // Get projects created by this user
    const projectsCreated = await this.prisma.project.count({
      where: {
        createdBy: userId,
      },
    });

    // Get documents verified by this user (if they're documentation team)
    const documentsVerified = await this.prisma.document.count({
      where: {
        verifiedBy: userId,
        status: 'VERIFIED',
      },
    });

    return {
      candidatesManaged,
      projectsCreated,
      documentsVerified,
    };
  }

  /**
   * Get recruiter statistics for analytics dashboard
   */
  async getRecruiterStats(year: number): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
      untouched: number;
      avgScreeningDays: number;
      avgTimeToFirstTouch: number;
      avgDaysToInterested: number;
      avgDaysToNotInterested: number;
      avgDaysToNotEligible: number;
      avgDaysToOtherEnquiry: number;
      avgDaysToFuture: number;
      avgDaysToOnHold: number;
      avgDaysToRNR: number;
      avgDaysToQualified: number;
      avgDaysToWorking: number;
    }>
  > {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // Get all users with Recruiter role
    const recruiters = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const stats = await Promise.all(
      recruiters.map(async (recruiter) => {
        // Get candidate projects assigned to this recruiter within the year
        const candidateProjects = await this.prisma.candidateProjects.findMany({
          where: {
            recruiterId: recruiter.id,
            assignedAt: {
              gte: yearStart,
              lte: yearEnd,
            },
          },
          include: {
            currentProjectStatus: {
              select: {
                statusName: true,
              },
            },
          },
        });

        // Count by status
        const assigned = candidateProjects.length;
        const screening = candidateProjects.filter(
          (cp) =>
            cp.currentProjectStatus?.statusName === 'screening_scheduled' ||
            cp.currentProjectStatus?.statusName === 'screening_completed' ||
            cp.currentProjectStatus?.statusName === 'screening_passed' ||
            cp.currentProjectStatus?.statusName === 'screening_failed',
        ).length;
        const interview = candidateProjects.filter(
          (cp) =>
            cp.currentProjectStatus?.statusName === 'interview_scheduled' ||
            cp.currentProjectStatus?.statusName === 'interview_completed' ||
            cp.currentProjectStatus?.statusName === 'interview_passed',
        ).length;
        const selected = candidateProjects.filter(
          (cp) => cp.currentProjectStatus?.statusName === 'selected',
        ).length;
        const joined = candidateProjects.filter(
          (cp) => cp.currentProjectStatus?.statusName === 'hired',
        ).length;

        // Get untouched count (candidates with status "untouched")
        const untouchedStatus = await this.prisma.candidateStatus.findFirst({
          where: { statusName: 'untouched' },
        });
        const untouched = untouchedStatus
          ? await this.prisma.candidate.count({
              where: {
                recruiterAssignments: {
                  some: {
                    recruiterId: recruiter.id,
                    isActive: true,
                  },
                },
                currentStatusId: untouchedStatus.id,
              },
            })
          : 0;

        // Calculate average days (simplified - would need status history for accurate calculation)
        const avgScreeningDays = 0;
        const avgTimeToFirstTouch = 0;
        const avgDaysToInterested = 0;
        const avgDaysToNotInterested = 0;
        const avgDaysToNotEligible = 0;
        const avgDaysToOtherEnquiry = 0;
        const avgDaysToFuture = 0;
        const avgDaysToOnHold = 0;
        const avgDaysToRNR = 0;
        const avgDaysToQualified = 0;
        const avgDaysToWorking = 0;

        return {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
          assigned,
          screening,
          interview,
          selected,
          joined,
          untouched,
          avgScreeningDays,
          avgTimeToFirstTouch,
          avgDaysToInterested,
          avgDaysToNotInterested,
          avgDaysToNotEligible,
          avgDaysToOtherEnquiry,
          avgDaysToFuture,
          avgDaysToOnHold,
          avgDaysToRNR,
          avgDaysToQualified,
          avgDaysToWorking,
        };
      }),
    );

    return stats;
  }

  /**
   * Get monthly performance data for a recruiter
   */
  async getRecruiterPerformance(
    recruiterId: string,
    year: number,
  ): Promise<
    Array<{
      month: string;
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
    }>
  > {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthlyData = await Promise.all(
      months.map(async (month, index) => {
        const monthStart = new Date(year, index, 1);
        const monthEnd = new Date(year, index + 1, 0, 23, 59, 59, 999);

        const candidateProjects = await this.prisma.candidateProjects.findMany({
          where: {
            recruiterId,
            assignedAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          include: {
            currentProjectStatus: {
              select: {
                statusName: true,
              },
            },
          },
        });

        const assigned = candidateProjects.length;
        const screening = candidateProjects.filter(
          (cp) =>
            cp.currentProjectStatus?.statusName === 'screening_scheduled' ||
            cp.currentProjectStatus?.statusName === 'screening_completed' ||
            cp.currentProjectStatus?.statusName === 'screening_passed' ||
            cp.currentProjectStatus?.statusName === 'screening_failed',
        ).length;
        const interview = candidateProjects.filter(
          (cp) =>
            cp.currentProjectStatus?.statusName === 'interview_scheduled' ||
            cp.currentProjectStatus?.statusName === 'interview_completed' ||
            cp.currentProjectStatus?.statusName === 'interview_passed',
        ).length;
        const selected = candidateProjects.filter(
          (cp) => cp.currentProjectStatus?.statusName === 'selected',
        ).length;
        const joined = candidateProjects.filter(
          (cp) => cp.currentProjectStatus?.statusName === 'hired',
        ).length;

        return {
          month,
          assigned,
          screening,
          interview,
          selected,
          joined,
        };
      }),
    );

    return monthlyData;
  }
}
