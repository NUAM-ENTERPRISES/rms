import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { RoleCatalogService } from '../../role-catalog/role-catalog.service';
import { RoundRobinService } from '../../round-robin/round-robin.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AssignCandidateDto } from '../dto/assign-candidate.dto';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prismaService: any;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    // client methods
    team: {
      findUnique: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
    },
    candidateProjects: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    roleNeeded: {
      create: jest.fn(),
    },
    roleNeededEducationRequirement: {
      createMany: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    client: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RoleCatalogService,
          useValue: { validateRoleId: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: RoundRobinService,
          useValue: { getNextRecruiter: jest.fn().mockResolvedValue({ id: 'rec1' }) },
        },
        {
          provide: require('../../countries/countries.service').CountriesService,
          useValue: { validateCountryCode: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: require('../../qualifications/qualifications.service').QualificationsService,
          useValue: { validateQualificationIds: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createProjectDto: CreateProjectDto = {
      clientId: 'client123',
      title: 'Test Project',
      description: 'Test Description',
      status: 'active',
      teamId: 'team123',
      rolesNeeded: [
        {
          designation: 'Nurse',
          quantity: 5,
          priority: 'high',
          minExperience: 2,
          maxExperience: 10,
          skills: '["Nursing", "Patient Care"]',
          roleCatalogId: 'role123',
          genderRequirement: 'all',
          ageRequirement: '',
        },
      ],
    };

    const mockProject = {
      id: 'project123',
      title: 'Test Project',
      client: { id: 'client123', name: 'Test Client' },
      creator: { id: 'user123', name: 'Test User' },
      team: { id: 'team123', name: 'Test Team' },
      rolesNeeded: [],
      candidateProjects: [],
    };

    it('should create a project successfully', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        id: 'client123',
        name: 'Test Client',
      } as any);
      prismaService.team.findUnique.mockResolvedValue({
        id: 'team123',
        name: 'Test Team',
      } as any);
      prismaService.project.create.mockResolvedValue(mockProject as any);
        prismaService.project.findUnique.mockResolvedValue(mockProject as any);

      const result = await service.create(createProjectDto, 'user123');

      expect(result).toEqual(mockProject);
      expect(prismaService.project.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client123',
          title: 'Test Project',
          description: 'Test Description',
          deadline: null,
          status: 'active',
          createdBy: 'user123',
          teamId: 'team123',
          countryCode: null,
          projectType: 'private',
          resumeEditable: true,
          groomingRequired: 'formal',
          hideContactInfo: true,
          requiredScreening: false,
          priority: 'medium',
        },
      });

      expect(prismaService.roleNeeded.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'project123',
          designation: 'Nurse',
          quantity: 5,
          priority: 'high',
          skills: ['Nursing', 'Patient Care'],
        }),
      });
    });

    it('should throw NotFoundException when client does not exist', async () => {
      prismaService.client.findUnique.mockResolvedValue(null);

      await expect(service.create(createProjectDto, 'user123')).rejects.toThrow(
        new NotFoundException('Client with ID client123 not found'),
      );
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        id: 'client123',
        name: 'Test Client',
      } as any);
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.create(createProjectDto, 'user123')).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });

    it('should throw BadRequestException when deadline is in the past', async () => {
      const pastDeadlineDto = {
        ...createProjectDto,
        deadline: '2020-01-01T00:00:00.000Z',
      };

      prismaService.client.findUnique.mockResolvedValue({
        id: 'client123',
        name: 'Test Client',
      } as any);
      prismaService.team.findUnique.mockResolvedValue({
        id: 'team123',
        name: 'Test Team',
      } as any);

      await expect(service.create(pastDeadlineDto, 'user123')).rejects.toThrow(
        new BadRequestException('Project deadline must be in the future'),
      );
    });
  });

  describe('findAll', () => {
    const mockProjects = [
      {
        id: 'project123',
        title: 'Test Project',
        client: { id: 'client123', name: 'Test Client' },
        creator: { id: 'user123', name: 'Test User' },
        team: { id: 'team123', name: 'Test Team' },
        rolesNeeded: [],
        candidateProjects: [],
      },
    ];

    it('should return paginated projects', async () => {
      prismaService.project.count.mockResolvedValue(1);
      prismaService.project.findMany.mockResolvedValue(mockProjects as any);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        projects: mockProjects,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      prismaService.project.count.mockResolvedValue(1);
      prismaService.project.findMany.mockResolvedValue(mockProjects as any);

      await service.findAll({ search: 'test' });

      expect(prismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('getEligibleCandidates & getNominatedCandidates - qualification search', () => {
    it('getEligibleCandidates should return candidate when search matches qualification shortName/name/field/university', async () => {
      const project = {
        id: 'proj-1',
        rolesNeeded: [
          { id: 'r1', designation: 'Any', roleCatalogId: 'role-1', minExperience: null, maxExperience: null, genderRequirement: 'all', educationRequirementsList: [] },
        ],
      } as any;

      const candidate = {
        id: 'c1',
        firstName: 'Alice',
        lastName: 'Qualified',
        totalExperience: 3,
        qualifications: [
          { id: 'cq1', qualification: { id: 'qual-bsc', name: 'Bachelor of Science', shortName: 'BSc', field: 'Computer Science' }, university: 'XYZ University' },
        ],
      } as any;

      prismaService.project.findUnique.mockResolvedValue(project);
      // ensure candidate.findMany is available on the test prisma mock
      prismaService.candidate.findMany = jest.fn().mockResolvedValue([candidate]);

      const res = await service.getEligibleCandidates('proj-1', 'user1', ['Manager'], { search: 'bsc', page: 1, limit: 10 });

      expect(res.candidates.length).toBeGreaterThanOrEqual(1);
      expect(res.candidates[0].firstName).toEqual('Alice');
    });

    it('getNominatedCandidates should include qualification filtering in the prisma where clause when search is provided', async () => {
      const project = { id: 'proj-1', rolesNeeded: [] } as any;
      prismaService.project.findUnique.mockResolvedValue(project);

      // Ensure count/findMany are stubbed so function proceeds
      prismaService.candidateProjects.count = jest.fn().mockResolvedValue(0);
      prismaService.candidateProjects.findMany = jest.fn().mockResolvedValue([]);

      await service.getNominatedCandidates('proj-1', 'user1', ['Manager'], { search: 'bsc', page: 1, limit: 10 });

      // Verify the prisma call included candidate qualifications in the WHERE candidate OR list
      expect(prismaService.candidateProjects.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            candidate: expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ qualifications: expect.any(Object) }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockProject = {
      id: 'project123',
      title: 'Test Project',
      client: { id: 'client123', name: 'Test Client' },
      creator: { id: 'user123', name: 'Test User' },
      team: { id: 'team123', name: 'Test Team' },
      rolesNeeded: [],
      candidateProjects: [],
    };

    it('should return a project by id', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as any);

      const result = await service.findOne('project123');

      expect(result).toEqual(mockProject);
      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('project123')).rejects.toThrow(
        new NotFoundException('Project with ID project123 not found'),
      );
    });
  });

  describe('update', () => {
    const updateProjectDto: UpdateProjectDto = {
      title: 'Updated Project',
      status: 'completed',
    };

    const mockProject = {
      id: 'project123',
      title: 'Updated Project',
      status: 'completed',
      client: { id: 'client123', name: 'Test Client' },
      creator: { id: 'user123', name: 'Test User' },
      team: { id: 'team123', name: 'Test Team' },
      rolesNeeded: [],
      candidateProjects: [],
    };

    it('should update a project successfully', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
      } as any);
      prismaService.project.update.mockResolvedValue(mockProject as any);

      const result = await service.update(
        'project123',
        updateProjectDto,
        'user123',
      );

      expect(result).toEqual(mockProject);
      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'project123' },
        data: {
          title: 'Updated Project',
          status: 'completed',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.update('project123', updateProjectDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Project with ID project123 not found'),
      );
    });
  });

  describe('remove', () => {
    it('should delete a project successfully', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
        candidateProjects: [],
      } as any);
      prismaService.project.delete.mockResolvedValue({
        id: 'project123',
      } as any);

      const result = await service.remove('project123', 'user123');

      expect(result).toEqual({
        id: 'project123',
        message: 'Project deleted successfully',
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.remove('project123', 'user123')).rejects.toThrow(
        new NotFoundException('Project with ID project123 not found'),
      );
    });

    it('should throw ConflictException when project has assigned candidates', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
        candidateProjects: [{ id: 'assignment123' }],
      } as any);

      await expect(service.remove('project123', 'user123')).rejects.toThrow(
        new ConflictException(
          'Cannot delete project with ID project123 because it has assigned candidates. Please remove all candidate assignments first.',
        ),
      );
    });
  });

  describe('assignCandidate', () => {
    const assignCandidateDto: AssignCandidateDto = {
      candidateId: 'candidate123',
      notes: 'Test assignment',
    };

    it('should assign candidate to project successfully', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
      } as any);
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
      } as any);
      prismaService.candidateProjects.findFirst.mockResolvedValue(null);
      prismaService.candidateProjects.create.mockResolvedValue({
        id: 'assignment123',
        candidateId: 'candidate123',
        projectId: 'project123',
        notes: 'Test assignment',
      } as any);
      prismaService.user.findMany.mockResolvedValue([
        {
          id: 'rec1',
          name: 'Recruiter One',
          email: 'rec1@example.com',
          _count: { candidateProjectMaps: 0 },
          userRoles: [{ role: { name: 'RECRUITER' } }],
        },
      ] as any);
      // Stub RoundRobinService.getNextRecruiter on prototype to avoid DB cursor operations
      (RoundRobinService.prototype as any).getNextRecruiter = jest
        .fn()
        .mockResolvedValue({ id: 'rec1', name: 'Recruiter One' });

      const result = await service.assignCandidate(
        'project123',
        assignCandidateDto,
        'user123',
      );

      expect(result.message).toBe('Candidate assigned to project successfully');
      expect(prismaService.candidateProjects.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          candidateId: 'candidate123',
          projectId: 'project123',
          notes: 'Test assignment',
          recruiterId: 'rec1',
          currentProjectStatusId: 1,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.assignCandidate('project123', assignCandidateDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Project with ID project123 not found'),
      );
    });

    it('should throw NotFoundException when candidate does not exist', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
      } as any);
      prismaService.candidate.findUnique.mockResolvedValue(null);

      await expect(
        service.assignCandidate('project123', assignCandidateDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID candidate123 not found'),
      );
    });

    it('should throw ConflictException when candidate is already assigned', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
      } as any);
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
      } as any);
      prismaService.candidateProjects.findFirst.mockResolvedValue({
        id: 'existing123',
      } as any);

      await expect(
        service.assignCandidate('project123', assignCandidateDto, 'user123'),
      ).rejects.toThrow(
        new ConflictException(
          'Candidate candidate123 is already assigned to project project123',
        ),
      );
    });
  });

  describe('getProjectCandidates', () => {
    const mockAssignments = [
      {
        id: 'assignment123',
        candidate: {
          id: 'candidate123',
          name: 'Test Candidate',
          contact: '1234567890',
          email: 'test@example.com',
          currentStatus: 'active',
          experience: 5,
          skills: ['Nursing'],
          expectedSalary: 50000,
          assignedTo: 'user123',
        },
        assignedDate: new Date(),
        verified: false,
        shortlisted: false,
        selected: false,
        notes: 'Test assignment',
      },
    ];

    it('should return project candidates', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
      } as any);
      prismaService.candidateProjects.findMany.mockResolvedValue(
        mockAssignments as any,
      );

      const result = await service.getProjectCandidates('project123');

      expect(result).toEqual(mockAssignments);
      expect(prismaService.candidateProjects.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.getProjectCandidates('project123')).rejects.toThrow(
        new NotFoundException('Project with ID project123 not found'),
      );
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      prismaService.project.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60) // active
        .mockResolvedValueOnce(30) // completed
        .mockResolvedValueOnce(10); // cancelled

      prismaService.project.groupBy.mockResolvedValue([
        { clientId: 'client123', _count: { clientId: 50 } },
        { clientId: 'client456', _count: { clientId: 50 } },
      ] as any);

      prismaService.client.findMany.mockResolvedValue([
        { id: 'client123', name: 'Client client123' },
        { id: 'client456', name: 'Client client456' },
      ] as any);

      prismaService.project.findMany.mockResolvedValue([] as any);

      const result = await service.getProjectStats();

      expect(result).toEqual({
        totalProjects: 100,
        activeProjects: 60,
        completedProjects: 30,
        cancelledProjects: 10,
        projectsByStatus: {
          active: 60,
          completed: 30,
          cancelled: 10,
        },
        projectsByClient: {
          client123: { count: 50, name: 'Client client123' },
          client456: { count: 50, name: 'Client client456' },
        },
        upcomingDeadlines: [],
      });
    });
  });
});
