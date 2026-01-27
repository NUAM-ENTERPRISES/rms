import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - getProcessingSteps', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        OutboxService,
        { provide: HrdRemindersService, useValue: {} },
        { provide: DataFlowRemindersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  it('does not return documents or requiredDocuments in steps payload', async () => {
    const mockStep = {
      id: 'step-1',
      processingCandidateId: 'pc-1',
      templateId: 'tmpl-1',
      template: { key: 'hrd', order: 1 },
      status: 'assigned',
      documents: [
        { id: 'doclink-1', candidateProjectDocumentVerification: { id: 'ver-1', document: { id: 'd1', docType: 'passport' } } },
      ],
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({ id: 'pc-1', candidate: { id: 'cand-1', countryCode: 'QA' }, project: { id: 'proj-1', countryCode: 'QA' } });
    // Prevent auto-creation of steps in the test
    jest.spyOn(service, 'createStepsForProcessingCandidate' as any).mockResolvedValue(undefined);

    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue([mockStep]);

    const out = await service.getProcessingSteps('pc-1');

    expect(Array.isArray(out)).toBe(true);
    expect(out[0].documents).toBeUndefined();
    expect(out[0].requiredDocuments).toBeUndefined();
    expect(out[0].template).toBeDefined();
    expect(out[0].id).toBe('step-1');
  });
});