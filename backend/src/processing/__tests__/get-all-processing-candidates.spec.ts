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
});