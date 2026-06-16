import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UploadService } from '../../upload/upload.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  ACCOUNT_STATUS_SOCKET_EVENT,
  ACCOUNT_STATUS_NOTIFICATION_TYPE,
} from '../account-status-notifications';
import { SystemConfigService } from '../../system-config/system-config.service';
import { RbacUtil } from '../../auth/rbac/rbac.util';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionAvailability, UserAccountStatus } from '@prisma/client';
import * as argon2 from 'argon2';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let auditService: AuditService;
  let uploadService: UploadService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
    candidateProjects: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    userSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    userAccountStatusHistory: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    professionType: {
      findMany: jest.fn(),
    },
    userProfessionScope: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(mockPrismaService)),
  };

  const mockAuditService = {
    logUserAction: jest.fn(),
    logAuthAction: jest.fn(),
    logRoleAction: jest.fn(),
  };

  const mockNotificationsGateway = {
    broadcastToAdmins: jest.fn().mockResolvedValue(undefined),
    emitToUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  const mockSystemConfigService = {
    getSessionConfig: jest.fn().mockResolvedValue({ idleThresholdMinutes: 15 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: SystemConfigService,
          useValue: mockSystemConfigService,
        },
        {
          provide: RbacUtil,
          useValue: {
            clearUserCache: jest.fn(),
            getUserRolesAndPermissions: jest.fn().mockResolvedValue({
              roles: ['Operations'],
              permissions: [
                'read:cre',
                'read:original_document_intake',
                'read:courier_management',
              ],
              teamIds: [],
              userVersion: Date.now(),
            }),
          },
        },
        {
          provide: UploadService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ url: 'http://example.com/file.png' }),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    uploadService = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'SecurePass123!',
      dateOfBirth: '1990-01-01',
      countryCode: '+1',
      mobileNumber: '1234567890',
      professionTypeIds: ['pt_nurse_seed001'],
    };

    it('should create a user successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: createUserDto.email,
        name: createUserDto.name,
        dateOfBirth: new Date(createUserDto.dateOfBirth!),
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [],
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // phone check
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(mockUser); // fetch new user after create
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.professionType.findMany.mockResolvedValue([
        { id: 'pt_nurse_seed001' },
      ]);
      mockPrismaService.userProfessionScope.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.create(createUserDto, 'admin123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.userProfessionScope.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'user123', professionTypeId: 'pt_nurse_seed001' }],
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
        'create',
        'admin123',
        'user123',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createUserDto, 'admin123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if employeeCode already exists', async () => {
      const dtoWithEmployeeCode: CreateUserDto = {
        ...createUserDto,
        employeeCode: 'AFFEMP012026',
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.create(dtoWithEmployeeCode, 'admin123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject invalid professionTypeIds', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.professionType.findMany.mockResolvedValue([]);

      await expect(service.create(createUserDto, 'admin123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate professionTypeIds', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.create(
          {
            ...createUserDto,
            professionTypeIds: ['pt_nurse_seed001', 'pt_nurse_seed001'],
          },
          'admin123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update profession coverage', () => {
    it('should replace profession scopes when professionTypeIds provided', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        employeeCode: null,
      };
      const updatedUser = {
        ...existingUser,
        userRoles: [],
        userProfessionScopes: [
          {
            id: 'scope-1',
            professionTypeId: 'pt_doctor_seed01',
            professionType: {
              id: 'pt_doctor_seed01',
              name: 'doctor',
              label: 'Doctor',
            },
          },
        ],
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockPrismaService.professionType.findMany.mockResolvedValue([
        { id: 'pt_doctor_seed01' },
      ]);
      mockPrismaService.userProfessionScope.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.userProfessionScope.createMany.mockResolvedValue({
        count: 1,
      });

      const dto: UpdateUserDto = {
        professionTypeIds: ['pt_doctor_seed01'],
      };

      await service.update('user123', dto, 'admin123');

      expect(mockPrismaService.userProfessionScope.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
      });
      expect(mockPrismaService.userProfessionScope.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'user123', professionTypeId: 'pt_doctor_seed01' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should throw ConflictException if employeeCode already exists', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        employeeCode: null,
      };

      const dto: UpdateUserDto = {
        employeeCode: 'AFFEMP012026',
      } as any;

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser) // existing user by id
        .mockResolvedValueOnce({ id: 'other-user' }); // employee code uniqueness check

      await expect(service.update('user123', dto, 'admin123')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getRecruiterPerformance', () => {
    it('should compute metrics for a given month and include new status fields', async () => {
      mockPrismaService.candidateProjects.findFirst.mockResolvedValue({
        assignedAt: new Date('2025-01-01T00:00:00.000Z'),
      });

      mockPrismaService.candidateProjects.findMany.mockResolvedValue([
        {
          id: 'cp1',
          assignedAt: new Date('2026-05-14T11:00:00.000Z'),
          currentProjectStatus: { statusName: 'hired' },
          mainStatus: { name: 'final' },
          subStatus: { name: 'hired' },
          projectStatusHistory: [
            { mainStatus: { name: 'documents' }, subStatus: { name: 'documents_verified' } },
            { mainStatus: { name: 'interview' }, subStatus: { name: 'interview_passed' } },
            { mainStatus: { name: 'interview' }, subStatus: { name: 'shortlisted' } },
          ],
        },
      ]);

      const result = await service.getRecruiterPerformance(
        'recruiter-1',
        2026,
        'month',
        5,
      );

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            month: 'May',
            year: 2026,
            assigned: 1,
            screening: 0,
            interview: 1,
            selected: 0,
            joined: 1,
            deployed: 1,
            hired: 1,
            registered: 0,
            documentVerified: 1,
            shortlisted: 1,
            interviewPassed: 1,
          }),
        ]),
      );
    });
  });

  describe('getAdminIdleSessionsSummary', () => {
    it('should return idleCount and limited idle sessions', async () => {
      const now = Date.now();
      const idleAt = new Date(now - 20 * 60 * 1000);

      mockPrismaService.userSession.findMany.mockResolvedValue([
        {
          id: 's1',
          userId: 'u1',
          ipAddress: '127.0.0.1',
          browser: 'Chrome',
          os: 'macOS',
          deviceType: 'desktop',
          loginAt: new Date(now - 60 * 60 * 1000),
          lastActivityAt: idleAt,
          isActive: true,
          availability: SessionAvailability.ACTIVE,
          user: {
            id: 'u1',
            name: 'Idle One',
            email: 'idle1@example.com',
            userRoles: [{ role: { name: 'Recruiter' } }],
          },
        },
        {
          id: 's2',
          userId: 'u2',
          ipAddress: '127.0.0.1',
          browser: 'Safari',
          os: 'macOS',
          deviceType: 'desktop',
          loginAt: new Date(now - 30 * 60 * 1000),
          lastActivityAt: new Date(now - 2 * 60 * 1000),
          isActive: true,
          availability: SessionAvailability.ACTIVE,
          user: {
            id: 'u2',
            name: 'Active Two',
            email: 'active2@example.com',
            userRoles: [{ role: { name: 'Recruiter' } }],
          },
        },
      ]);

      const result = await service.getAdminIdleSessionsSummary({ limit: 10 });

      expect(result.idleCount).toBe(1);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0]).toEqual(
        expect.objectContaining({
          userId: 'u1',
          userName: 'Idle One',
          isIdle: true,
        }),
      );
    });

    it('should exclude sessions on break or on-call from idle count', async () => {
      const now = Date.now();
      const idleAt = new Date(now - 20 * 60 * 1000);

      mockPrismaService.userSession.findMany.mockResolvedValue([
        {
          id: 's1',
          userId: 'u1',
          ipAddress: '127.0.0.1',
          browser: 'Chrome',
          os: 'macOS',
          deviceType: 'desktop',
          loginAt: new Date(now - 60 * 60 * 1000),
          lastActivityAt: idleAt,
          isActive: true,
          availability: SessionAvailability.BREAK,
          user: {
            id: 'u1',
            name: 'On Break',
            email: 'break@example.com',
            userRoles: [{ role: { name: 'Recruiter' } }],
          },
        },
      ]);

      const result = await service.getAdminIdleSessionsSummary({ limit: 10 });

      expect(result.idleCount).toBe(0);
      expect(result.sessions).toHaveLength(0);
    });
  });

  describe('setSessionAvailability', () => {
    it('should update availability without sending notifications', async () => {
      mockPrismaService.userSession.findUnique.mockResolvedValue({
        id: 'sess1',
        userId: 'u1',
        availability: SessionAvailability.ACTIVE,
      });
      mockPrismaService.userSession.update.mockResolvedValue({});

      const result = await service.setSessionAvailability(
        'sess1',
        'u1',
        SessionAvailability.BREAK,
      );

      expect(result.availability).toBe(SessionAvailability.BREAK);
      expect(mockPrismaService.userSession.update).toHaveBeenCalled();
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('should reject wrong user', async () => {
      mockPrismaService.userSession.findUnique.mockResolvedValue({
        id: 'sess1',
        userId: 'other',
        availability: SessionAvailability.ACTIVE,
      });

      await expect(
        service.setSessionAvailability('sess1', 'u1', SessionAvailability.BREAK),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    };

    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user123',
        password: await argon2.hash('OldPass123!'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.changePassword('user123', changePasswordDto);

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
        'password_change',
        'user123',
        expect.any(Object),
      );
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const mockUser = {
        id: 'user123',
        password: await argon2.hash('WrongPass123!'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user123', changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAccountStatus', () => {
    it('should reject changing own account status', async () => {
      await expect(
        service.updateAccountStatus(
          'user123',
          { status: UserAccountStatus.BLOCKED, remarks: 'Policy issue' },
          'user123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when status is unchanged', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'target',
        accountStatus: UserAccountStatus.ACTIVE,
      });

      await expect(
        service.updateAccountStatus(
          'target',
          { status: UserAccountStatus.ACTIVE, remarks: 'No change' },
          'admin1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create history, update user, and revoke sessions when blocking', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'target',
        accountStatus: UserAccountStatus.ACTIVE,
      });
      mockPrismaService.userAccountStatusHistory.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 1 });

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'target',
        accountStatus: UserAccountStatus.BLOCKED,
      } as any);

      await service.updateAccountStatus(
        'target',
        { status: UserAccountStatus.BLOCKED, remarks: 'Policy violation' },
        'admin1',
      );

      expect(mockPrismaService.userAccountStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'target',
            previousStatus: UserAccountStatus.ACTIVE,
            newStatus: UserAccountStatus.BLOCKED,
            remarks: 'Policy violation',
            changedById: 'admin1',
          }),
        }),
      );
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.userSession.updateMany).toHaveBeenCalled();
      expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledWith(
        'target',
        'account:blocked',
        expect.objectContaining({ message: expect.any(String) }),
      );
      expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
        'status_change',
        'admin1',
        'target',
        expect.any(Object),
        expect.any(Object),
      );

      findOneSpy.mockRestore();
    });

    it('should emit socket and create notification when setting inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'target',
        accountStatus: UserAccountStatus.ACTIVE,
      });
      mockPrismaService.userAccountStatusHistory.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'target',
        accountStatus: UserAccountStatus.INACTIVE,
      } as any);

      await service.updateAccountStatus(
        'target',
        { status: UserAccountStatus.INACTIVE, remarks: 'On leave' },
        'admin1',
      );

      expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledWith(
        'target',
        ACCOUNT_STATUS_SOCKET_EVENT,
        expect.objectContaining({
          accountStatus: UserAccountStatus.INACTIVE,
          previousStatus: UserAccountStatus.ACTIVE,
        }),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'target',
          type: ACCOUNT_STATUS_NOTIFICATION_TYPE,
          title: 'Account inactive',
        }),
      );
      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();

      findOneSpy.mockRestore();
    });
  });

  describe('getAccountStatusHistory', () => {
    it('should return paginated history for a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'target' });
      mockPrismaService.userAccountStatusHistory.count.mockResolvedValue(1);
      mockPrismaService.userAccountStatusHistory.findMany.mockResolvedValue([
        {
          id: 'h1',
          previousStatus: UserAccountStatus.ACTIVE,
          newStatus: UserAccountStatus.BLOCKED,
          remarks: 'Test',
          createdAt: new Date(),
          changedBy: {
            id: 'admin1',
            name: 'Admin',
            email: 'a@test.com',
            employeeCode: null,
          },
        },
      ]);

      const result = await service.getAccountStatusHistory('target', {
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].newStatus).toBe(UserAccountStatus.BLOCKED);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      const mockUserRoles = [
        {
          role: { name: 'Manager' },
        },
        {
          role: { name: 'Recruiter' },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRoles('user123');

      expect(result).toEqual(['Manager', 'Recruiter']);
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        include: expect.any(Object),
      });
    });
  });

  describe('updateDocumentsControlCapabilities', () => {
    it('should persist flags and emit realtime socket events to the user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'target' });
      mockPrismaService.user.update.mockResolvedValue({});

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'target',
        originalDocumentIntakeEnabled: true,
        courierManagementEnabled: false,
      } as any);

      await service.updateDocumentsControlCapabilities(
        'target',
        {
          originalDocumentIntakeEnabled: true,
          courierManagementEnabled: false,
        },
        'admin1',
      );

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'target' },
        data: {
          originalDocumentIntakeEnabled: true,
          courierManagementEnabled: false,
        },
      });
      expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledWith(
        'target',
        'user:documents-control-capabilities-changed',
        expect.objectContaining({
          userId: 'target',
          originalDocumentIntakeEnabled: true,
          courierManagementEnabled: false,
          roles: ['Operations'],
          permissions: expect.arrayContaining([
            'read:original_document_intake',
            'read:courier_management',
          ]),
        }),
      );
      expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledWith(
        'target',
        'data:sync',
        expect.objectContaining({
          type: 'DocumentsControlCapabilitiesUpdated',
          originalDocumentIntakeEnabled: true,
          courierManagementEnabled: false,
        }),
      );

      findOneSpy.mockRestore();
    });
  });
});
