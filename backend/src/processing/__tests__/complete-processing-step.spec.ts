import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - completeProcessingStep (medical)', () => {
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

  it('throws when isMedicalPassed is not provided for medical step', async () => {
    jest.spyOn(prisma.processingStep, 'findUnique' as any).mockResolvedValue({
      id: 'step-1',
      status: 'in_progress',
      template: { key: 'medical', label: 'Medical' },
      processingCandidateId: 'pc-1',
    });

    await expect(service.completeProcessingStep('step-1', 'user-1', {} as any)).rejects.toThrow();
  });

  it('persists mofaNumber and isMedicalPassed and completes when medical passed', async () => {
    const step = {
      id: 'step-1',
      status: 'in_progress',
      template: { key: 'medical', label: 'Medical' },
      processingCandidateId: 'pc-1',
      processingCandidate: { candidateId: 'cand-1', projectId: 'proj-1', roleNeededId: 'role-1' },
    };

    jest.spyOn(prisma.processingStep, 'findUnique' as any).mockResolvedValue(step);

    const txMock = {
      processingStep: { update: jest.fn().mockResolvedValue(undefined), findFirst: jest.fn().mockResolvedValue(null) },
      processingHistory: { create: jest.fn().mockResolvedValue(undefined) },
      candidateProjects: { findFirst: jest.fn().mockResolvedValue({ recruiterId: 'recr-1' }) },
      processingCandidate: { update: jest.fn().mockResolvedValue(undefined) },
    };

    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    await service.completeProcessingStep('step-1', 'user-1', { isMedicalPassed: true, mofaNumber: 'MOFA-123', notes: 'Checked at clinic A' } as any);

    expect(txMock.processingStep.update).toHaveBeenCalledWith({
      where: { id: 'step-1' },
      data: expect.objectContaining({ status: 'completed', isMedicalPassed: true, mofaNumber: 'MOFA-123' }),
    });

    expect(txMock.processingHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        processingCandidateId: 'pc-1',
        status: 'completed',
        step: 'medical',
        changedById: 'user-1',
        notes: expect.stringContaining('Checked at clinic A'),
      }),
    });
  });

  it('persists medical result then cancels processing when medical failed', async () => {
    const step = {
      id: 'step-1',
      status: 'in_progress',
      template: { key: 'medical', label: 'Medical' },
      processingCandidateId: 'pc-1',
    };

    jest.spyOn(prisma.processingStep, 'findUnique' as any).mockResolvedValue(step);
    const updateSpy = jest.spyOn(prisma.processingStep, 'update' as any).mockResolvedValue(undefined);

    const cancelSpy = jest.spyOn(ProcessingService.prototype as any, 'cancelProcessingStep').mockResolvedValue({ success: true, message: 'cancelled' });

    const res = await service.completeProcessingStep('step-1', 'user-1', { isMedicalPassed: false, mofaNumber: 'MOFA-ERR', notes: 'Candidate fainted' } as any);

    expect(updateSpy).toHaveBeenCalledWith({ where: { id: 'step-1' }, data: { mofaNumber: 'MOFA-ERR', isMedicalPassed: false } });
    expect(cancelSpy).toHaveBeenCalledWith('step-1', 'user-1', expect.stringContaining('Candidate fainted'));
    expect(res).toEqual(expect.objectContaining({ success: true }));
  });
});
