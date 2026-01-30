import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - getProcessingDetailsById progressCount', () => {
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

  it('returns progressCount computed from processing steps', async () => {
    const proc = {
      id: 'pc-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
      role: { id: 'r-1' },
      project: { country: { code: 'US', name: 'United States' } },
      updatedAt: new Date(),
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(proc);

    // total steps = 12, completed = 6 => 50%
    jest.spyOn(prisma.processingStep, 'count' as any)
      .mockImplementationOnce(async () => 12)
      .mockImplementationOnce(async () => 6);

    const result = await service.getProcessingDetailsById('pc-1');

    expect(result).toBeDefined();
    expect(result.progressCount).toBe(50);
  });

  it('forces progressCount to 100 when processingStatus is completed', async () => {
    const proc = {
      id: 'pc-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
      role: { id: 'r-1' },
      project: { country: { code: 'US', name: 'United States' } },
      updatedAt: new Date(),
      processingStatus: 'completed',
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(proc);

    // total steps = 12, completed = 11 => ~92 but should be reported as 100
    jest.spyOn(prisma.processingStep, 'count' as any)
      .mockImplementationOnce(async () => 12)
      .mockImplementationOnce(async () => 11);

    const result = await service.getProcessingDetailsById('pc-1');

    expect(result).toBeDefined();
    expect(result.progressCount).toBe(100);
  });
});