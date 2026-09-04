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
import { RecruiterAnalyticsService } from '../../analytics/recruiter/recruiter-analytics.service';
import { RecruiterAssignmentService } from '../../candidates/services/recruiter-assignment.service';
import { getQueueToken } from '@nestjs/bullmq';
import { BACKFILL_UNASSIGNED_RECRUITER_QUEUE } from '../../candidates/constants/recruiter-assignment-backfill';
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
import {
  RecruiterCountrySectorScope,
  RecruiterProfessionScope,
  SessionAvailability,
  UserAccountStatus,
} from '@prisma/client';
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
      groupBy: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
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
    role: {
      findMany: jest.fn(),
    },
    userProfessionScope: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userLanguage: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    userCountryCoverage: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    language: {
      findMany: jest.fn(),
    },
    country: {
      findMany: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    userPermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
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
    broadcastEvent: jest.fn().mockResolvedValue(undefined),
    emitToUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  const mockSystemConfigService = {
    getSessionConfig: jest.fn().mockResolvedValue({ idleThresholdMinutes: 15 }),
  };

  const mockRbacUtil = {
    clearUserCache: jest.fn(),
    getUserRolesAndPermissions: jest.fn().mockResolvedValue({
      roles: ['Operations Executive'],
      permissions: [
        'read:cre',
        'read:original_document_intake',
        'read:courier_management',
      ],
      teamIds: [],
      userVersion: Date.now(),
    }),
  };

  const mockRecruiterAssignmentBackfillQueue = {
    add: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn().mockResolvedValue(null),
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
          useValue: mockRbacUtil,
        },
        {
          provide: UploadService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ url: 'http://example.com/file.png' }),
          },
        },
        {
          provide: RecruiterAnalyticsService,
          useValue: {
            getPerformanceRatingsBatch: jest.fn().mockResolvedValue({
              success: true,
              data: { year: 2026, month: 7, ratings: [] },
            }),
          },
        },
        {
          provide: getQueueToken(BACKFILL_UNASSIGNED_RECRUITER_QUEUE),
          useValue: mockRecruiterAssignmentBackfillQueue,
        },
        {
          provide: RecruiterAssignmentService,
          useValue: {
            backfillUnassignedRecruiterAssignments: jest
              .fn()
              .mockResolvedValue({ assigned: 0, skipped: 0, failed: 0 }),
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
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.user.create.mockReset();
    mockPrismaService.user.update.mockReset();
    mockPrismaService.professionType.findMany.mockReset();
    mockPrismaService.userProfessionScope.createMany.mockReset();
    mockPrismaService.userProfessionScope.deleteMany.mockReset();
    mockPrismaService.role.findMany.mockReset();
    mockPrismaService.userRole.createMany.mockReset();
    mockPrismaService.userRole.deleteMany.mockReset();
    mockRbacUtil.getUserRolesAndPermissions.mockReset();
    mockRbacUtil.getUserRolesAndPermissions.mockResolvedValue({
      roles: ['Operations Executive'],
      permissions: [
        'read:cre',
        'read:original_document_intake',
        'read:courier_management',
      ],
      teamIds: [],
      userVersion: Date.now(),
    });
    mockRecruiterAssignmentBackfillQueue.add.mockReset();
    mockRecruiterAssignmentBackfillQueue.add.mockResolvedValue(undefined);
    mockRecruiterAssignmentBackfillQueue.getJob.mockReset();
    mockRecruiterAssignmentBackfillQueue.getJob.mockResolvedValue(null);
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
      expect(mockRecruiterAssignmentBackfillQueue.add).not.toHaveBeenCalled();
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
        employeeCode: 'EMP-42',
      };

      mockRbacUtil.getUserRolesAndPermissions.mockResolvedValueOnce({
        roles: ['Manager'],
        permissions: [],
        teamIds: [],
        userVersion: 1,
      });
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.create(dtoWithEmployeeCode, 'admin123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should forbid setting employeeCode without an allowed role', async () => {
      const dtoWithEmployeeCode: CreateUserDto = {
        ...createUserDto,
        employeeCode: 'EMP-42',
      };

      await expect(
        service.create(dtoWithEmployeeCode, 'admin123'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
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

    it('should allow Recruiter with Any profession and no IDs', async () => {
      const mockUser = {
        id: 'user123',
        email: createUserDto.email,
        name: createUserDto.name,
        dateOfBirth: new Date(createUserDto.dateOfBirth!),
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{ role: { name: 'Recruiter' } }],
      };
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.role.findMany.mockResolvedValue([
        { id: 'role-rec', name: 'Recruitment Executive' },
      ]);

      await service.create(
        {
          ...createUserDto,
          professionTypeIds: [],
          roleIds: ['role-rec'],
          recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
          handlesAllProfessions: true,
        },
        'admin123',
      );

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            handlesAllProfessions: true,
            recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
          }),
        }),
      );
      expect(mockPrismaService.userProfessionScope.createMany).not.toHaveBeenCalled();
      expect(mockRecruiterAssignmentBackfillQueue.add).toHaveBeenCalled();
    });

    it('should require profession IDs for Recruiter without Any', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.role.findMany.mockResolvedValue([
        { id: 'role-rec', name: 'Recruitment Executive' },
      ]);

      await expect(
        service.create(
          {
            ...createUserDto,
            professionTypeIds: [],
            roleIds: ['role-rec'],
            recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
            handlesAllProfessions: false,
          },
          'admin123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not require profession coverage for Recruitment Lead', async () => {
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
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.role.findMany.mockResolvedValue([
        { id: 'role-lead', name: 'Recruitment Lead' },
      ]);

      await service.create(
        {
          ...createUserDto,
          professionTypeIds: [],
          roleIds: ['role-lead'],
        },
        'admin123',
      );

      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should reject Recruiter profession IDs outside the selected sector', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.professionType.findMany.mockResolvedValue([
        { id: 'pt_driver', sector: 'NON_HEALTH_CARE' },
      ]);

      await expect(
        service.create(
          {
            ...createUserDto,
            professionTypeIds: ['pt_driver'],
            roleIds: ['role-rec'],
            recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
          },
          'admin123',
        ),
      ).rejects.toThrow(BadRequestException);
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

    it('should clear profession scopes when Recruiter is set to Any', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        employeeCode: null,
        handlesAllProfessions: false,
        recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        userRoles: [{ role: { name: 'Recruitment Executive' } }],
      };
      const updatedUser = {
        ...existingUser,
        handlesAllProfessions: true,
        userRoles: [],
        userProfessionScopes: [],
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockPrismaService.userProfessionScope.deleteMany.mockResolvedValue({
        count: 1,
      });

      await service.update(
        'user123',
        {
          handlesAllProfessions: true,
          recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
          professionTypeIds: [],
        },
        'admin123',
      );

      expect(mockPrismaService.userProfessionScope.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
      });
      expect(mockPrismaService.userProfessionScope.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        userRoles: [],
        userPermissions: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user123');

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        userRoles: [],
        documentsControlAccess: {
          originalDocumentIntakeEnabled: false,
          courierManagementEnabled: false,
        },
      });
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
        employeeCode: 'EMP-42',
      } as any;

      mockRbacUtil.getUserRolesAndPermissions.mockResolvedValueOnce({
        roles: ['Manager'],
        permissions: [],
        teamIds: [],
        userVersion: 1,
      });
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser) // existing user by id
        .mockResolvedValueOnce({ id: 'other-user' }); // employee code uniqueness check

      await expect(service.update('user123', dto, 'admin123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should persist a free-form employeeCode when actor is Manager', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        employeeCode: null,
        handlesAllProfessions: false,
        recruiterSectorScope: null,
        userRoles: [],
      };
      const updatedUser = {
        ...existingUser,
        employeeCode: 'EMP-42',
        userRoles: [],
        userProfessionScopes: [],
      };

      mockRbacUtil.getUserRolesAndPermissions.mockResolvedValueOnce({
        roles: ['Manager'],
        permissions: [],
        teamIds: [],
        userVersion: 1,
      });
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      await service.update(
        'user123',
        { employeeCode: 'EMP-42' } as UpdateUserDto,
        'admin123',
      );

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: expect.objectContaining({ employeeCode: 'EMP-42' }),
      });
    });

    it('enqueues unassigned recruiter backfill when Recruiter role is added', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        employeeCode: null,
        handlesAllProfessions: false,
        recruiterSectorScope: null,
        userRoles: [],
      };
      const updatedUser = {
        ...existingUser,
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        userRoles: [{ role: { name: 'Recruiter' } }],
        userProfessionScopes: [],
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);
      mockPrismaService.role.findMany.mockResolvedValue([
        { id: 'role-rec', name: 'Recruiter' },
      ]);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      await service.update(
        'user123',
        {
          roleIds: ['role-rec'],
          handlesAllProfessions: true,
          recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        } as UpdateUserDto,
        'admin123',
      );

      expect(mockRecruiterAssignmentBackfillQueue.add).toHaveBeenCalled();
    });

    it('should forbid changing employeeCode without an allowed role', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        employeeCode: null,
        handlesAllProfessions: false,
        recruiterSectorScope: null,
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(existingUser);

      await expect(
        service.update(
          'user123',
          { employeeCode: 'EMP-42' } as UpdateUserDto,
          'admin123',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should persist empty address fields and dateOfBirth as null', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        employeeCode: null,
        handlesAllProfessions: false,
        recruiterSectorScope: null,
        userRoles: [],
        addressCountryCode: null,
        addressStateId: null,
      };
      const updatedUser = {
        ...existingUser,
        userRoles: [],
        userProfessionScopes: [],
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const dto: UpdateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        mobileNumber: '1234567890',
        countryCode: '+91',
        dateOfBirth: '',
        addressCountryCode: '',
        addressStateId: '',
        address: '  ',
      };

      await service.update('user123', dto, 'admin123');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: expect.objectContaining({
          addressCountryCode: null,
          addressStateId: null,
          address: null,
          dateOfBirth: null,
        }),
      });
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
            userRoles: [{ role: { name: 'Recruitment Executive' } }],
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
            userRoles: [{ role: { name: 'Recruitment Executive' } }],
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
            userRoles: [{ role: { name: 'Recruitment Executive' } }],
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

  describe('getAccountStatusCounts', () => {
    it('returns only active counts when not listing all account statuses', async () => {
      mockPrismaService.user.count.mockResolvedValue(20);

      const result = await service.getAccountStatusCounts(undefined, {
        listAllAccountStatuses: false,
      });

      expect(result).toEqual({
        all: 20,
        active: 20,
        inactive: 0,
        blocked: 0,
      });
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: { accountStatus: UserAccountStatus.ACTIVE },
      });
      expect(mockPrismaService.user.groupBy).not.toHaveBeenCalled();
    });

    it('returns grouped counts when listing all account statuses', async () => {
      mockPrismaService.user.groupBy.mockResolvedValue([
        { accountStatus: UserAccountStatus.ACTIVE, _count: { _all: 20 } },
        { accountStatus: UserAccountStatus.INACTIVE, _count: { _all: 5 } },
        { accountStatus: UserAccountStatus.BLOCKED, _count: { _all: 2 } },
      ]);

      const result = await service.getAccountStatusCounts('jane', {
        listAllAccountStatuses: true,
      });

      expect(result).toEqual({
        all: 27,
        active: 20,
        inactive: 5,
        blocked: 2,
      });
      expect(mockPrismaService.user.groupBy).toHaveBeenCalledWith({
        by: ['accountStatus'],
        where: {
          OR: [
            { name: { contains: 'jane', mode: 'insensitive' } },
            { email: { contains: 'jane', mode: 'insensitive' } },
          ],
        },
        _count: { _all: true },
      });
    });
  });

  describe('findAll', () => {
    const mockUserRow = {
      id: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [],
      userLanguages: [],
      userCountryCoverages: [],
      userProfessionScopes: [],
    };

    it('includes accountStatusCounts and ignores list accountStatus for tile counts', async () => {
      mockPrismaService.user.count.mockResolvedValue(3);
      mockPrismaService.user.findMany.mockResolvedValue([mockUserRow]);
      mockPrismaService.user.groupBy.mockResolvedValue([
        { accountStatus: UserAccountStatus.ACTIVE, _count: { _all: 20 } },
        { accountStatus: UserAccountStatus.INACTIVE, _count: { _all: 5 } },
        { accountStatus: UserAccountStatus.BLOCKED, _count: { _all: 2 } },
      ]);

      const result = await service.findAll(
        {
          page: 1,
          limit: 10,
          accountStatus: UserAccountStatus.ACTIVE,
        },
        { listAllAccountStatuses: true },
      );

      expect(result.total).toBe(3);
      expect(result.users).toHaveLength(1);
      expect(result.accountStatusCounts).toEqual({
        all: 27,
        active: 20,
        inactive: 5,
        blocked: 2,
      });
      expect(mockPrismaService.user.groupBy).toHaveBeenCalledWith({
        by: ['accountStatus'],
        where: {},
        _count: { _all: true },
      });
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: { accountStatus: UserAccountStatus.ACTIVE },
      });
    });

    it('scopes accountStatusCounts by search only', async () => {
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue([mockUserRow]);
      mockPrismaService.user.groupBy.mockResolvedValue([
        { accountStatus: UserAccountStatus.ACTIVE, _count: { _all: 1 } },
        { accountStatus: UserAccountStatus.INACTIVE, _count: { _all: 0 } },
        { accountStatus: UserAccountStatus.BLOCKED, _count: { _all: 0 } },
      ]);

      const result = await service.findAll(
        { search: 'alice', page: 1, limit: 10 },
        { listAllAccountStatuses: true },
      );

      expect(result.accountStatusCounts).toEqual({
        all: 1,
        active: 1,
        inactive: 0,
        blocked: 0,
      });
      expect(mockPrismaService.user.groupBy).toHaveBeenCalledWith({
        by: ['accountStatus'],
        where: {
          OR: [
            { name: { contains: 'alice', mode: 'insensitive' } },
            { email: { contains: 'alice', mode: 'insensitive' } },
          ],
        },
        _count: { _all: true },
      });
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
          role: { name: 'Recruitment Executive' },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRoles('user123');

      expect(result).toEqual(['Manager', 'Recruitment Executive']);
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        include: expect.any(Object),
      });
    });
  });

  describe('updateDocumentsControlPermissions', () => {
    it('should persist direct permissions and emit realtime socket events to the user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'target' });
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: 'perm-intake-read', key: 'read:original_document_intake' },
        { id: 'perm-intake-write', key: 'write:original_document_intake' },
        { id: 'perm-courier-read', key: 'read:courier_management' },
        { id: 'perm-courier-write', key: 'write:courier_management' },
      ]);
      mockPrismaService.userPermission.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.userPermission.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.user.update.mockResolvedValue({});

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'target',
        documentsControlAccess: {
          originalDocumentIntakeEnabled: true,
          courierManagementEnabled: false,
        },
      } as any);

      await service.updateDocumentsControlPermissions(
        'target',
        {
          originalDocumentIntakeEnabled: true,
          courierManagementEnabled: false,
        },
        'admin1',
      );

      expect(mockPrismaService.userPermission.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.userPermission.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'target', permissionId: 'perm-intake-read' },
          { userId: 'target', permissionId: 'perm-intake-write' },
        ],
        skipDuplicates: true,
      });
      expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledWith(
        'target',
        'user:documents-control-permissions-changed',
        expect.objectContaining({
          userId: 'target',
          roles: ['Operations Executive'],
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
          type: 'DocumentsControlPermissionsUpdated',
        }),
      );

      findOneSpy.mockRestore();
    });
  });

  describe('updateRecruiterCapabilities', () => {
    it('rejects non-empty capabilities for Recruitment Lead', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'lead-1',
        userRoles: [{ role: { name: 'Recruitment Lead' } }],
      });

      await expect(
        service.updateRecruiterCapabilities(
          'lead-1',
          {
            languages: [],
            countryCoverages: [
              { countryCode: 'SA', sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE] },
            ],
          },
          'admin1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('clears stored capabilities for Recruitment Lead with empty payload', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'lead-1',
        userRoles: [{ role: { name: 'Recruitment Lead' } }],
      });
      mockPrismaService.userLanguage.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.userCountryCoverage.deleteMany.mockResolvedValue({
        count: 0,
      });
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'lead-1',
      } as any);

      await service.updateRecruiterCapabilities(
        'lead-1',
        { languages: [], countryCoverages: [] },
        'admin1',
      );

      expect(mockPrismaService.userLanguage.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.userCountryCoverage.deleteMany).toHaveBeenCalled();
      findOneSpy.mockRestore();
    });
  });
});
