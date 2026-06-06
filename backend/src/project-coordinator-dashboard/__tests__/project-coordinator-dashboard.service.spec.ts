import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectCoordinatorDashboardService } from '../project-coordinator-dashboard.service';
import { PrismaService } from '../../database/prisma.service';

describe('ProjectCoordinatorDashboardService', () => {
  let service: ProjectCoordinatorDashboardService;
  let prisma: {
    project: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
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
        findFirst: jest.fn(),
        findUnique: jest.fn(),
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

  it('returns only coordinator-owned projects from my-projects', async () => {
    prisma.project.count.mockResolvedValue(1);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        title: 'ICU Nurses',
        status: 'active',
        client: { id: 'c1', name: 'City Hospital' },
      },
    ]);

    const result = await service.getMyProjects(coordinatorB);

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdBy: coordinatorB },
      }),
    );
    expect(result.data.projects).toEqual([
      {
        projectId: 'p1',
        projectName: 'ICU Nurses',
        clientName: 'City Hospital',
        status: 'active',
      },
    ]);
  });

  it('returns pipeline stage counts for an owned project', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: 'p1',
      title: 'ICU Nurses',
      status: 'active',
      client: { id: 'c1', name: 'City Hospital' },
    });
    prisma.candidateProjects.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const result = await service.getProjectPipeline(coordinatorA, {
      projectId: 'p1',
    });

    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1', createdBy: coordinatorA },
      }),
    );
    expect(result.data.pipeline).toEqual({
      total: 10,
      nominated: 3,
      documents: 2,
      interview: 2,
      processing: 2,
      deployed: 1,
    });
    expect(result.data.stages).toHaveLength(5);
    expect(result.data.stages[0]).toMatchObject({
      key: 'nominated',
      label: 'Nominated',
      count: 3,
    });
  });

  it('throws ForbiddenException when accessing another coordinator project pipeline', async () => {
    prisma.project.findFirst.mockResolvedValue(null);
    prisma.project.findUnique.mockResolvedValue({ id: 'p1' });

    await expect(
      service.getProjectPipeline(coordinatorB, { projectId: 'p1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when project does not exist', async () => {
    prisma.project.findFirst.mockResolvedValue(null);
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(
      service.getProjectPipeline(coordinatorA, { projectId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });
});
