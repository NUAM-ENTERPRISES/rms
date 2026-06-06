import { Test, TestingModule } from '@nestjs/testing';
import { ProjectCoordinatorDashboardService } from '../project-coordinator-dashboard.service';
import { PrismaService } from '../../database/prisma.service';

describe('ProjectCoordinatorDashboardService', () => {
  let service: ProjectCoordinatorDashboardService;
  let prisma: {
    project: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    client: {
      findMany: jest.Mock;
    };
    candidateProjects: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const coordinatorA = 'coord-a';
  const coordinatorB = 'coord-b';

  beforeEach(async () => {
    prisma = {
      project: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      client: {
        findMany: jest.fn(),
      },
      candidateProjects: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectCoordinatorDashboardService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(ProjectCoordinatorDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns scoped stats for the coordinator', async () => {
    prisma.client.findMany.mockResolvedValue([{ id: 'c1' }]);
    prisma.project.findMany.mockImplementation((args: { where?: { createdBy?: string; clientId?: unknown }; select?: { id?: boolean; clientId?: boolean }; distinct?: string[] }) => {
      if (args?.distinct?.includes('clientId')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([{ id: 'p1' }, { id: 'p2' }]);
    });
    prisma.project.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prisma.candidateProjects.count.mockResolvedValue(12);

    const result = await service.getStats(coordinatorA);

    expect(result.data).toEqual({
      myClients: 1,
      activeProjects: 3,
      completedProjects: 1,
      candidatesFilled: 12,
    });
  });

  it('scopes project role hiring status to coordinator-owned active projects', async () => {
    prisma.project.count.mockResolvedValue(1);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        title: 'ICU Nurses',
        rolesNeeded: [{ id: 'r1', designation: 'Nurse', quantity: 5 }],
      },
    ]);
    prisma.candidateProjects.findMany.mockResolvedValue([
      { projectId: 'p1', roleNeededId: 'r1' },
      { projectId: 'p1', roleNeededId: 'r1' },
    ]);

    const result = await service.getProjectRoleHiringStatus(coordinatorA);

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdBy: coordinatorA,
          status: 'active',
        }),
      }),
    );
    expect(result.data.projectRoles[0]).toEqual({
      projectId: 'p1',
      projectName: 'ICU Nurses',
      roles: [{ role: 'Nurse', required: 5, filled: 2 }],
    });
  });

  it('does not include another coordinator projects in client projects', async () => {
    prisma.project.count.mockResolvedValue(0);
    prisma.project.findMany.mockResolvedValue([]);

    await service.getClientProjects(coordinatorB);

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdBy: coordinatorB },
      }),
    );
    expect(prisma.project.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdBy: coordinatorA },
      }),
    );
  });
});
