import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - submitProcessingStepDate', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        OutboxService,
        { provide: HrdRemindersService, useValue: { createHRDReminder: jest.fn() } },
        { provide: DataFlowRemindersService, useValue: { createDataFlowReminder: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  it('throws when step not found', async () => {
    jest.spyOn(prisma.processingStep, 'findUnique' as any).mockResolvedValue(null);
    await expect(service.submitProcessingStepDate('nonexistent', {}, 'user1')).rejects.toThrow();
  });

  it('creates history with recruiter and notes on submit', async () => {
    const step = {
      id: 'step-1',
      processingCandidateId: 'pc-1',
      template: { key: 'hrd' },
      status: 'pending',
      submittedAt: null,
      processingCandidate: { candidateId: 'cand-1', projectId: 'proj-1', roleNeededId: 'role-1' },
    };

    jest.spyOn(prisma.processingStep, 'findUnique' as any).mockResolvedValue(step);

    const txMock = {
      processingStep: { update: jest.fn().mockResolvedValue(undefined) },
      processingHistory: { create: jest.fn().mockResolvedValue(undefined) },
      candidateProjects: { findFirst: jest.fn().mockResolvedValue({ recruiterId: 'recr-1' }) },
    };

    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    await service.submitProcessingStepDate('step-1', { submittedAt: '2026-01-16T00:00:00.000Z' }, 'user-1');

    expect(txMock.processingStep.update).toHaveBeenCalledWith({ where: { id: 'step-1' }, data: expect.objectContaining({ submittedAt: expect.any(Date), status: 'in_progress' }) });

    expect(txMock.processingHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        processingCandidateId: 'pc-1',
        status: 'in_progress',
        step: 'hrd',
        changedById: 'user-1',
        recruiterId: 'recr-1',
        notes: 'hrd submitted date submitted',
      }),
    });
  });
});
