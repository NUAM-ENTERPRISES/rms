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


// additional tests for reupload behaviour

describe('DocumentsService - reupload behaviour', () => {
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

  it('flags verified verification and creates new document/verification when reuploading', async () => {
    const documentId = 'doc-old';
    const cpmId = 'cpm-1';
    const userId = 'u1';
    const existingVer = { id: 'ver-old', status: 'verified' };

    // stub lookups
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({ id: documentId, candidateId: 'cand-1', docType: 'resume', roleCatalogId: 'role-1' });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({ id: cpmId });

    const txMock: any = {
      candidateProjectDocumentVerification: {
        findUnique: jest.fn().mockResolvedValue(existingVer),
        update: jest.fn().mockResolvedValue({ ...existingVer, isReuploaded: true }),
        create: jest.fn().mockResolvedValue({ id: 'ver-new' }),
      },
      documentVerificationHistory: { create: jest.fn().mockResolvedValue(undefined) },
      document: {
        create: jest.fn().mockResolvedValue({ id: 'doc-new' }),
        update: jest.fn(),
      },
    };

    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    const result = await service.reupload(documentId, {
      candidateProjectMapId: cpmId,
      fileName: 'new.pdf',
      fileUrl: 'http://x',
    } as any, userId);

    // old verification was flagged
    expect(txMock.candidateProjectDocumentVerification.update).toHaveBeenCalledWith({
      where: { id: existingVer.id },
      data: { isReuploaded: true },
    });

    // a new document + verification should be created
    expect(txMock.document.create).toHaveBeenCalled();
    expect(txMock.candidateProjectDocumentVerification.create).toHaveBeenCalled();
    expect(result.verification).toBeDefined();
  });

  it('overwrites document if previous status was not verified', async () => {
    const documentId = 'doc-old';
    const cpmId = 'cpm-1';
    const userId = 'u1';
    const existingVer = { id: 'ver-old', status: 'pending' };

    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({ id: documentId });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({ id: cpmId });

    const txMock: any = {
      candidateProjectDocumentVerification: {
        findUnique: jest.fn().mockResolvedValue(existingVer),
        update: jest.fn().mockResolvedValue(existingVer),
      },
      document: {
        update: jest.fn().mockResolvedValue({ id: documentId, status: 'resubmitted' }),
      },
      documentVerificationHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };
    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    const result = await service.reupload(documentId, {
      candidateProjectMapId: cpmId,
      fileName: 'new.pdf',
      fileUrl: 'http://x',
    } as any, userId);

    expect(txMock.document.update).toHaveBeenCalled();
    expect(txMock.candidateProjectDocumentVerification.update).toHaveBeenCalled();
    expect(result.verification).toBeDefined();
  });
});

// New tests for forwarding -> submitted_to_client status update
describe('DocumentsService - forwardToClient / bulkForwardToClient', () => {
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

    // mock queue so processForwarding doesn't throw
    (service as any).documentForwardQueue = { add: jest.fn().mockResolvedValue(undefined) };
  });

  it('forwardToClient updates candidate-project to submitted_to_client and creates history', async () => {
    const dto: any = {
      candidateId: 'cand-1',
      projectId: 'proj-1',
      recipientEmail: 'client@example.com',
      sendType: 'merged',
    };

    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({ id: 'cand-1' });
    jest.spyOn(prisma.mergedDocument, 'findFirst' as any).mockResolvedValue({ id: 'md-1', fileUrl: 's3://x.pdf' });
    jest.spyOn(prisma.documentForwardHistory, 'create' as any).mockResolvedValue({ id: 'hist-1' });

    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue({ id: 'cpm-1', recruiterId: 'rec-1' });
    jest.spyOn(prisma.candidateProjectMainStatus, 'findFirst' as any).mockResolvedValue({ id: 'main-docs', label: 'Documents' });
    jest.spyOn(prisma.candidateProjectSubStatus, 'findFirst' as any).mockResolvedValue({ id: 'sub-submitted', label: 'Submitted to Client' });
    jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({ name: 'Sender One' });

    const updateSpy = jest.spyOn(prisma.candidateProjects, 'update' as any).mockResolvedValue({ id: 'cpm-1', recruiterId: 'rec-1' });
    const historySpy = jest.spyOn(prisma.candidateProjectStatusHistory, 'create' as any).mockResolvedValue({ id: 'hist-pp-1' });

    const res = await service.forwardToClient(dto, 'user-1');

    expect(updateSpy).toHaveBeenCalledWith({ where: { id: 'cpm-1' }, data: expect.objectContaining({ mainStatusId: 'main-docs', subStatusId: 'sub-submitted' }) });
    expect(historySpy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ candidateProjectMapId: 'cpm-1', mainStatusId: 'main-docs', subStatusId: 'sub-submitted' }) }));
    expect(res).toEqual(expect.objectContaining({ success: true, historyId: 'hist-1' }));
  });

  it('bulkForwardToClient updates multiple candidate-projects when present', async () => {
    const dto: any = {
      recipientEmail: 'client@example.com',
      projectId: 'proj-1',
      notes: 'Bulk send',
      selections: [
        { candidateId: 'cand-1', sendType: 'merged' },
        { candidateId: 'cand-2', sendType: 'merged' },
      ],
    };

    jest.spyOn(prisma.project, 'findUnique' as any).mockResolvedValue({ id: 'proj-1' });
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({});
    jest.spyOn(prisma.mergedDocument, 'findFirst' as any).mockResolvedValue({ id: 'md-1', fileUrl: 's3://x.pdf' });
    jest.spyOn(prisma.documentForwardHistory, 'create' as any).mockResolvedValue({ id: 'hist-1' });

    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue({ id: 'cpm-1', recruiterId: 'rec-1' });
    jest.spyOn(prisma.candidateProjectMainStatus, 'findFirst' as any).mockResolvedValue({ id: 'main-docs', label: 'Documents' });
    jest.spyOn(prisma.candidateProjectSubStatus, 'findFirst' as any).mockResolvedValue({ id: 'sub-submitted', label: 'Submitted to Client' });
    jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({ name: 'Sender One' });

    const updateSpy = jest.spyOn(prisma.candidateProjects, 'update' as any).mockResolvedValue({ id: 'cpm-1', recruiterId: 'rec-1' });
    const historySpy = jest.spyOn(prisma.candidateProjectStatusHistory, 'create' as any).mockResolvedValue({ id: 'hist-pp-1' });

    const res = await service.bulkForwardToClient(dto, 'user-1');

    expect(updateSpy).toHaveBeenCalled();
    expect(historySpy).toHaveBeenCalled();
    expect(res).toEqual(expect.objectContaining({ success: true }));
  });
});