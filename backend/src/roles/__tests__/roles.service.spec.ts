import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RolesService } from '../roles.service';
import { PrismaService } from '../../database/prisma.service';
import { AssignRoleDto } from '../dto/assign-role.dto';

describe('RolesService', () => {
  let service: RolesService;

  const mockPrismaService = {
    role: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated roles with counts', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Department Head',
          description: 'Manager role',
          isSystem: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          createdBy: null,
          rolePermissions: [
            { permission: { key: 'read:all' } },
            { permission: { key: 'manage:users' } },
          ],
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);
      mockPrismaService.role.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.roles).toEqual([
        {
          id: 'role-1',
          name: 'Department Head',
          description: 'Manager role',
          isSystem: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdBy: null,
          permissions: ['read:all', 'manage:users'],
        },
      ]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(result.counts).toEqual({
        all: 2,
        system: 1,
        custom: 1,
      });
    });
  });

  describe('findAssignedUsers', () => {
    it('should return paginated users for a role', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({ id: 'role-1' });
      mockPrismaService.userRole.findMany.mockResolvedValue([
        {
          user: {
            id: 'user-1',
            name: 'Jane',
            email: 'jane@example.com',
            mobileNumber: '999',
            employeeCode: 'E1',
            profileImage: null,
            accountStatus: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ]);
      mockPrismaService.userRole.count.mockResolvedValue(1);

      const result = await service.findAssignedUsers('role-1', {
        page: 1,
        limit: 10,
      });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('Jane');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should throw when role is missing', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);
      await expect(
        service.findAssignedUsers('missing', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a role with assigned user count', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'role-2',
        name: 'Custom Lead',
        description: 'Custom',
        isSystem: false,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: { id: 'user-9', name: 'Ada Manager' },
        rolePermissions: [{ permission: { key: 'read:candidates' } }],
        _count: { userRoles: 4 },
      });

      const result = await service.findOne('role-2');

      expect(result).toMatchObject({
        id: 'role-2',
        name: 'Custom Lead',
        isSystem: false,
        assignedUserCount: 4,
        permissions: ['read:candidates'],
      });
    });

    it('should throw when role is missing', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createRole', () => {
    it('should create a custom role with permissions', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: 'p1', key: 'read:candidates' },
        { id: 'p2', key: 'write:candidates' },
      ]);

      const createdRole = {
        id: 'role-new',
        name: 'Regional Lead',
        description: 'Region lead',
        isSystem: false,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        createdBy: { id: 'user-1', name: 'Department Head' },
        rolePermissions: [
          { permission: { key: 'read:candidates' } },
          { permission: { key: 'write:candidates' } },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb({
          role: {
            create: jest.fn().mockResolvedValue(createdRole),
          },
        }),
      );

      const result = await service.createRole(
        {
          name: 'Regional Lead',
          description: 'Region lead',
          permissionKeys: ['read:candidates', 'write:candidates'],
        },
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.data.isSystem).toBe(false);
      expect(result.data.permissions).toEqual([
        'read:candidates',
        'write:candidates',
      ]);
      expect(result.data.createdBy).toEqual({
        id: 'user-1',
        name: 'Department Head',
      });
    });

    it('should reject wildcard permission on custom roles', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(
        service.createRole(
          {
            name: 'Super Custom',
            permissionKeys: ['*'],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unknown permission keys', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: 'p1', key: 'read:candidates' },
      ]);

      await expect(
        service.createRole(
          {
            name: 'Broken Role',
            permissionKeys: ['read:candidates', 'invented:permission'],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate role names', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createRole(
          {
            name: 'Department Head',
            permissionKeys: ['read:candidates'],
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('should block updates to system roles', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'Department Head',
        isSystem: true,
      });

      await expect(
        service.updateRole('role-1', { description: 'Nope' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update a custom role and replace permissions', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'role-2',
        name: 'Custom Lead',
        isSystem: false,
      });
      mockPrismaService.role.findFirst.mockResolvedValue(null);
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: 'p3', key: 'read:users' },
      ]);

      const updatedRole = {
        id: 'role-2',
        name: 'Custom Lead Updated',
        description: 'Updated',
        isSystem: false,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        createdBy: { id: 'user-9', name: 'Ada Manager' },
        rolePermissions: [{ permission: { key: 'read:users' } }],
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb({
          rolePermission: {
            deleteMany: mockPrismaService.rolePermission.deleteMany,
            createMany: mockPrismaService.rolePermission.createMany,
          },
          role: {
            update: jest.fn().mockResolvedValue(updatedRole),
          },
        }),
      );

      const result = await service.updateRole('role-2', {
        name: 'Custom Lead Updated',
        description: 'Updated',
        permissionKeys: ['read:users'],
      });

      expect(result.data.name).toBe('Custom Lead Updated');
      expect(result.data.permissions).toEqual(['read:users']);
      expect(mockPrismaService.rolePermission.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.rolePermission.createMany).toHaveBeenCalled();
    });
  });

  describe('deleteRole', () => {
    it('should block deleting system roles', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'Department Head',
        isSystem: true,
        _count: { userRoles: 0 },
      });

      await expect(service.deleteRole('role-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should block deleting roles still assigned to users', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'role-2',
        name: 'Custom Lead',
        isSystem: false,
        _count: { userRoles: 2 },
      });

      await expect(service.deleteRole('role-2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should delete an unused custom role', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'role-2',
        name: 'Custom Lead',
        isSystem: false,
        _count: { userRoles: 0 },
      });
      mockPrismaService.role.delete.mockResolvedValue({});

      const result = await service.deleteRole('role-2');

      expect(result).toEqual({
        success: true,
        data: { id: 'role-2', name: 'Custom Lead' },
        message: 'Role "Custom Lead" deleted successfully',
      });
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
        name: 'Department Head',
      };

      const mockUserRole = {
        userId: 'user-1',
        roleId: 'role-1',
        role: { name: 'Department Head' },
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
          roleName: 'Department Head',
          userName: 'John Doe',
          userEmail: 'john@example.com',
        },
        message: 'Role "Department Head" assigned to user "John Doe" successfully',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRoleToUser(assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when role not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'John Doe',
      });
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRoleToUser(assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when role is already assigned', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'John Doe',
      });
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'Department Head',
      });
      mockPrismaService.userRole.findUnique.mockResolvedValue({
        userId: 'user-1',
        roleId: 'role-1',
      });

      await expect(service.assignRoleToUser(assignRoleDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove role from user successfully', async () => {
      const mockUserRole = {
        userId: 'user-1',
        roleId: 'role-1',
        role: { name: 'Department Head' },
        user: { name: 'John Doe', email: 'john@example.com' },
      };

      mockPrismaService.userRole.findUnique.mockResolvedValue(mockUserRole);
      mockPrismaService.userRole.delete.mockResolvedValue(mockUserRole);

      const result = await service.removeRoleFromUser('user-1', 'role-1');

      expect(result.success).toBe(true);
      expect(result.data.roleName).toBe('Department Head');
    });

    it('should throw NotFoundException when user role assignment not found', async () => {
      mockPrismaService.userRole.findUnique.mockResolvedValue(null);

      await expect(
        service.removeRoleFromUser('user-1', 'role-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles with permissions', async () => {
      mockPrismaService.userRole.findMany.mockResolvedValue([
        {
          role: {
            id: 'role-1',
            name: 'Department Head',
            description: 'Manager role',
            isSystem: true,
            createdBy: null,
            rolePermissions: [
              { permission: { key: 'read:all' } },
              { permission: { key: 'manage:users' } },
            ],
          },
        },
      ]);

      const result = await service.getUserRoles('user-1');

      expect(result[0]).toMatchObject({
        id: 'role-1',
        name: 'Department Head',
        isSystem: true,
        createdBy: null,
        permissions: ['read:all', 'manage:users'],
      });
    });
  });
});
