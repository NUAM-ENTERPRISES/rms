import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let auditService: AuditService;

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
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'SecurePass123!',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
    };

    it('should create a user successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: createUserDto.email,
        name: createUserDto.name,
        phone: createUserDto.phone,
        dateOfBirth: new Date(createUserDto.dateOfBirth!),
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
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
