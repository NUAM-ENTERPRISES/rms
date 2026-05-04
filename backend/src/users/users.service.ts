import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SessionAvailability } from '@prisma/client';
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
import {
  assertPhysicalAddressConsistent,
  mergePhysicalAddress,
} from '../common/address/assert-physical-address';
import { LanguageProficiency } from '@prisma/client';
import { UpdateRecruiterCapabilitiesDto } from './dto/update-recruiter-capabilities.dto';
import { ROLE_NAMES } from '../common/constants/role-ids';

const IDLE_THRESHOLD_MS = 15 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly uploadService: UploadService,
  ) {}

  async setSessionAvailability(
    sessionId: string,
    userId: string,
    availability: SessionAvailability,
  ): Promise<{ availability: SessionAvailability }> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new ForbiddenException('Session not found or access denied');
    }

    const previous = session.availability ?? SessionAvailability.ACTIVE;

    if (previous === availability) {
      return { availability };
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        availability,
        availabilityUpdatedAt: new Date(),
      },
    });

    return { availability };
  }

  private isSessionAvailabilityEligibleForIdle(
    availability: SessionAvailability | undefined | null,
  ): boolean {
    const a = availability ?? SessionAvailability.ACTIVE;
    return a === SessionAvailability.ACTIVE;
  }

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

    await assertPhysicalAddressConsistent(this.prisma, {
      addressCountryCode: createUserDto.addressCountryCode ?? null,
      addressStateId: createUserDto.addressStateId ?? null,
    });

    const hashedPassword = await argon2.hash(createUserDto.password);

    // Create user with role assignments in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
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
          addressCountryCode: createUserDto.addressCountryCode,
          addressStateId: createUserDto.addressStateId,
          address: createUserDto.address,
        },
      });

      // Assign roles if provided and not empty
      if (createUserDto.roleIds && Array.isArray(createUserDto.roleIds) && createUserDto.roleIds.length > 0) {
        // Filter out any "no-role" or empty string values that might come from the frontend
        const validRoleIds = createUserDto.roleIds.filter(id => id && id !== 'no-role');
        
        if (validRoleIds.length > 0) {
          // Verify all roles exist
          const existingRoles = await tx.role.findMany({
            where: { id: { in: validRoleIds } },
          });

          if (existingRoles.length !== validRoleIds.length) {
            throw new ConflictException('One or more roles not found');
          }

          // Create user role assignments
          await tx.userRole.createMany({
            data: validRoleIds.map((roleId) => ({
              userId: newUser.id,
              roleId,
            })),
          });
        }
      }

      // Return user with roles
      return await tx.user.findUnique({
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

    if (!user) {
      throw new Error('User creation failed');
    }

    const { password: _, ...userWithoutPassword } = user as any;

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
      roles,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (roles) {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      where.userRoles = {
        some: {
          role: {
            name: {
              in: roleArray,
            },
          },
        },
      };
    }

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
        userLanguages: {
          include: {
            language: { select: { code: true, name: true } },
          },
        },
        userCountryCoverages: {
          include: {
            country: { select: { code: true, name: true } },
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
        addressCountry: {
          select: { code: true, name: true },
        },
        addressState: {
          select: { id: true, name: true, code: true },
        },
        userLanguages: {
          include: {
            language: { select: { code: true, name: true } },
          },
        },
        userCountryCoverages: {
          include: {
            country: { select: { code: true, name: true } },
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

    await assertPhysicalAddressConsistent(
      this.prisma,
      mergePhysicalAddress(existingUser, {
        addressCountryCode: updateUserDto.addressCountryCode,
        addressStateId: updateUserDto.addressStateId,
      }),
    );

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
    isAdminReset = false,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Skip current password verification for admin resets
    if (!isAdminReset) {
      if (!changePasswordDto.currentPassword) {
        throw new UnauthorizedException('Current password is required');
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
      addressCountryCode: user.addressCountryCode,
      addressStateId: user.addressStateId,
      address: user.address,
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

  async getUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await (this.prisma as any).userSession.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: 20,
    });

    return sessions.map((s: any) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      browser: s.browser,
      os: s.os,
      deviceType: s.deviceType,
      loginAt: s.loginAt,
      lastActivityAt: s.lastActivityAt,
      isActive: s.isActive,
      availability: s.availability ?? SessionAvailability.ACTIVE,
      availabilityUpdatedAt: s.availabilityUpdatedAt ?? null,
      isCurrent: currentSessionId ? s.id === currentSessionId : false,
    }));
  }

  async getAdminSessions(query: {
    role?: string;
    search?: string;
    isActive?: boolean;
    status?: 'ACTIVE' | 'IDLE' | 'ENDED';
    page?: number;
    limit?: number;
  }) {
    const { role, search, isActive, status, page = 1, limit = 30 } = query;

    // Build the where clause for sessions
    const sessionWhere: any = {};
    // NOTE: Do NOT filter by `isActive` here.
    // Admin status (ACTIVE/IDLE/ENDED) is derived from `isActive` + idle computation.
    // We compute stable `counts` across all derived statuses, then filter in-memory.

    // Build the where clause for the user relation
    const userWhere: any = {};
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      userWhere.userRoles = {
        some: { role: { name: { equals: role, mode: 'insensitive' } } },
      };
    }

    if (Object.keys(userWhere).length > 0) {
      sessionWhere.user = userWhere;
    }

    const sessions = await (this.prisma as any).userSession.findMany({
      where: sessionWhere,
      orderBy: [
        { userId: 'asc' },
        { lastActivityAt: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRoles: {
              select: {
                role: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const uniqueSessionsByUser = new Map<string, any>();
    for (const session of sessions) {
      if (!uniqueSessionsByUser.has(session.userId)) {
        uniqueSessionsByUser.set(session.userId, session);
      }
    }

    const distinctSessions = Array.from(uniqueSessionsByUser.values());

    const computed = distinctSessions.map((s: any) => {
      const lastActivityAt = s.lastActivityAt ?? s.loginAt;
      const availability = s.availability ?? SessionAvailability.ACTIVE;
      const timeIdle =
        lastActivityAt instanceof Date &&
        Date.now() - lastActivityAt.getTime() > IDLE_THRESHOLD_MS;
      const isIdle =
        s.isActive &&
        timeIdle &&
        this.isSessionAvailabilityEligibleForIdle(availability);
      const isActive = s.isActive && !isIdle;
      const derivedStatus: 'ACTIVE' | 'IDLE' | 'ENDED' = isActive
        ? 'ACTIVE'
        : isIdle
          ? 'IDLE'
          : 'ENDED';

      return {
        id: s.id,
        userId: s.userId,
        userName: s.user?.name ?? null,
        userEmail: s.user?.email ?? null,
        roles: (s.user?.userRoles ?? []).map((ur: any) => ur.role?.name).filter(Boolean),
        ipAddress: s.ipAddress,
        browser: s.browser,
        os: s.os,
        deviceType: s.deviceType,
        loginAt: s.loginAt,
        lastActivityAt,
        availability,
        status: derivedStatus,
        isActive,
        isIdle,
      };
    });

    const counts = computed.reduce(
      (acc: { total: number; active: number; idle: number; ended: number }, row: any) => {
        acc.total += 1;
        if (row.status === 'ACTIVE') acc.active += 1;
        else if (row.status === 'IDLE') acc.idle += 1;
        else acc.ended += 1;
        return acc;
      },
      { total: 0, active: 0, idle: 0, ended: 0 },
    );

    // Apply derived active/inactive filter AFTER idle computation.
    const filtered = (() => {
      if (status) return computed.filter((row: any) => row.status === status);
      if (typeof isActive === 'boolean')
        return computed.filter((row: any) => row.isActive === isActive);
      return computed;
    })();

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const skip = (safePage - 1) * limit;
    const data = filtered.slice(skip, skip + limit);

    return {
      data,
      total,
      page: safePage,
      limit,
      totalPages,
      counts,
    };
  }

  async getAdminIdleSessionsSummary(query: {
    role?: string;
    search?: string;
    limit?: number;
  }): Promise<{
    idleCount: number;
    sessions: Array<{
      id: string;
      userId: string;
      userName: string | null;
      userEmail: string | null;
      roles: string[];
      ipAddress: string | null;
      browser: string | null;
      os: string | null;
      deviceType: string | null;
      loginAt: Date;
      lastActivityAt: Date;
      isActive: boolean;
      isIdle: boolean;
    }>;
  }> {
    const { role, search, limit = 10 } = query;

    // Build the where clause for sessions
    const sessionWhere: any = { isActive: true };

    // Build the where clause for the user relation
    const userWhere: any = {};
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      userWhere.userRoles = {
        some: { role: { name: { equals: role, mode: 'insensitive' } } },
      };
    }
    if (Object.keys(userWhere).length > 0) {
      sessionWhere.user = userWhere;
    }

    const sessions = await (this.prisma as any).userSession.findMany({
      where: sessionWhere,
      orderBy: [{ userId: 'asc' }, { lastActivityAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRoles: {
              select: {
                role: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Deduplicate to latest session per user (already ordered by userId + lastActivityAt)
    const uniqueSessionsByUser = new Map<string, any>();
    for (const session of sessions) {
      if (!uniqueSessionsByUser.has(session.userId)) {
        uniqueSessionsByUser.set(session.userId, session);
      }
    }

    const distinctSessions = Array.from(uniqueSessionsByUser.values());

    // Compute idle on the fly (idle = active but no activity for 15 minutes)
    const idleSessions = distinctSessions
      .map((s: any) => {
        const lastActivityAt = s.lastActivityAt ?? s.loginAt;
        const availability = s.availability ?? SessionAvailability.ACTIVE;
        const timeIdle =
          lastActivityAt instanceof Date &&
          Date.now() - lastActivityAt.getTime() > IDLE_THRESHOLD_MS;
        const isIdle =
          s.isActive &&
          timeIdle &&
          this.isSessionAvailabilityEligibleForIdle(availability);

        return {
          id: s.id,
          userId: s.userId,
          userName: s.user?.name ?? null,
          userEmail: s.user?.email ?? null,
          roles: (s.user?.userRoles ?? [])
            .map((ur: any) => ur.role?.name)
            .filter(Boolean),
          ipAddress: s.ipAddress,
          browser: s.browser,
          os: s.os,
          deviceType: s.deviceType,
          loginAt: s.loginAt,
          lastActivityAt,
          availability,
          isActive: s.isActive && !isIdle,
          isIdle: s.isActive && isIdle,
        };
      })
      .filter((s: any) => s.isIdle);

    const idleCount = idleSessions.length;
    const topIdle = idleSessions
      .sort(
        (a: any, b: any) =>
          new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime(),
      )
      .slice(0, Math.min(Math.max(limit, 1), 50));

    return { idleCount, sessions: topIdle };
  }

  async updateSessionActivity(sessionId: string) {
    await (this.prisma as any).userSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  async getLatestActiveSessionId(userId: string) {
    const session = await (this.prisma as any).userSession.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastActivityAt: 'desc' },
      select: { id: true },
    });

    return session?.id ?? null;
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
    filterBy: 'year' | 'month' | 'today' | 'custom' = 'year',
    month?: number,
    fromDate?: string,
    toDate?: string,
  ): Promise<
    Array<{
      month: string;
      year: number;
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
      deployed: number;
      hired: number;
      registered: number;
      documentVerified: number;
      shortlisted: number;
      interviewPassed: number;
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

    let startDate: Date;
    let endDate: Date;

    if (filterBy === 'today') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (filterBy === 'month') {
      const monthIndex = month && month >= 1 && month <= 12 ? month - 1 : 0;
      startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
      endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    } else if (filterBy === 'custom' && fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(year, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    // Ensure we don't go beyond actual data history
    if (startDate < earliestAssignment.assignedAt) {
      startDate = earliestAssignment.assignedAt;
    }

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

    const allBuckets: Array<{
      month: string;
      year: number;
      date?: string;
      week?: number;
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
      deployed: number;
      hired: number;
      registered: number;
      documentVerified: number;
      shortlisted: number;
      interviewPassed: number;
    }> = [];

    const fromMonthIndex = startDate.getMonth();
    const fromYear = startDate.getFullYear();
    const toMonthIndex = endDate.getMonth();
    const toYear = endDate.getFullYear();

    // Determine interval based on filterBy
    if (filterBy === 'month') {
      // Split into weeks for month view
      let current = new Date(startDate);
      let weekNum = 1;
      while (current <= endDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

        const stats = await this.getBucketStats(recruiterId, weekStart, weekEnd);
        allBuckets.push({
          month: months[weekStart.getMonth()],
          year: weekStart.getFullYear(),
          week: weekNum++,
          ...stats,
        });

        current.setDate(current.getDate() + 7);
      }
    } else if (filterBy === 'custom' || filterBy === 'today') {
      // Split into days (if range is small) or weeks (if range is large)
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 14) {
        // Daily breakdown
        let current = new Date(startDate);
        while (current <= endDate) {
          const dayStart = new Date(current);
          const dayEnd = new Date(current);
          dayEnd.setHours(23, 59, 59, 999);

          const stats = await this.getBucketStats(recruiterId, dayStart, dayEnd);
          allBuckets.push({
            month: months[dayStart.getMonth()],
            year: dayStart.getFullYear(),
            date: dayStart.toISOString().split('T')[0],
            ...stats,
          });
          current.setDate(current.getDate() + 1);
        }
      } else {
        // Weekly breakdown for longer custom ranges
        let current = new Date(startDate);
        let weekNum = 1;
        while (current <= endDate) {
          const weekStart = new Date(current);
          const weekEnd = new Date(current);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

          const stats = await this.getBucketStats(recruiterId, weekStart, weekEnd);
          allBuckets.push({
            month: months[weekStart.getMonth()],
            year: weekStart.getFullYear(),
            week: weekNum++,
            ...stats,
          });
          current.setDate(current.getDate() + 7);
        }
      }
    } else {
      // Default: Monthly breakdown for year view
      for (let y = fromYear; y <= toYear; y++) {
        const startI = y === fromYear ? fromMonthIndex : 0;
        const endI = y === toYear ? toMonthIndex : 11;

        for (let monthIndex = startI; monthIndex <= endI; monthIndex++) {
          const monthStart = new Date(y, monthIndex, 1, 0, 0, 0, 0);
          const monthEnd = new Date(y, monthIndex + 1, 0, 23, 59, 59, 999);

          const stats = await this.getBucketStats(recruiterId, monthStart, monthEnd);
          allBuckets.push({
            month: months[monthIndex],
            year: y,
            ...stats,
          });
        }
      }
    }

    return allBuckets;
  }

  private async getBucketStats(recruiterId: string, startDate: Date, endDate: Date) {
    const candidateProjects = await this.prisma.candidateProjects.findMany({
      where: {
        recruiterId,
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        currentProjectStatus: {
          select: {
            statusName: true,
          },
        },
        mainStatus: true,
        subStatus: true,
        projectStatusHistory: {
          include: {
            mainStatus: true,
            subStatus: true,
          },
        },
      },
    });

    let assigned = 0;
    let screening = 0;
    let interview = 0;
    let selected = 0;
    let joined = 0;
    let deployed = 0;
    let hired = 0;
    let registered = 0;
    let documentVerified = 0;
    let shortlisted = 0;
    let interviewPassed = 0;

    for (const cp of candidateProjects) {
      assigned += 1;

      // map all status markers from current and history
      const subStatusSet = new Set<string>();
      const mainStatusSet = new Set<string>();

      if (cp.subStatus?.name) {
        subStatusSet.add(cp.subStatus.name);
      }
      if (cp.mainStatus?.name) {
        mainStatusSet.add(cp.mainStatus.name);
      }
      if (cp.currentProjectStatus?.statusName) {
        subStatusSet.add(cp.currentProjectStatus.statusName);
      }
      if (cp.projectStatusHistory?.length) {
        for (const history of cp.projectStatusHistory) {
          if (history.subStatus?.name) {
            subStatusSet.add(history.subStatus.name);
          }
          if (history.mainStatus?.name) {
            mainStatusSet.add(history.mainStatus.name);
          }
        }
      }

      const hasScreening =
        subStatusSet.has('screening_assigned') ||
        subStatusSet.has('screening_scheduled') ||
        subStatusSet.has('screening_completed') ||
        subStatusSet.has('screening_passed') ||
        subStatusSet.has('screening_failed');

      const hasInterview =
        subStatusSet.has('interview_assigned') ||
        subStatusSet.has('interview_scheduled') ||
        subStatusSet.has('interview_rescheduled') ||
        subStatusSet.has('interview_completed') ||
        subStatusSet.has('interview_passed') ||
        subStatusSet.has('interview_failed') ||
        subStatusSet.has('interview_backout');

      const hasSelected =
        subStatusSet.has('interview_selected') || subStatusSet.has('selected');

      const hasRegistered =
        mainStatusSet.has('nominated') || subStatusSet.has('nominated_initial');

      const hasDocumentVerified = subStatusSet.has('documents_verified');
      const hasShortlisted = subStatusSet.has('shortlisted');
      const hasInterviewPassed = subStatusSet.has('interview_passed');
      const hasHired =
        subStatusSet.has('hired') ||
        mainStatusSet.has('final') ||
        subStatusSet.has('ready_for_final');

      if (hasScreening) screening += 1;
      if (hasInterview) interview += 1;
      if (hasSelected) selected += 1;
      if (hasHired) {
        joined += 1;
        deployed += 1;
        hired += 1;
      }
      if (hasRegistered) registered += 1;
      if (hasDocumentVerified) documentVerified += 1;
      if (hasShortlisted) shortlisted += 1;
      if (hasInterviewPassed) interviewPassed += 1;
    }

    return {
      assigned,
      screening,
      interview,
      selected,
      joined,
      deployed,
      hired,
      registered,
      documentVerified,
      shortlisted,
      interviewPassed,
    };
  }

  async listActiveLanguages(): Promise<{ code: string; name: string }[]> {
    return this.prisma.language.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateRecruiterCapabilities(
    userId: string,
    dto: UpdateRecruiterCapabilitiesDto,
    updatedByUserId?: string,
  ): Promise<UserWithRoles> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: { select: { name: true } } } },
      },
    });
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const capabilityRoles = new Set<string>([
      ROLE_NAMES.RECRUITER,
      ROLE_NAMES.MANAGER,
    ]);
    const hasCapabilityRole = existingUser.userRoles.some((ur) =>
      capabilityRoles.has(ur.role.name),
    );
    const isEmptyPayload =
      dto.languages.length === 0 && dto.countryCoverages.length === 0;

    if (isEmptyPayload) {
      await this.prisma.$transaction(async (tx) => {
        await tx.userLanguage.deleteMany({ where: { userId } });
        await tx.userCountryCoverage.deleteMany({ where: { userId } });
      });
      if (updatedByUserId) {
        await this.auditService.logUserAction(
          'update',
          updatedByUserId,
          userId,
          { recruiterCapabilities: 'cleared' },
          { action: 'recruiter_capabilities_updated' },
        );
      }
      return this.findOne(userId);
    }

    if (!hasCapabilityRole) {
      throw new BadRequestException(
        'Languages and country coverage can only be set for users with the Recruiter or Manager role',
      );
    }

    const langCodes = dto.languages.map((l) => l.languageCode);
    const uniqueLang = new Set(langCodes);
    if (uniqueLang.size !== langCodes.length) {
      throw new BadRequestException('Duplicate languageCode entries');
    }
    const primaryCount = dto.languages.filter(
      (l) => l.proficiency === LanguageProficiency.PRIMARY,
    ).length;
    if (primaryCount > 1) {
      throw new BadRequestException('At most one PRIMARY language allowed');
    }

    if (langCodes.length > 0) {
      const foundLangs = await this.prisma.language.findMany({
        where: { code: { in: langCodes }, isActive: true },
        select: { code: true },
      });
      if (foundLangs.length !== langCodes.length) {
        throw new BadRequestException(
          'One or more language codes are invalid or inactive',
        );
      }
    }

    const countryCodes = dto.countryCoverages.map((c) => c.countryCode);
    const uniqueCc = new Set(countryCodes);
    if (uniqueCc.size !== countryCodes.length) {
      throw new BadRequestException('Duplicate countryCode entries');
    }

    for (const row of dto.countryCoverages) {
      const set = new Set(row.sectorScopes);
      if (set.size !== row.sectorScopes.length) {
        throw new BadRequestException(
          'sectorScopes must not contain duplicate values',
        );
      }
    }

    if (countryCodes.length > 0) {
      const foundCountries = await this.prisma.country.findMany({
        where: { code: { in: countryCodes }, isActive: true },
        select: { code: true },
      });
      if (foundCountries.length !== countryCodes.length) {
        throw new BadRequestException(
          'One or more country codes are invalid or inactive',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userLanguage.deleteMany({ where: { userId } });
      await tx.userCountryCoverage.deleteMany({ where: { userId } });
      if (dto.languages.length > 0) {
        await tx.userLanguage.createMany({
          data: dto.languages.map((l) => ({
            userId,
            languageCode: l.languageCode,
            proficiency: l.proficiency,
          })),
        });
      }
      if (dto.countryCoverages.length > 0) {
        await tx.userCountryCoverage.createMany({
          data: dto.countryCoverages.map((c) => ({
            userId,
            countryCode: c.countryCode,
            sectorScopes: c.sectorScopes,
          })),
        });
      }
    });

    if (updatedByUserId) {
      await this.auditService.logUserAction(
        'update',
        updatedByUserId,
        userId,
        { recruiterCapabilities: 'replaced' },
        { action: 'recruiter_capabilities_updated' },
      );
    }

    return this.findOne(userId);
  }
}
