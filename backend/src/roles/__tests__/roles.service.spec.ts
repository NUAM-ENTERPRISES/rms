import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RolesService } from '../roles.service';
import { PrismaService } from '../../database/prisma.service';
import { AssignRoleDto } from '../dto/assign-role.dto';

describe('RolesService', () => {
  let service: RolesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all roles with their permissions', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Manager',
          description: 'Manager role',
          rolePermissions: [
            { permission: { key: 'read:all' } },
            { permission: { key: 'manage:users' } },
          ],
        },
        {
          id: 'role-2',
          name: 'Recruiter',
          description: 'Recruiter role',
          rolePermissions: [{ permission: { key: 'read:candidates' } }],
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAll();

      expect(result).toEqual([
        {
          id: 'role-1',
          name: 'Manager',
          description: 'Manager role',
          permissions: ['read:all', 'manage:users'],
        },
        {
          id: 'role-2',
          name: 'Recruiter',
          description: 'Recruiter role',
          permissions: ['read:candidates'],
        },
      ]);
    });
  });

  describe('assignRoleToUser', () => {
    const assignRoleDto: AssignRoleDto = {
      userId: 'user-1',
      roleId: 'role-1',
    };

    it('should assign role to user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const mockRole = {
        id: 'role-1',
        name: 'Manager',
      };

      const mockUserRole = {
        userId: 'user-1',
        roleId: 'role-1',
        role: { name: 'Manager' },
        user: { name: 'John Doe', email: 'john@example.com' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.findUnique.mockResolvedValue(null);
      mockPrismaService.userRole.create.mockResolvedValue(mockUserRole);

      const result = await service.assignRoleToUser(assignRoleDto);

      expect(result).toEqual({
        success: true,
        data: {
          userId: 'user-1',
          roleId: 'role-1',
          roleName: 'Manager',
          userName: 'John Doe',
          userEmail: 'john@example.com',
        },
        message: 'Role "Manager" assigned to user "John Doe" successfully',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRoleToUser(assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRoleToUser(assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-1' },
      });
    });

    it('should throw ConflictException when role is already assigned', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };
      const mockRole = { id: 'role-1', name: 'Manager' };
      const mockExistingUserRole = { userId: 'user-1', roleId: 'role-1' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.findUnique.mockResolvedValue(
        mockExistingUserRole,
      );

      await expect(service.assignRoleToUser(assignRoleDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove role from user successfully', async () => {
      const userId = 'user-1';
      const roleId = 'role-1';

      const mockUserRole = {
        userId: 'user-1',
        roleId: 'role-1',
        role: { name: 'Manager' },
        user: { name: 'John Doe', email: 'john@example.com' },
      };

      mockPrismaService.userRole.findUnique.mockResolvedValue(mockUserRole);
      mockPrismaService.userRole.delete.mockResolvedValue(mockUserRole);

      const result = await service.removeRoleFromUser(userId, roleId);

      expect(result).toEqual({
        success: true,
        data: {
          userId: 'user-1',
          roleId: 'role-1',
          roleName: 'Manager',
          userName: 'John Doe',
          userEmail: 'john@example.com',
        },
        message: 'Role "Manager" removed from user "John Doe" successfully',
      });
    });

    it('should throw NotFoundException when user role assignment not found', async () => {
      const userId = 'user-1';
      const roleId = 'role-1';

      mockPrismaService.userRole.findUnique.mockResolvedValue(null);

      await expect(service.removeRoleFromUser(userId, roleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles with permissions', async () => {
      const userId = 'user-1';

      const mockUserRoles = [
        {
          role: {
            id: 'role-1',
            name: 'Manager',
            description: 'Manager role',
            rolePermissions: [
              { permission: { key: 'read:all' } },
              { permission: { key: 'manage:users' } },
            ],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRoles(userId);

      expect(result).toEqual([
        {
          id: 'role-1',
          name: 'Manager',
          description: 'Manager role',
          permissions: ['read:all', 'manage:users'],
        },
      ]);
    });
  });
});
