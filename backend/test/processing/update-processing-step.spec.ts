import { Test } from '@nestjs/testing';
import { ProcessingService } from '../../src/processing/processing.service';
import { PrismaService } from '../../src/database/prisma.service';
import { OutboxService } from '../../src/notifications/outbox.service';

describe('ProcessingService - updateProcessingStep', () => {
  let service: ProcessingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ProcessingService, PrismaService, OutboxService],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  it('updates eligibility fields for step', async () => {
    const step = {
      id: 'step-1',
      processingCandidateId: 'pc-1',
      template: { key: 'eligibility' },
      status: 'pending',
      processingCandidate: { candidateId: 'cand-1', projectId: 'proj-1', roleNeededId: 'role-1' },
    };

    jest.spyOn(prisma.processingStep, 'findUnique' as any).mockResolvedValue(step);

    const txMock = {
      processingStep: { update: jest.fn().mockResolvedValue(undefined) },
      processingHistory: { create: jest.fn().mockResolvedValue(undefined) },
      candidateProjects: { findFirst: jest.fn().mockResolvedValue({ recruiterId: 'recr-1' }) },
    };

    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb) => cb(txMock));

    await service.updateProcessingStep('step-1', {
      eligibilityIssuedAt: '2026-04-01T00:00:00Z',
      eligibilityValidAt: '2027-04-01T00:00:00Z',
      eligibilityDuration: '12 months',
    }, 'user-1');

    expect(txMock.processingStep.update).toHaveBeenCalledWith({
      where: { id: 'step-1' },
      data: expect.objectContaining({
        eligibilityIssuedAt: new Date('2026-04-01T00:00:00Z'),
        eligibilityValidAt: new Date('2027-04-01T00:00:00Z'),
        eligibilityDuration: '12 months',
      }),
    });

    expect(txMock.processingHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        processingCandidateId: 'pc-1',
        status: 'pending',
        step: 'eligibility',
        changedById: 'user-1',
      }),
    });
  });
});