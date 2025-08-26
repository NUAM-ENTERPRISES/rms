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
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
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
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [
              {
                permission: { key: 'read:users' },
              },
              {
                permission: { key: 'write:users' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }, { teamId: 'team2' }];

      const mockUser = {
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserRolesAndPermissions('user1');

      expect(result).toEqual({
        roles: ['Manager'],
        permissions: ['read:users', 'write:users'],
        teamIds: ['team1', 'team2'],
        userVersion: new Date('2024-01-01T00:00:00Z').getTime(),
      });
    });

    it('should return cached result when available', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [
              {
                permission: { key: 'read:candidates' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // First call - should hit database
      await service.getUserRolesAndPermissions('user1');

      // Second call - should use cache
      const result = await service.getUserRolesAndPermissions('user1');

      expect(result).toEqual({
        roles: ['Recruiter'],
        permissions: ['read:candidates'],
        teamIds: ['team1'],
        userVersion: mockUser.updatedAt.getTime(),
      });

      // Should only call database once
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEffectiveScope', () => {
    it('should return "all" for CEO role', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'CEO',
            rolePermissions: [
              {
                permission: { key: '*' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectiveScope('user1');

      expect(result).toBe('all');
    });

    it('should return "all" for Director role', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Director',
            rolePermissions: [
              {
                permission: { key: 'read:all' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectiveScope('user1');

      expect(result).toBe('all');
    });

    it('should return team scope for regular users', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [
              {
                permission: { key: 'read:candidates' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }, { teamId: 'team2' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectiveScope('user1');

      expect(result).toEqual({ teamIds: ['team1', 'team2'] });
    });
  });

  describe('hasRole', () => {
    it('should return true for CEO role', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'CEO',
            rolePermissions: [
              {
                permission: { key: '*' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasRole('user1', ['Manager']);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [
              {
                permission: { key: 'read:users' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasRole('user1', ['Manager']);

      expect(result).toBe(true);
    });

    it('should return false when user lacks required role', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [
              {
                permission: { key: 'read:candidates' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasRole('user1', ['Manager']);

      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for wildcard permission', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'CEO',
            rolePermissions: [
              {
                permission: { key: '*' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission('user1', ['manage:users']);

      expect(result).toBe(true);
    });

    it('should return true when user has required permission', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [
              {
                permission: { key: 'manage:users' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission('user1', ['manage:users']);

      expect(result).toBe(true);
    });

    it('should return false when user lacks required permission', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [
              {
                permission: { key: 'read:candidates' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission('user1', ['manage:users']);

      expect(result).toBe(false);
    });
  });

  describe('checkTeamAccess', () => {
    it('should return true for CEO role', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'CEO',
            rolePermissions: [
              {
                permission: { key: '*' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.checkTeamAccess('user1', 'team2');

      expect(result).toBe(true);
    });

    it('should return true when user is assigned to team', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [
              {
                permission: { key: 'read:candidates' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.userTeam.findUnique.mockResolvedValue({
        userId: 'user1',
        teamId: 'team1',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.checkTeamAccess('user1', 'team1');

      expect(result).toBe(true);
    });

    it('should return false when user is not assigned to team', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Recruiter',
            rolePermissions: [
              {
                permission: { key: 'read:candidates' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.userTeam.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.checkTeamAccess('user1', 'team2');

      expect(result).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear user cache', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [
              {
                permission: { key: 'read:users' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // First call - populate cache
      await service.getUserRolesAndPermissions('user1');

      // Clear cache
      service.clearUserCache('user1');

      // Second call - should hit database again
      await service.getUserRolesAndPermissions('user1');

      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      const mockUserRoles = [
        {
          role: {
            name: 'Manager',
            rolePermissions: [
              {
                permission: { key: 'read:users' },
              },
            ],
          },
        },
      ];

      const mockUserTeams = [{ teamId: 'team1' }];
      const mockUser = { updatedAt: new Date() };

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);
      mockPrismaService.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Populate cache for multiple users
      await service.getUserRolesAndPermissions('user1');
      await service.getUserRolesAndPermissions('user2');

      // Clear all cache
      service.clearAllCache();

      // Should hit database again
      await service.getUserRolesAndPermissions('user1');

      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledTimes(3);
    });
  });
});
