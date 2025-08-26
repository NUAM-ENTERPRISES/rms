import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from '../teams.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { AssignUserDto } from '../dto/assign-user.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TeamsService', () => {
  let service: TeamsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    team: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userTeam: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
    candidate: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTeamDto: CreateTeamDto = {
      name: 'Healthcare Team A',
      leadId: 'user123',
      headId: 'user456',
      managerId: 'user789',
    };

    const mockTeam = {
      id: 'team123',
      name: 'Healthcare Team A',
      leadId: 'user123',
      headId: 'user456',
      managerId: 'user789',
      userTeams: [],
      projects: [],
      candidates: [],
    };

    it('should create a team successfully', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user123', name: 'Lead User' } as any)
        .mockResolvedValueOnce({ id: 'user456', name: 'Head User' } as any)
        .mockResolvedValueOnce({ id: 'user789', name: 'Manager User' } as any);
      prismaService.team.create.mockResolvedValue(mockTeam as any);

      const result = await service.create(createTeamDto, 'user123');

      expect(result).toEqual(mockTeam);
      expect(prismaService.team.create).toHaveBeenCalledWith({
        data: {
          name: 'Healthcare Team A',
          leadId: 'user123',
          headId: 'user456',
          managerId: 'user789',
        },
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException when team name already exists', async () => {
      prismaService.team.findUnique.mockResolvedValue({
        id: 'existing123',
      } as any);

      await expect(service.create(createTeamDto, 'user123')).rejects.toThrow(
        new ConflictException(
          'Team with name "Healthcare Team A" already exists',
        ),
      );
    });

    it('should throw NotFoundException when lead user does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(createTeamDto, 'user123')).rejects.toThrow(
        new NotFoundException('User with ID user123 not found'),
      );
    });

    it('should throw NotFoundException when head user does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user123', name: 'Lead User' } as any)
        .mockResolvedValueOnce(null);

      await expect(service.create(createTeamDto, 'user123')).rejects.toThrow(
        new NotFoundException('User with ID user456 not found'),
      );
    });

    it('should throw NotFoundException when manager user does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user123', name: 'Lead User' } as any)
        .mockResolvedValueOnce({ id: 'user456', name: 'Head User' } as any)
        .mockResolvedValueOnce(null);

      await expect(service.create(createTeamDto, 'user123')).rejects.toThrow(
        new NotFoundException('User with ID user789 not found'),
      );
    });
  });

  describe('findAll', () => {
    const mockTeams = [
      {
        id: 'team123',
        name: 'Healthcare Team A',
        userTeams: [],
        projects: [],
        candidates: [],
      },
    ];

    it('should return paginated teams', async () => {
      prismaService.team.count.mockResolvedValue(1);
      prismaService.team.findMany.mockResolvedValue(mockTeams as any);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        teams: mockTeams,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      prismaService.team.count.mockResolvedValue(1);
      prismaService.team.findMany.mockResolvedValue(mockTeams as any);

      await service.findAll({ search: 'healthcare' });

      expect(prismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              contains: 'healthcare',
              mode: 'insensitive',
            },
          },
        }),
      );
    });

    it('should apply leadership filters', async () => {
      prismaService.team.count.mockResolvedValue(1);
      prismaService.team.findMany.mockResolvedValue(mockTeams as any);

      await service.findAll({
        leadId: 'user123',
        headId: 'user456',
        managerId: 'user789',
      });

      expect(prismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            leadId: 'user123',
            headId: 'user456',
            managerId: 'user789',
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockTeam = {
      id: 'team123',
      name: 'Healthcare Team A',
      userTeams: [],
      projects: [],
      candidates: [],
    };

    it('should return a team by id', async () => {
      prismaService.team.findUnique.mockResolvedValue(mockTeam as any);

      const result = await service.findOne('team123');

      expect(result).toEqual(mockTeam);
      expect(prismaService.team.findUnique).toHaveBeenCalledWith({
        where: { id: 'team123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.findOne('team123')).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });
  });

  describe('update', () => {
    const updateTeamDto: UpdateTeamDto = {
      name: 'Updated Team Name',
      leadId: 'newlead123',
    };

    const mockTeam = {
      id: 'team123',
      name: 'Updated Team Name',
      userTeams: [],
      projects: [],
      candidates: [],
    };

    it('should update a team successfully', async () => {
      prismaService.team.findUnique
        .mockResolvedValueOnce({ id: 'team123', name: 'Old Name' } as any)
        .mockResolvedValueOnce(null); // No team with new name
      prismaService.user.findUnique.mockResolvedValue({
        id: 'newlead123',
        name: 'New Lead',
      } as any);
      prismaService.team.update.mockResolvedValue(mockTeam as any);

      const result = await service.update('team123', updateTeamDto, 'user123');

      expect(result).toEqual(mockTeam);
      expect(prismaService.team.update).toHaveBeenCalledWith({
        where: { id: 'team123' },
        data: {
          name: 'Updated Team Name',
          leadId: 'newlead123',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(
        service.update('team123', updateTeamDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });

    it('should throw ConflictException when new name already exists', async () => {
      prismaService.team.findUnique
        .mockResolvedValueOnce({ id: 'team123', name: 'Old Name' } as any)
        .mockResolvedValueOnce({ id: 'existing123' } as any);

      await expect(
        service.update('team123', updateTeamDto, 'user123'),
      ).rejects.toThrow(
        new ConflictException(
          'Team with name "Updated Team Name" already exists',
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete a team successfully', async () => {
      prismaService.team.findUnique.mockResolvedValue({
        id: 'team123',
        projects: [],
        candidates: [],
        userTeams: [],
      } as any);
      prismaService.team.delete.mockResolvedValue({ id: 'team123' } as any);

      const result = await service.remove('team123', 'user123');

      expect(result).toEqual({
        id: 'team123',
        message: 'Team deleted successfully',
      });
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.remove('team123', 'user123')).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });

    it('should throw ConflictException when team has projects', async () => {
      prismaService.team.findUnique.mockResolvedValue({
        id: 'team123',
        projects: [{ id: 'project123' }],
        candidates: [],
        userTeams: [],
      } as any);

      await expect(service.remove('team123', 'user123')).rejects.toThrow(
        new ConflictException(
          'Cannot delete team with ID team123 because it has 1 project(s) assigned. Please reassign or delete the projects first.',
        ),
      );
    });

    it('should throw ConflictException when team has candidates', async () => {
      prismaService.team.findUnique.mockResolvedValue({
        id: 'team123',
        projects: [],
        candidates: [{ id: 'candidate123' }],
        userTeams: [],
      } as any);

      await expect(service.remove('team123', 'user123')).rejects.toThrow(
        new ConflictException(
          'Cannot delete team with ID team123 because it has 1 candidate(s) assigned. Please reassign the candidates first.',
        ),
      );
    });
  });

  describe('assignUser', () => {
    const assignUserDto: AssignUserDto = {
      userId: 'user123',
      role: 'recruiter',
    };

    it('should assign user to team successfully', async () => {
      prismaService.team.findUnique.mockResolvedValue({ id: 'team123' } as any);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
      } as any);
      prismaService.userTeam.findUnique.mockResolvedValue(null);
      prismaService.userTeam.create.mockResolvedValue({
        userId: 'user123',
        teamId: 'team123',
      } as any);

      const result = await service.assignUser(
        'team123',
        assignUserDto,
        'admin123',
      );

      expect(result.message).toBe('User assigned to team successfully');
      expect(prismaService.userTeam.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          teamId: 'team123',
        },
      });
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(
        service.assignUser('team123', assignUserDto, 'admin123'),
      ).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue({ id: 'team123' } as any);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignUser('team123', assignUserDto, 'admin123'),
      ).rejects.toThrow(
        new NotFoundException('User with ID user123 not found'),
      );
    });

    it('should throw ConflictException when user is already assigned', async () => {
      prismaService.team.findUnique.mockResolvedValue({ id: 'team123' } as any);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
      } as any);
      prismaService.userTeam.findUnique.mockResolvedValue({
        id: 'assignment123',
      } as any);

      await expect(
        service.assignUser('team123', assignUserDto, 'admin123'),
      ).rejects.toThrow(
        new ConflictException(
          'User user123 is already assigned to team team123',
        ),
      );
    });
  });

  describe('removeUser', () => {
    it('should remove user from team successfully', async () => {
      prismaService.team.findUnique.mockResolvedValue({ id: 'team123' } as any);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
      } as any);
      prismaService.userTeam.findUnique.mockResolvedValue({
        id: 'assignment123',
      } as any);
      prismaService.userTeam.delete.mockResolvedValue({
        id: 'assignment123',
      } as any);

      const result = await service.removeUser('team123', 'user123', 'admin123');

      expect(result.message).toBe('User removed from team successfully');
      expect(prismaService.userTeam.delete).toHaveBeenCalledWith({
        where: {
          userId_teamId: {
            userId: 'user123',
            teamId: 'team123',
          },
        },
      });
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(
        service.removeUser('team123', 'user123', 'admin123'),
      ).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue({ id: 'team123' } as any);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.removeUser('team123', 'user123', 'admin123'),
      ).rejects.toThrow(
        new NotFoundException('User with ID user123 not found'),
      );
    });

    it('should throw NotFoundException when user is not assigned to team', async () => {
      prismaService.team.findUnique.mockResolvedValue({ id: 'team123' } as any);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
      } as any);
      prismaService.userTeam.findUnique.mockResolvedValue(null);

      await expect(
        service.removeUser('team123', 'user123', 'admin123'),
      ).rejects.toThrow(
        new NotFoundException('User user123 is not assigned to team team123'),
      );
    });
  });

  describe('getTeamMembers', () => {
    const mockMembers = [
      {
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          dateOfBirth: new Date(),
          createdAt: new Date(),
        },
      },
    ];

    it('should return team members', async () => {
      prismaService.team.findUnique.mockResolvedValue({ id: 'team123' } as any);
      prismaService.userTeam.findMany.mockResolvedValue(mockMembers as any);

      const result = await service.getTeamMembers('team123');

      expect(result).toEqual(mockMembers);
      expect(prismaService.userTeam.findMany).toHaveBeenCalledWith({
        where: { teamId: 'team123' },
        include: expect.any(Object),
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.getTeamMembers('team123')).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });
  });

  describe('getTeamStats', () => {
    it('should return team statistics', async () => {
      // Mock all the count calls in the correct order
      prismaService.team.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // teamsWithLeads
        .mockResolvedValueOnce(3) // teamsWithHeads
        .mockResolvedValueOnce(2) // teamsWithManagers
        .mockResolvedValueOnce(7) // teamsWithProjects
        .mockResolvedValueOnce(6); // teamsWithCandidates

      prismaService.userTeam.groupBy.mockResolvedValue([
        { teamId: 'team1', _count: { userId: 3 } },
        { teamId: 'team2', _count: { userId: 5 } },
      ] as any);

      prismaService.project.count.mockResolvedValue(25);
      prismaService.candidate.count.mockResolvedValue(50);

      const result = await service.getTeamStats();

      expect(result).toEqual({
        totalTeams: 10,
        teamsWithLeads: 5,
        teamsWithHeads: 3,
        teamsWithManagers: 2,
        averageTeamSize: 4,
        teamsByMemberCount: {
          '3': 1,
          '5': 1,
        },
        teamsWithProjects: 7,
        teamsWithCandidates: 6,
        averageProjectsPerTeam: 2.5,
        averageCandidatesPerTeam: 5,
      });
    });
  });
});
