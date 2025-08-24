import { Test, TestingModule } from '@nestjs/testing';
import { RbacUtil } from '../rbac.util';
import { PrismaService } from '../../../database/prisma.service';

describe('RbacUtil', () => {
  let service: RbacUtil;
  let prismaService: PrismaService;

  const mockPrismaService = {
    userRole: {
      findMany: jest.fn(),
    },
    userTeam: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacUtil,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RbacUtil>(RbacUtil);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearAllCache();
  });

  describe('getUserRolesAndPermissions', () => {
    it('should return user roles and permissions from database', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [
              { permission: { key: 'read:all' } },
              { permission: { key: 'manage:users' } },
            ],
          },
        },
        {
          role: {
            name: 'Team Head',
            rolePermissions: [{ permission: { key: 'read:assigned_teams' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRolesAndPermissions(userId);

      expect(result).toEqual({
        roles: ['Manager', 'Team Head'],
        permissions: ['read:all', 'manage:users', 'read:assigned_teams'],
      });
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { userId },
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
      });
    });

    it('should return cached data if available and not expired', async () => {
      const userId = 'user-1';
      const cachedData = {
        roles: ['Manager'],
        permissions: ['read:all'],
      };

      // Set cache manually
      (service as any).cache.set(userId, {
        data: cachedData,
        timestamp: Date.now(),
      });

      const result = await service.getUserRolesAndPermissions(userId);

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.userRole.findMany).not.toHaveBeenCalled();
    });

    it('should fetch fresh data if cache is expired', async () => {
      const userId = 'user-1';
      const expiredData = {
        roles: ['OldRole'],
        permissions: ['old:permission'],
      };

      // Set expired cache
      (service as any).cache.set(userId, {
        data: expiredData,
        timestamp: Date.now() - 70000, // 70 seconds ago (expired)
      });

      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [{ permission: { key: 'read:all' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRolesAndPermissions(userId);

      expect(result).toEqual({
        roles: ['Manager'],
        permissions: ['read:all'],
      });
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalled();
    });
  });

  describe('hasRole', () => {
    it('should return true for global admin roles (CEO)', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'CEO',
            rolePermissions: [{ permission: { key: '*' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasRole(userId, ['Manager']);

      expect(result).toBe(true);
    });

    it('should return true for global admin roles (Director)', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Director',
            rolePermissions: [{ permission: { key: '*' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasRole(userId, ['Recruiter']);

      expect(result).toBe(true);
    });

    it('should return true if user has required role', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [{ permission: { key: 'read:all' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasRole(userId, ['Manager']);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [{ permission: { key: 'read:candidates' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasRole(userId, ['Manager']);

      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for global permissions (*)', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'CEO',
            rolePermissions: [{ permission: { key: '*' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasPermission(userId, ['manage:users']);

      expect(result).toBe(true);
    });

    it('should return true for manage:all permission', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [{ permission: { key: 'manage:all' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasPermission(userId, ['write:projects']);

      expect(result).toBe(true);
    });

    it('should return true if user has required permission', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [{ permission: { key: 'manage:users' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasPermission(userId, ['manage:users']);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required permission', async () => {
      const userId = 'user-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [{ permission: { key: 'read:candidates' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.hasPermission(userId, ['manage:users']);

      expect(result).toBe(false);
    });
  });

  describe('checkTeamAccess', () => {
    it('should return true for global admins (CEO)', async () => {
      const userId = 'user-1';
      const resourceTeamId = 'team-1';
      const mockUserRoles = [
        {
          role: {
            name: 'CEO',
            rolePermissions: [{ permission: { key: '*' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.checkTeamAccess(userId, resourceTeamId);

      expect(result).toBe(true);
      expect(mockPrismaService.userTeam.findUnique).not.toHaveBeenCalled();
    });

    it('should return true for global admins (Director)', async () => {
      const userId = 'user-1';
      const resourceTeamId = 'team-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Director',
            rolePermissions: [{ permission: { key: '*' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.checkTeamAccess(userId, resourceTeamId);

      expect(result).toBe(true);
    });

    it('should return true for Managers with read:all permission', async () => {
      const userId = 'user-1';
      const resourceTeamId = 'team-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [{ permission: { key: 'read:all' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.checkTeamAccess(userId, resourceTeamId);

      expect(result).toBe(true);
    });

    it('should return true if user is assigned to the team', async () => {
      const userId = 'user-1';
      const resourceTeamId = 'team-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [{ permission: { key: 'read:candidates' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findUnique.mockResolvedValue({
        userId,
        teamId: resourceTeamId,
      });

      const result = await service.checkTeamAccess(userId, resourceTeamId);

      expect(result).toBe(true);
      expect(mockPrismaService.userTeam.findUnique).toHaveBeenCalledWith({
        where: {
          userId_teamId: {
            userId,
            teamId: resourceTeamId,
          },
        },
      });
    });

    it('should return false if user is not assigned to the team', async () => {
      const userId = 'user-1';
      const resourceTeamId = 'team-1';
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [{ permission: { key: 'read:candidates' } }],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findUnique.mockResolvedValue(null);

      const result = await service.checkTeamAccess(userId, resourceTeamId);

      expect(result).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear user cache', () => {
      const userId = 'user-1';
      const cachedData = { roles: ['Manager'], permissions: ['read:all'] };

      (service as any).cache.set(userId, {
        data: cachedData,
        timestamp: Date.now(),
      });

      service.clearUserCache(userId);

      expect((service as any).cache.has(userId)).toBe(false);
    });

    it('should clear all cache', () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      (service as any).cache.set(userId1, { data: {}, timestamp: Date.now() });
      (service as any).cache.set(userId2, { data: {}, timestamp: Date.now() });

      service.clearAllCache();

      expect((service as any).cache.size).toBe(0);
    });
  });
});
