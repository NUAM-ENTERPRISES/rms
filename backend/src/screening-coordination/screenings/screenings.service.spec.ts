import { NotFoundException } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';

describe('ScreeningsService.getScreeningHistory', () => {
  let service: ScreeningsService;
  const mockPrisma: any = {
    candidateProjects: { findUnique: jest.fn() },
    interviewStatusHistory: { count: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCandidateProjectsService = {} as any;
    const mockOutboxService = {} as any;
    const mockTrainingService = {} as any;
    service = new ScreeningsService(mockPrisma as any, mockCandidateProjectsService, mockOutboxService, mockTrainingService);
  });

  it('throws NotFoundException when candidate-project does not exist', async () => {
    mockPrisma.candidateProjects.findUnique.mockResolvedValue(null);

    await expect(service.getScreeningHistory('nonexistent', { page: 1, limit: 10 })).rejects.toThrow(NotFoundException);
    expect(mockPrisma.candidateProjects.findUnique).toHaveBeenCalledWith({ where: { id: 'nonexistent' } });
  });

  it('returns paginated history when candidate-project exists', async () => {
    mockPrisma.candidateProjects.findUnique.mockResolvedValue({ id: 'cp1' });
    mockPrisma.interviewStatusHistory.count.mockResolvedValue(2);
    mockPrisma.interviewStatusHistory.findMany.mockResolvedValue([
      { id: 'h1', status: 'scheduled', statusAt: new Date(), changedBy: { id: 'u1', name: 'User One' } },
      { id: 'h2', status: 'completed', statusAt: new Date(), changedBy: { id: 'u2', name: 'User Two' } },
    ]);

    const res = await service.getScreeningHistory('cp1', { page: 1, limit: 10 });

    expect(res.success).toBe(true);
    expect(res.data.pagination.total).toBe(2);
    expect(res.data.items).toHaveLength(2);
    expect(mockPrisma.interviewStatusHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        candidateProjectMapId: 'cp1',
        interviewType: { in: ['screening', 'training'] },
      }),
    }));
  });
});

describe('ScreeningsService.findAll', () => {
  let service: ScreeningsService;
  const mockPrisma: any = {
    screening: { count: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCandidateProjectsService = {} as any;
    const mockOutboxService = {} as any;
    const mockTrainingService = {} as any;
    service = new ScreeningsService(mockPrisma as any, mockCandidateProjectsService, mockOutboxService, mockTrainingService);
  });

  it('applies strict training_scheduled filtering and does not include completed training sessions alone', async () => {
    mockPrisma.screening.count.mockResolvedValue(0);
    mockPrisma.screening.findMany.mockResolvedValue([]);

    await service.findAll({ status: 'training_scheduled', decision: 'needs_training', page: 1, limit: 10 } as any);

    expect(mockPrisma.screening.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        decision: 'needs_training',
        OR: expect.arrayContaining([
          { candidateProjectMap: { subStatus: { name: 'training_scheduled' } } },
          { trainingAssignments: { some: { status: { in: ['scheduled', 'in_progress'] } } } },
        ]),
      }),
    }));

    const orClause = mockPrisma.screening.count.mock.calls[0][0].where.OR;
    expect(orClause).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ trainingAssignments: { some: { trainingSessions: { some: {} } } } }),
    ]));
  });
});
