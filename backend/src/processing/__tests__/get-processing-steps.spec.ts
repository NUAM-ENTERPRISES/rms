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
    // No candidate offer letters in this scenario
    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([]);

    const out = await service.getProcessingSteps('pc-1');

    expect(Array.isArray(out)).toBe(true);
    expect(out[0].documents).toBeUndefined();
    expect(out[0].requiredDocuments).toBeUndefined();
    expect(out[0].template).toBeDefined();
    expect(out[0].id).toBe('step-1');
  });

  it('includes offer_letter processing and candidate documents when offer step exists', async () => {
    const offerStep = {
      id: 'offer-step',
      processingCandidateId: 'pc-1',
      templateId: 'tmpl-offer',
      template: { key: 'offer_letter', order: 0 },
      status: 'assigned',
      documents: [
        { id: 'psd-1', processingStepId: 'offer-step', uploadedBy: 'u1', createdAt: new Date('2025-01-01T00:00:00Z'), status: 'verified', notes: 'ok', candidateProjectDocumentVerification: { id: 'ver-1', documentId: 'd1', document: { id: 'd1', docType: 'offer_letter', fileName: 'offer.pdf' } } },
      ],
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({ id: 'pc-1', candidate: { id: 'cand-1', countryCode: 'QA' }, project: { id: 'proj-1', countryCode: 'QA' }, role: { id: 'role-1', roleCatalogId: 'rc-1' } });
    jest.spyOn(service, 'createStepsForProcessingCandidate' as any).mockResolvedValue(undefined);

    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue([offerStep]);

    // Mock candidateProjectMap lookup
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue({ id: 'cpm-1', candidateId: 'cand-1', projectId: 'proj-1', roleNeededId: 'role-1' });

    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([
      { id: 'd1', fileName: 'offer.pdf', fileUrl: 'https://s3/off.pdf', createdAt: new Date('2025-01-01T00:00:00Z'), uploadedBy: 'u1', docType: 'offer_letter', verifications: [{ id: 'ver-1', status: 'verified', documentId: 'd1', candidateProjectMapId: 'cpm-1', roleCatalogId: 'rc-1', createdAt: new Date('2025-01-01T00:00:00Z') }] },
    ]);

    const out = await service.getProcessingSteps('pc-1');

    expect(Array.isArray(out)).toBe(true);
    const step = out.find((s: any) => s.template?.key === 'offer_letter');
    expect(step).toBeDefined();
    expect(step.offerLetters).toBeDefined();
    // processing_documents should not be returned in this API
    expect(step.offerLetters.processing_documents).toBeUndefined();
    // Single candidateDocument should be returned (not an array)
    expect(step.offerLetters.candidateDocument).toBeDefined();

    const doc = step.offerLetters.candidateDocument;
    expect(doc.fileName).toBe('offer.pdf');
    expect(doc.verifications[0].id).toBe('ver-1');
    expect(doc.verifications[0].candidateProjectMapId).toBe('cpm-1');
    // Nested project/role objects should NOT be present in the verification shape
    expect(doc.verifications[0].candidateProjectMap).toBeUndefined();
    expect(doc.verifications[0].roleCatalog).toBeUndefined();
  });
});