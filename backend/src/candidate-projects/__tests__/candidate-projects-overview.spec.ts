import { Test, TestingModule } from '@nestjs/testing';
import { CandidateProjectsService } from '../candidate-projects.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ROLE_NAMES } from '../../common/constants/role-ids';

describe('CandidateProjectsService - getProjectOverview role scoping', () => {
  let service: CandidateProjectsService;

  const mockPrisma = {
    candidateProjects: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: {} },
        { provide: OutboxService, useValue: {} },
        { provide: NotificationsGateway, useValue: {} },
      ],
    }).compile();

    service = module.get(CandidateProjectsService);

    mockPrisma.candidateProjects.count.mockResolvedValue(0);
    mockPrisma.candidateProjects.findMany.mockResolvedValue([]);
    mockPrisma.project.findUnique.mockResolvedValue({ title: 'Test Project' });

    jest.clearAllMocks();

    mockPrisma.candidateProjects.count.mockResolvedValue(0);
    mockPrisma.candidateProjects.findMany.mockResolvedValue([]);
    mockPrisma.project.findUnique.mockResolvedValue({ title: 'Test Project' });
  });

  it('adds recruiterId scope for Agent Coordinator without management roles', async () => {
    const ccUserId = 'user-cc';

    await service.getProjectOverview(
      'proj-1',
      {} as any,
      ccUserId,
      [ROLE_NAMES.AGENT_COORDINATOR],
    );

    const findArgs = mockPrisma.candidateProjects.findMany.mock.calls[0]?.[0];
    expect(findArgs.where).toMatchObject({
      projectId: 'proj-1',
      recruiterId: ccUserId,
    });
  });

  it('filters by subStatus name when provided', async () => {
    await service.getProjectOverview(
      'proj-1',
      { subStatus: 'interview_passed' } as any,
      'user-1',
      ['Manager'],
    );

    const findArgs = mockPrisma.candidateProjects.findMany.mock.calls[0]?.[0];
    expect(findArgs.where).toMatchObject({
      projectId: 'proj-1',
      subStatus: { name: 'interview_passed' },
    });
  });

  it('filters by multiple subStatuses when subStatuses is provided', async () => {
    await service.getProjectOverview(
      'proj-1',
      { subStatuses: 'pending_documents,documents_submitted' } as any,
      'user-1',
      ['Manager'],
    );

    const findArgs = mockPrisma.candidateProjects.findMany.mock.calls[0]?.[0];
    expect(findArgs.where).toMatchObject({
      subStatus: { name: { in: ['pending_documents', 'documents_submitted'] } },
    });
  });

  it('does not add recruiterId scope when Agent Coordinator is also Manager', async () => {
    await service.getProjectOverview(
      'proj-1',
      {} as any,
      'user-cc',
      [ROLE_NAMES.AGENT_COORDINATOR, 'Manager'],
    );

    const findArgs = mockPrisma.candidateProjects.findMany.mock.calls[0]?.[0];
    expect(findArgs.where.recruiterId).toBeUndefined();
  });
});
