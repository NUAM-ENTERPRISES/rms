import { Test } from '@nestjs/testing';
import { DocumentsService } from '../documents.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingService } from '../../processing/processing.service';

describe('DocumentsService - verifyOfferLetter', () => {
  let service: DocumentsService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        OutboxService,
        { provide: 'ProcessingService', useValue: {} },
        { provide: ProcessingService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
  });

  it('completes offer_letter step but does NOT start HRD automatically', async () => {
    const verifyDto: any = { documentId: 'doc-1', candidateProjectMapId: 'cpm-1' };

    // Basic document and mappings
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({ id: 'doc-1', uploadedBy: 'u1', docType: 'offer_letter' });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({ id: 'cpm-1' });

    // Simulate update of verification and other history updates
    const updatedVerification = { id: 'ver-1', documentId: 'doc-1' };

    const txMock: any = {
      document: { update: jest.fn().mockResolvedValue({ id: 'doc-1', status: 'verified' }) },
      candidateProjectDocumentVerification: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(updatedVerification),
        update: jest.fn().mockResolvedValue(updatedVerification),
      },
      documentVerificationHistory: { create: jest.fn().mockResolvedValue(undefined) },
      candidateProjects: { update: jest.fn().mockResolvedValue(undefined) },
      candidateProjectStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
      processingCandidate: { findFirst: jest.fn().mockResolvedValue({ id: 'pc-1' }), update: jest.fn().mockResolvedValue({ id: 'pc-1', processingStatus: 'in_progress' }) },
      processingStep: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where && where.template && where.template.key === 'offer_letter') return { id: 'step-offer', template: { key: 'offer_letter' } };
          if (where && where.template && where.template.key === 'hrd') return { id: 'step-hrd', template: { key: 'hrd' }, status: 'pending' };
          return null;
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      processingStepDocument: { create: jest.fn().mockResolvedValue(undefined) },
      processingHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };

    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    const result = await service.verifyOfferLetter(verifyDto, 'user-1');

    expect(txMock.processingStep.update).toHaveBeenCalledWith({ where: { id: 'step-offer' }, data: { status: 'completed', completedAt: expect.any(Date) } });

    // Ensure processingHistory recorded offer_letter completion
    expect(txMock.processingHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ processingCandidateId: 'pc-1', status: 'completed', step: 'offer_letter' }),
    });

    // Ensure we updated the processing candidate to in_progress (processing started)
    expect(txMock.processingCandidate.update).toHaveBeenCalledWith({
      where: { id: 'pc-1' },
      data: { processingStatus: 'in_progress', step: 'offer_letter' },
    });

    // Ensure we did NOT mark HRD as in_progress
    expect(txMock.processingHistory.create).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ step: 'hrd', status: 'in_progress' }) }));

    // Response message clarifies HRD won't be auto-started
    expect(result.message).toMatch(/HRD will only start/i);
  });
});