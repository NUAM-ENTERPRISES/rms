import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UploadService } from '../../upload/upload.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionAvailability } from '@prisma/client';
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
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(mockPrismaService)),
  };

  const mockAuditService = {
    logUserAction: jest.fn(),
    logAuthAction: jest.fn(),
    logRoleAction: jest.fn(),
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

      const result = await service.create(createUserDto, 'admin123');

      expect(result).toEqual(mockUser);
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
});
