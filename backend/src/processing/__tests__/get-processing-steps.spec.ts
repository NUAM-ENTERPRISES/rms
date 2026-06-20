import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import { PROJECT_SECTOR } from '../../projects/constants';

describe('ProcessingService - getProcessingSteps', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        OutboxService,
        { provide: ProcessingRemindersService, useValue: {} },
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

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { id: 'cand-1', countryCode: 'QA' },
      project: { id: 'proj-1', countryCode: 'QA', sector: PROJECT_SECTOR.HEALTHCARE },
    });
    // Prevent auto-creation of steps in the test
    jest.spyOn(service, 'createStepsForProcessingCandidate' as any).mockResolvedValue(undefined);

    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue([mockStep]);
    // No candidate offer letters in this scenario
    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([]);

    const out = (await service.getProcessingSteps('pc-1')) as any[];

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

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { id: 'cand-1', countryCode: 'QA' },
      project: { id: 'proj-1', countryCode: 'QA', sector: PROJECT_SECTOR.HEALTHCARE },
      role: { id: 'role-1', roleCatalogId: 'rc-1' },
    });
    jest.spyOn(service, 'createStepsForProcessingCandidate' as any).mockResolvedValue(undefined);

    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue([offerStep]);

    // Mock candidateProjectMap lookup
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue({ id: 'cpm-1', candidateId: 'cand-1', projectId: 'proj-1', roleNeededId: 'role-1' });

    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([
      { id: 'd1', fileName: 'offer.pdf', fileUrl: 'https://s3/off.pdf', createdAt: new Date('2025-01-01T00:00:00Z'), uploadedBy: 'u1', docType: 'offer_letter', verifications: [{ id: 'ver-1', status: 'verified', documentId: 'd1', candidateProjectMapId: 'cpm-1', roleCatalogId: 'rc-1', createdAt: new Date('2025-01-01T00:00:00Z') }] },
    ]);
    jest.spyOn(prisma.user, 'findMany' as any).mockResolvedValue([
      { id: 'u1', name: 'Recruiter One', email: 'recruiter@example.com' },
    ]);

    const out = (await service.getProcessingSteps('pc-1')) as any[];

    expect(Array.isArray(out)).toBe(true);
    const step = out.find((s: any) => s.template?.key === 'offer_letter');
    expect(step).toBeDefined();
    expect(step!.offerLetters).toBeDefined();
    // processing_documents should not be returned in this API
    expect(step!.offerLetters.processing_documents).toBeUndefined();
    // Single candidateDocument should be returned (not an array)
    expect(step!.offerLetters.candidateDocument).toBeDefined();

    const doc = step!.offerLetters.candidateDocument;
    expect(doc.fileName).toBe('offer.pdf');
    expect(doc.uploadedByUser).toEqual({
      id: 'u1',
      name: 'Recruiter One',
      email: 'recruiter@example.com',
    });
    expect(doc.verifications[0].id).toBe('ver-1');
    expect(doc.verifications[0].candidateProjectMapId).toBe('cpm-1');
    // Nested project/role objects should NOT be present in the verification shape
    expect(doc.verifications[0].candidateProjectMap).toBeUndefined();
    expect(doc.verifications[0].roleCatalog).toBeUndefined();
  });

  it('filters out steps not allowed for non-healthcare sector', async () => {
    const hrdStep = {
      id: 'hrd-step',
      processingCandidateId: 'pc-1',
      templateId: 'tmpl-hrd',
      template: { key: 'hrd', order: 2 },
      status: 'pending',
      documents: [],
    };
    const dataFlowStep = {
      id: 'df-step',
      processingCandidateId: 'pc-1',
      templateId: 'tmpl-df',
      template: { key: 'data_flow', order: 3 },
      status: 'pending',
      documents: [],
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { id: 'cand-1', countryCode: 'QA' },
      project: { id: 'proj-1', countryCode: 'QA', sector: PROJECT_SECTOR.NON_HEALTHCARE },
      role: { id: 'role-1', roleCatalogId: 'rc-1' },
    });
    jest.spyOn(service, 'createStepsForProcessingCandidate' as any).mockResolvedValue(undefined);
    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue([hrdStep, dataFlowStep]);
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue(null);
    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([]);

    const out = (await service.getProcessingSteps('pc-1')) as any[];

    expect(out).toHaveLength(1);
    expect((out[0] as any).template.key).toBe('hrd');
  });

  it('returns cancelled steps when processing candidate status is cancelled', async () => {
    const completedStep = {
      id: 'offer-step',
      processingCandidateId: 'pc-1',
      templateId: 'tmpl-offer',
      template: { key: 'offer_letter', order: 0 },
      status: 'completed',
      documents: [],
    };
    const cancelledStep = {
      id: 'hrd-step',
      processingCandidateId: 'pc-1',
      templateId: 'tmpl-hrd',
      template: { key: 'hrd', order: 2 },
      status: 'cancelled',
      documents: [],
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      processingStatus: 'cancelled',
      candidate: { id: 'cand-1', countryCode: 'QA' },
      project: { id: 'proj-1', countryCode: 'QA', sector: PROJECT_SECTOR.HEALTHCARE },
      role: { id: 'role-1', roleCatalogId: 'rc-1' },
    });
    jest.spyOn(service, 'createStepsForProcessingCandidate' as any).mockResolvedValue(undefined);
    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue([
      completedStep,
      cancelledStep,
    ]);
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue(null);
    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([]);

    const out = (await service.getProcessingSteps('pc-1')) as any[];

    expect(out).toHaveLength(2);
    expect(out.map((s) => s.template.key).sort()).toEqual(['hrd', 'offer_letter']);
  });
});