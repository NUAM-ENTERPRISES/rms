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
      // Project-level metrics
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
      untouched: number;
      // Candidate-level metrics
      totalCandidates: number;
      candidatesUntouched: number;
      candidatesInterested: number;
      candidatesNotInterested: number;
      candidatesRNR: number;
      candidatesQualified: number;
      candidatesWorking: number;
      candidatesOnHold: number;
      candidatesOtherEnquiry: number;
      candidatesFuture: number;
      candidatesNotEligible: number;
      // Average time metrics
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

        // ✅ FIXED: Count project assignments still in early stages (project-level)
        const untouched = candidateProjects.filter(
          (cp) =>
            cp.currentProjectStatus?.statusName === 'nominated' ||
            cp.currentProjectStatus?.statusName === 'pending_documents',
        ).length;

        // Get candidate-level metrics (candidates assigned to recruiter)
        const candidateAssignments = await this.prisma.candidateRecruiterAssignment.findMany({
          where: {
            recruiterId: recruiter.id,
            isActive: true,
            assignedAt: {
              gte: yearStart,
              lte: yearEnd,
            },
          },
          include: {
            candidate: {
              select: {
                id: true,
                currentStatusId: true,
                currentStatus: {
                  select: {
                    statusName: true,
                  },
                },
              },
            },
          },
        });

        const totalCandidates = candidateAssignments.length;

        // Get all candidate statuses for counting
        const statusMap = new Map<string, number>();
        candidateAssignments.forEach((assignment) => {
          const statusName = assignment.candidate.currentStatus?.statusName || 'unknown';
          statusMap.set(statusName, (statusMap.get(statusName) || 0) + 1);
        });

        const candidatesUntouched = statusMap.get('untouched') || 0;
        const candidatesInterested = statusMap.get('interested') || 0;
        const candidatesNotInterested = statusMap.get('not_interested') || 0;
        const candidatesRNR = statusMap.get('rnr') || 0;
        const candidatesQualified = statusMap.get('qualified') || 0;
        const candidatesWorking = (statusMap.get('deployed') || statusMap.get('Deployed') || 0);
        const candidatesOnHold = statusMap.get('on_hold') || 0;
        const candidatesOtherEnquiry = statusMap.get('other_enquiry') || 0;
        const candidatesFuture = statusMap.get('future') || 0;
        const candidatesNotEligible = statusMap.get('not_eligible') || 0;

        // Calculate average days from status history
        const statusNames = await this.prisma.candidateStatus.findMany({
          select: { id: true, statusName: true },
        });
        const statusIdMap = new Map(
          statusNames.map((s) => [s.statusName, s.id]),
        );

        // Get all candidates assigned to this recruiter
        const assignedCandidates = await this.prisma.candidateRecruiterAssignment.findMany({
          where: {
            recruiterId: recruiter.id,
            isActive: true,
            assignedAt: {
              gte: yearStart,
              lte: yearEnd,
            },
          },
          include: {
            candidate: {
              include: {
                statusHistories: {
                  orderBy: { statusUpdatedAt: 'asc' },
                },
              },
            },
          },
        });

        // Calculate average times
        const calculateAvgDays = (
          targetStatusName: string,
        ): number => {
          const targetStatusId = statusIdMap.get(targetStatusName);
          if (!targetStatusId) return 0;

          const times: number[] = [];

          for (const assignment of assignedCandidates) {
            const histories = assignment.candidate.statusHistories;
            const untouchedHistory = histories.find(
              (h) => h.statusNameSnapshot === 'untouched',
            );
            const targetHistory = histories.find(
              (h) => h.statusId === targetStatusId,
            );

            if (untouchedHistory && targetHistory) {
              const days =
                (targetHistory.statusUpdatedAt.getTime() -
                  untouchedHistory.statusUpdatedAt.getTime()) /
                (1000 * 60 * 60 * 24);
              if (days > 0) {
                times.push(days);
              }
            }
          }

          return times.length > 0
            ? times.reduce((a, b) => a + b, 0) / times.length
            : 0;
        };

        // Calculate average time to first touch (first status change from untouched)
        const calculateAvgTimeToFirstTouch = (): number => {
          const times: number[] = [];

          for (const assignment of assignedCandidates) {
            const histories = assignment.candidate.statusHistories.sort(
              (a, b) =>
                a.statusUpdatedAt.getTime() - b.statusUpdatedAt.getTime(),
            );
            const untouchedHistory = histories.find(
              (h) => h.statusNameSnapshot === 'untouched',
            );
            const firstChange = histories.find(
              (h) => h.statusNameSnapshot !== 'untouched',
            );

            if (untouchedHistory && firstChange) {
              const days =
                (firstChange.statusUpdatedAt.getTime() -
                  untouchedHistory.statusUpdatedAt.getTime()) /
                (1000 * 60 * 60 * 24);
              if (days > 0) {
                times.push(days);
              }
            } else if (assignment.assignedAt && firstChange) {
              // If no untouched history, use assignment date
              const days =
                (firstChange.statusUpdatedAt.getTime() -
                  assignment.assignedAt.getTime()) /
                (1000 * 60 * 60 * 24);
              if (days > 0) {
                times.push(days);
              }
            }
          }

          return times.length > 0
            ? times.reduce((a, b) => a + b, 0) / times.length
            : 0;
        };

        // Calculate average screening days (time in screening statuses)
        const calculateAvgScreeningDays = (): number => {
          const times: number[] = [];

          for (const assignment of assignedCandidates) {
            const histories = assignment.candidate.statusHistories.sort(
              (a, b) =>
                a.statusUpdatedAt.getTime() - b.statusUpdatedAt.getTime(),
            );

            let screeningStart: Date | null = null;
            let screeningEnd: Date | null = null;
            let totalScreeningDays = 0;

            for (let i = 0; i < histories.length; i++) {
              const status = histories[i].statusNameSnapshot;
              const isScreeningStatus =
                status === 'screening_scheduled' ||
                status === 'screening_completed' ||
                status === 'screening_passed' ||
                status === 'screening_failed';

              if (isScreeningStatus && !screeningStart) {
                screeningStart = histories[i].statusUpdatedAt;
              } else if (
                screeningStart &&
                !isScreeningStatus &&
                histories[i - 1]?.statusNameSnapshot !== status
              ) {
                screeningEnd = histories[i].statusUpdatedAt;
                const days =
                  (screeningEnd.getTime() - screeningStart.getTime()) /
                  (1000 * 60 * 60 * 24);
                totalScreeningDays += days;
                screeningStart = null;
              }
            }

            if (totalScreeningDays > 0) {
              times.push(totalScreeningDays);
            }
          }

          return times.length > 0
            ? times.reduce((a, b) => a + b, 0) / times.length
            : 0;
        };

        // Calculate all averages
        const avgTimeToFirstTouch = calculateAvgTimeToFirstTouch();
        const avgDaysToInterested = calculateAvgDays('interested');
        const avgDaysToNotInterested = calculateAvgDays('not interested');
        const avgDaysToNotEligible = calculateAvgDays('not eligible');
        const avgDaysToOtherEnquiry = calculateAvgDays('other enquiry');
        const avgDaysToFuture = calculateAvgDays('future');
        const avgDaysToOnHold = calculateAvgDays('on hold');
        const avgDaysToRNR = calculateAvgDays('rnr');
        const avgDaysToQualified = calculateAvgDays('qualified');
        const avgDaysToWorking = calculateAvgDays('deployed') || calculateAvgDays('Deployed');
        const avgScreeningDays = calculateAvgScreeningDays();

        return {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
          // Project-level metrics
          assigned,
          screening,
          interview,
          selected,
          joined,
          untouched,
          // Candidate-level metrics
          totalCandidates,
          candidatesUntouched,
          candidatesInterested,
          candidatesNotInterested,
          candidatesRNR,
          candidatesQualified,
          candidatesWorking,
          candidatesOnHold,
          candidatesOtherEnquiry,
          candidatesFuture,
          candidatesNotEligible,
          // Average time metrics
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
   * Returns ALL available historical data (not limited to 3 years)
   * Frontend can filter as needed
   */
  async getRecruiterPerformance(
    recruiterId: string,
    year: number,
  ): Promise<
    Array<{
      month: string;
      year: number;
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
    }>
  > {
    // Find the earliest assignment date for this recruiter to get all historical data
    const earliestAssignment = await this.prisma.candidateProjects.findFirst({
      where: { recruiterId },
      orderBy: { assignedAt: 'asc' },
      select: { assignedAt: true },
    });

    // If no assignments, return empty array
    if (!earliestAssignment || !earliestAssignment.assignedAt) {
      return [];
    }

    // Calculate start year from earliest assignment or use provided year as minimum
    const earliestYear = earliestAssignment.assignedAt.getFullYear();
    const startYear = Math.min(earliestYear, year - 10); // Go back max 10 years or to earliest data
    const endYear = year;

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

    const monthlyData: Array<{
      month: string;
      year: number;
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
    }> = [];

    // Get data for all years from startYear to endYear
    for (let y = startYear; y <= endYear; y++) {
      for (let index = 0; index < months.length; index++) {
        const monthStart = new Date(y, index, 1);
        const monthEnd = new Date(y, index + 1, 0, 23, 59, 59, 999);

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

        monthlyData.push({
          month: months[index],
          year: y,
          assigned,
          screening,
          interview,
          selected,
          joined,
        });
      }
    }

    return monthlyData;
  }
}
