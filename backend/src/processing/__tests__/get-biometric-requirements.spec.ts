import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - getBiometricRequirements', () => {
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

  it('returns HRD-shaped payload for biometric step', async () => {
    const pcId = 'pc-1';
    const template = { id: 'tpl-bio', key: 'biometrics' };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: pcId,
      processingStatus: 'in_progress',
      candidate: { id: 'cand-1', firstName: 'A', lastName: 'B', mobileNumber: 'x', countryCode: 'SA' },
      project: { id: 'proj-1', title: 'P', countryCode: 'SA' },
      role: null,
    });

    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue(template);

    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([
      { docType: 'passport_copy', label: 'Passport Copy', mandatory: true, countryCode: 'ALL' },
      { docType: 'medical_fitness', label: 'Medical Fitness', mandatory: true, countryCode: 'ALL' },
    ]);

    jest.spyOn(prisma.processingStep, 'findFirst' as any).mockResolvedValue({
      id: 'step-1',
      status: 'in_progress',
      documents: [
        { id: 'psd-1', candidateProjectDocumentVerification: { id: 'ver-1', status: 'verified', document: { docType: 'passport_copy' }, createdAt: new Date(), updatedAt: new Date() }, uploadedBy: 'u1', status: 'verified', createdAt: new Date(), updatedAt: new Date() },
      ],
      template,
    });

    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([
      { id: 'doc-1', docType: 'medical_fitness', isDeleted: false, createdAt: new Date(), verifications: [] },
    ]);

    const res = await service.getBiometricRequirements(pcId);

    expect(res).toHaveProperty('requiredDocuments');
    expect(res.requiredDocuments).toEqual(expect.arrayContaining([expect.objectContaining({ docType: 'passport_copy' })]));
    expect(res).toHaveProperty('processing_documents');
    expect(res.processing_documents.length).toBeGreaterThanOrEqual(1);
    expect(res).toHaveProperty('candidateDocuments');
    expect(res.counts).toHaveProperty('totalConfigured');
  });
});
