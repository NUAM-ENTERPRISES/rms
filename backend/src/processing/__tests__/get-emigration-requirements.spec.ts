import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - getEmigrationRequirements', () => {
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

  it('returns HRD-shaped payload for emigration step (empty/configured)', async () => {
    const pcId = 'pc-1';
    const template = { id: 'tpl-emig', key: 'emigration' };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: pcId,
      processingStatus: 'in_progress',
      candidate: { id: 'cand-1', firstName: 'A', lastName: 'B', mobileNumber: 'x', countryCode: 'SA' },
      project: { id: 'proj-1', title: 'P', countryCode: 'SA' },
      role: null,
    });

    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue(template);

    // No configured emigration-specific documents for many deployments — simulate an empty rule-set
    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([]);

    // Emigration step exists but has no documents attached
    jest.spyOn(prisma.processingStep, 'findFirst' as any).mockResolvedValue({
      id: 'step-1',
      status: 'pending',
      documents: [],
      template,
    });

    // Candidate documents empty
    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([]);

    const res = await service.getEmigrationRequirements(pcId);

    // Structural parity with HRD response
    expect(res).toHaveProperty('requiredDocuments');
    expect(res).toHaveProperty('processing_documents');
    expect(res).toHaveProperty('candidateDocuments');
    expect(res).toHaveProperty('counts');
    expect(res.counts).toHaveProperty('totalConfigured');
    expect(Array.isArray(res.requiredDocuments)).toBe(true);
    expect(res.processing_documents).toEqual([]);
    expect(res.candidateDocuments).toEqual([]);
    // step-specific flag present
    expect(res).toHaveProperty('isEmigrationCompleted');
  });
});
