import { NotFoundException } from '@nestjs/common';
import { MockInterviewsService } from './mock-interviews.service';

describe('MockInterviewsService.getMockInterviewHistory', () => {
  let service: MockInterviewsService;
  const mockPrisma: any = {
    candidateProjects: { findUnique: jest.fn() },
    interviewStatusHistory: { count: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MockInterviewsService(mockPrisma as any);
  });

  it('throws NotFoundException when candidate-project does not exist', async () => {
    mockPrisma.candidateProjects.findUnique.mockResolvedValue(null);

    await expect(service.getMockInterviewHistory('nonexistent', { page: 1, limit: 10 })).rejects.toThrow(NotFoundException);
    expect(mockPrisma.candidateProjects.findUnique).toHaveBeenCalledWith({ where: { id: 'nonexistent' } });
  });

  it('returns paginated history when candidate-project exists', async () => {
    mockPrisma.candidateProjects.findUnique.mockResolvedValue({ id: 'cp1' });
    mockPrisma.interviewStatusHistory.count.mockResolvedValue(2);
    mockPrisma.interviewStatusHistory.findMany.mockResolvedValue([
      { id: 'h1', status: 'scheduled', statusAt: new Date(), changedBy: { id: 'u1', name: 'User One' } },
      { id: 'h2', status: 'completed', statusAt: new Date(), changedBy: { id: 'u2', name: 'User Two' } },
    ]);

    const res = await service.getMockInterviewHistory('cp1', { page: 1, limit: 10 });

    expect(res.success).toBe(true);
    expect(res.data.pagination.total).toBe(2);
    expect(res.data.items).toHaveLength(2);
    expect(mockPrisma.interviewStatusHistory.findMany).toHaveBeenCalled();
  });
});
