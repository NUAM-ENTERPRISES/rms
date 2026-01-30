import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - getAllProcessingCandidates progressCount', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        { provide: OutboxService, useValue: {} },
        { provide: HrdRemindersService, useValue: {} },
        { provide: DataFlowRemindersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  it('adds progressCount as percentage based on completed/total steps', async () => {
    const query: any = { page: 1, limit: 10, status: 'in_progress' };

    // Mock candidate list (two processing candidates)
    const candidates = [
      { id: 'pc-1', project: { country: { code: 'US', name: 'United States' } }, updatedAt: new Date() },
      { id: 'pc-2', project: { country: { code: 'NG', name: 'Nigeria' } }, updatedAt: new Date() },
    ];

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue(candidates);
    jest.spyOn(prisma.processingCandidate, 'count' as any).mockResolvedValue(2);
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    // Mock processingStep groupBy totals and completed
    jest.spyOn(prisma.processingStep, 'groupBy' as any)
      .mockImplementationOnce(async () => [
        { processingCandidateId: 'pc-1', _count: { _all: 10 } },
        { processingCandidateId: 'pc-2', _count: { _all: 8 } },
      ])
      .mockImplementationOnce(async () => [
        { processingCandidateId: 'pc-1', _count: { _all: 5 } },
        { processingCandidateId: 'pc-2', _count: { _all: 2 } },
      ]);

    const result = await service.getAllProcessingCandidates(query as any);

    expect(result.candidates).toHaveLength(2);

    const pc1 = result.candidates.find((c: any) => c.id === 'pc-1');
    const pc2 = result.candidates.find((c: any) => c.id === 'pc-2');

    // pc-1: 5/10 => 50%
    expect(pc1.progressCount).toBe(50);

    // pc-2: 2/8 => 25%
    expect(pc2.progressCount).toBe(25);
  });

  it('filters candidates by assigned processing user when userId is provided', async () => {
    const query: any = { page: 1, limit: 10, status: 'assigned' };

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingCandidate, 'count' as any).mockResolvedValue(0);
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    await service.getAllProcessingCandidates(query as any, 'user-123');

    expect(prisma.processingCandidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignedProcessingTeamUserId: 'user-123' }),
      }),
    );
  });

  it('admin api filters by visa_stamped when status=visa_stamped', async () => {
    const query: any = { page: 1, limit: 10, status: 'visa_stamped' };

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingCandidate, 'count' as any)
      .mockResolvedValueOnce(0) // total
      .mockResolvedValueOnce(0) // all count
      .mockResolvedValueOnce(0); // visa count
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    await service.getAllProcessingCandidatesAdmin(query as any);

    expect(prisma.processingCandidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          processingSteps: { some: { template: { key: 'visa' }, status: 'completed' } },
        }),
      }),
    );
  });

  it('admin api supports filterType=visa_stamped', async () => {
    const query: any = { page: 1, limit: 10, filterType: 'visa_stamped' };

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingCandidate, 'count' as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    await service.getAllProcessingCandidatesAdmin(query as any);

    expect(prisma.processingCandidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          processingSteps: { some: { template: { key: 'visa' }, status: 'completed' } },
        }),
      }),
    );
  });

  it('admin api total_processing ignores status filter and returns all processing records', async () => {
    const query: any = { page: 1, limit: 10, filterType: 'total_processing', status: 'completed' };

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingCandidate, 'count' as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    await service.getAllProcessingCandidatesAdmin(query as any);

    expect(prisma.processingCandidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ processingStatus: 'completed' }),
      }),
    );

    // countsWhere should also not include processingStatus when total_processing
    // We validate groupBy called with a where that does not contain processingStatus
    expect(prisma.processingCandidate.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ processingStatus: 'completed' }) }),
    );
  });

  it('admin api returns visa_stamped count in counts', async () => {
    const query: any = { page: 1, limit: 10 };

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingCandidate, 'count' as any)
      .mockResolvedValueOnce(0) // total
      .mockResolvedValueOnce(0) // all count
      .mockResolvedValueOnce(5); // visa count
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    const result = await service.getAllProcessingCandidatesAdmin(query as any);

    expect(result.counts.visa_stamped).toBe(5);
  });

  it('counts.all remains stable regardless of filters (status=visa_stamped or filterType=total_processing)', async () => {
    // Case: status=visa_stamped filter — total (filtered) is 1 but all should be 2
    const query1: any = { page: 1, limit: 10, status: 'visa_stamped' };

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingCandidate, 'count' as any)
      .mockResolvedValueOnce(1) // total (filtered)
      .mockResolvedValueOnce(2) // allCount (base)
      .mockResolvedValueOnce(1); // visa count
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    const res1 = await service.getAllProcessingCandidatesAdmin(query1 as any);

    expect(res1.counts.all).toBe(2);
    expect(res1.counts.visa_stamped).toBe(1);

    // Case: filterType=total_processing — total (filtered) is 2 and all should remain 2
    const query2: any = { page: 1, limit: 10, filterType: 'total_processing' };

    (prisma.processingCandidate.count as jest.Mock).mockClear();
    jest.spyOn(prisma.processingCandidate, 'count' as any)
      .mockResolvedValueOnce(2) // total
      .mockResolvedValueOnce(2) // allCount
      .mockResolvedValueOnce(1); // visa count

    const res2 = await service.getAllProcessingCandidatesAdmin(query2 as any);
    expect(res2.counts.all).toBe(2);
  });

  it('reports 100% progress when processingStatus is completed even if step counts are not fully completed', async () => {
    const query: any = { page: 1, limit: 10 };

    // Simulate one candidate that would otherwise show ~91.7% (11/12) but processingStatus is 'completed'
    const candidates = [{ id: 'pc-1', processingStatus: 'completed', project: { country: { code: 'US', name: 'United States' } }, updatedAt: new Date() }];

    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue(candidates);
    jest.spyOn(prisma.processingCandidate, 'count' as any).mockResolvedValue(1);
    jest.spyOn(prisma.processingCandidate, 'groupBy' as any).mockResolvedValue([]);

    jest.spyOn(prisma.processingStep, 'groupBy' as any)
      .mockImplementationOnce(async () => [ { processingCandidateId: 'pc-1', _count: { _all: 12 } } ])
      .mockImplementationOnce(async () => [ { processingCandidateId: 'pc-1', _count: { _all: 11 } } ]);

    const res = await service.getAllProcessingCandidatesAdmin(query as any);
    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0].progressCount).toBe(100);
  });
});