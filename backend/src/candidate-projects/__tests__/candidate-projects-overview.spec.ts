import { Test, TestingModule } from '@nestjs/testing';
import { CandidateProjectsService } from '../candidate-projects.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { OutboxService } from '../../notifications/outbox.service';

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

  it('adds recruiterId scope for Client Coordinator without management roles', async () => {
    const ccUserId = 'user-cc';

    await service.getProjectOverview('proj-1', {} as any, ccUserId, ['Client Coordinator']);

    const findArgs = mockPrisma.candidateProjects.findMany.mock.calls[0]?.[0];
    expect(findArgs.where).toMatchObject({
      projectId: 'proj-1',
      recruiterId: ccUserId,
    });
  });

  it('does not add recruiterId scope when Client Coordinator is also Manager', async () => {
    await service.getProjectOverview(
      'proj-1',
      {} as any,
      'user-cc',
      ['Client Coordinator', 'Manager'],
    );

    const findArgs = mockPrisma.candidateProjects.findMany.mock.calls[0]?.[0];
    expect(findArgs.where.recruiterId).toBeUndefined();
  });
});
