import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DocumentsService } from '../documents.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingService } from '../../processing/processing.service';
import { UploadService } from '../../upload/upload.service';
import { GoogleDriveService } from '../../google-drive/google-drive.service';

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

describe('DocumentsService - create resume role mapping', () => {
  let service: DocumentsService;
  let prisma: any;
  let outbox: OutboxService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        OutboxService,
        { provide: 'ProcessingService', useValue: {} },
        { provide: ProcessingService, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
    outbox = moduleRef.get(OutboxService);
    jest.spyOn(outbox, 'publishDataSync').mockResolvedValue(undefined as never);
  });

  it('rejects resume upload without roleCatalogId', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({
      id: 'cand-1',
    });

    await expect(
      service.create(
        {
          candidateId: 'cand-1',
          docType: 'resume',
          fileName: 'resume.pdf',
          fileUrl: 'https://example.com/resume.pdf',
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException('roleCatalogId is required for resume/cv documents'),
    );
  });

  it('rejects resume upload with invalid roleCatalogId', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({
      id: 'cand-1',
    });
    jest.spyOn(prisma.roleCatalog, 'findFirst' as any).mockResolvedValue(null);

    await expect(
      service.create(
        {
          candidateId: 'cand-1',
          docType: 'resume',
          fileName: 'resume.pdf',
          fileUrl: 'https://example.com/resume.pdf',
          roleCatalogId: 'invalid-role',
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Valid active roleCatalogId is required for resume/cv documents',
      ),
    );
  });

  it('creates resume when valid active roleCatalogId is provided', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({
      id: 'cand-1',
    });
    jest.spyOn(prisma.roleCatalog, 'findFirst' as any).mockResolvedValue({
      id: 'role-1',
    });
    const createSpy = jest
      .spyOn(prisma.document, 'create' as any)
      .mockResolvedValue({ id: 'doc-1', roleCatalogId: 'role-1' });

    await service.create(
      {
        candidateId: 'cand-1',
        docType: 'resume',
        fileName: 'resume.pdf',
        fileUrl: 'https://example.com/resume.pdf',
        roleCatalogId: 'role-1',
      } as any,
      'user-1',
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          docType: 'resume',
          roleCatalogId: 'role-1',
        }),
      }),
    );
    expect(outbox.publishDataSync).toHaveBeenCalled();
  });
});


// additional tests for reupload behaviour

describe('DocumentsService - reupload behaviour', () => {
  let service: DocumentsService;
  let prisma: any;
  let outbox: OutboxService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        OutboxService,
        { provide: 'ProcessingService', useValue: {} },
        { provide: ProcessingService, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
    outbox = moduleRef.get(OutboxService);
    jest.spyOn(outbox, 'publishDocumentResubmitted').mockResolvedValue(undefined as never);
    jest.spyOn(outbox, 'publishDataSync').mockResolvedValue(undefined as never);
  });

  it('flags verified verification and creates new document/verification when reuploading', async () => {
    const documentId = 'doc-old';
    const cpmId = 'cpm-1';
    const userId = 'u1';
    const existingVer = { id: 'ver-old', status: 'verified' };

    // stub lookups
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({ id: documentId, candidateId: 'cand-1', docType: 'resume', roleCatalogId: 'role-1' });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({ id: cpmId, candidateId: 'cand-1' });
    jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({ name: 'Tester' });
    jest.spyOn(service as any, 'updateCandidateProjectStatus').mockResolvedValue(undefined);
    jest.spyOn(prisma.candidateProjectDocumentVerification, 'findUnique' as any).mockResolvedValue(existingVer);

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
      data: expect.objectContaining({
        isReuploaded: true,
        isDeleted: true,
      }),
    });

    expect(txMock.document.update).toHaveBeenCalledWith({
      where: { id: documentId },
      data: expect.objectContaining({
        isDeleted: true,
      }),
    });

    // a new document + verification should be created
    expect(txMock.document.create).toHaveBeenCalled();
    expect(txMock.candidateProjectDocumentVerification.create).toHaveBeenCalled();
    expect(result.verification).toBeDefined();
  });

  it('rejects reupload when document candidate does not match project map', async () => {
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({
      id: 'doc-1',
      candidateId: 'cand-a',
      docType: 'resume',
    });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({
      id: 'cpm-1',
      candidateId: 'cand-b',
    });

    await expect(
      service.reupload(
        'doc-1',
        {
          candidateProjectMapId: 'cpm-1',
          fileName: 'new.pdf',
          fileUrl: 'http://x',
        } as any,
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
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

describe('DocumentsService - getVerificationCandidates', () => {
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
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
  });

  it('returns candidates with verification_in_progress_document and screening_passed, including latest screening details', async () => {
    jest.spyOn(prisma.candidateProjectSubStatus, 'findMany' as any).mockResolvedValue([
      { id: 'ss-1', name: 'verification_in_progress_document' },
      { id: 'ss-2', name: 'screening_passed' },
    ]);

    const candidateProject = {
      id: 'cpm-1',
      candidate: { id: 'cand-1', firstName: 'Alice', lastName: 'Test', email: 'a@test.com', mobileNumber: '1234', countryCode: '91', profileImage: null },
      project: { id: 'proj-1', title: 'Project A', client: { name: 'Client A' } },
      roleNeeded: { id: 'role-1', designation: 'Dev', roleCatalog: { id: 'rc-1', name: 'Dev', label: 'Developer' } },
      recruiter: { id: 'rec-1', name: 'Rec', email: 'rec@example.com' },
      mainStatus: { label: 'Documents' },
      subStatus: { name: 'screening_passed', label: 'Screening Passed' },
      screenings: [{ id: 's-1', status: 'completed', decision: 'approved', overallRating: 4, scheduledTime: new Date(), conductedAt: new Date() }],
      documentVerifications: [],
    };

    jest.spyOn(prisma.candidateProjects, 'findMany' as any).mockResolvedValue([candidateProject]);
    jest.spyOn(prisma.candidateProjects, 'count' as any).mockResolvedValue(1);
    jest.spyOn(prisma.documentForwardHistory, 'findFirst' as any).mockResolvedValue(null);

    const result = await service.getVerificationCandidates({ status: 'verification_in_progress_document', page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].subStatus.name).toBe('screening_passed');
    expect(result.items[0].screening).toEqual(candidateProject.screenings[0]);
    expect(result.counts.pending).toBe(1);
    expect(result.pagination.total).toBe(1);
  });

  it('returns only client_revision_requested candidates when that status is requested', async () => {
    jest.spyOn(prisma.candidateProjectSubStatus, 'findMany' as any).mockImplementation(
      async ({ where }: { where: { name: { in: string[] } } }) =>
        where.name.in.map((name, index) => ({ id: `ss-${index}`, name })),
    );

    const candidateProject = {
      id: 'cpm-revision',
      candidate: { id: 'cand-2', firstName: 'Abhi', lastName: 'Test', email: 'abhi@test.com', mobileNumber: '1234', countryCode: '91', profileImage: null },
      project: { id: 'proj-1', title: 'Project A', client: { name: 'Client A' } },
      roleNeeded: { id: 'role-1', designation: 'Dev', roleCatalog: { id: 'rc-1', name: 'Dev', label: 'Developer' } },
      recruiter: { id: 'rec-1', name: 'Rec', email: 'rec@example.com' },
      mainStatus: { label: 'Documents' },
      subStatus: { name: 'client_revision_requested', label: 'Client Revision Requested' },
      screenings: [],
      documentVerifications: [{ id: 'dv-1', status: 'resubmission_required', document: { id: 'doc-1', docType: 'resume', fileName: 'resume.pdf', status: 'pending', uploadedBy: 'rec-1', createdAt: new Date(), roleCatalog: null } }],
    };

    const findManySpy = jest.spyOn(prisma.candidateProjects, 'findMany' as any).mockResolvedValue([candidateProject]);
    jest.spyOn(prisma.candidateProjects, 'count' as any).mockResolvedValue(1);
    jest.spyOn(prisma.documentForwardHistory, 'findFirst' as any).mockResolvedValue(null);

    const result = await service.getVerificationCandidates({ status: 'client_revision_requested', page: 1, limit: 10 });

    expect(prisma.candidateProjectSubStatus.findMany).toHaveBeenCalledWith({
      where: { name: { in: ['client_revision_requested'] } },
    });
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subStatusId: { in: ['ss-0'] },
        }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].subStatus.name).toBe('client_revision_requested');
    expect(result.counts.client_revision_requested).toBe(1);
  });

  it('attaches documentSummary with missing mandatory documents', async () => {
    jest.spyOn(prisma.candidateProjectSubStatus, 'findMany' as any).mockResolvedValue([
      { id: 'ss-1', name: 'verification_in_progress_document' },
    ]);

    const candidateProject = {
      id: 'cpm-1',
      candidate: { id: 'cand-1', firstName: 'Alice', lastName: 'Test', email: 'a@test.com', mobileNumber: '1234', countryCode: '91', profileImage: null },
      project: {
        id: 'proj-1',
        title: 'Project A',
        introductionVideoRequired: false,
        client: { name: 'Client A' },
        documentRequirements: [
          { docType: 'passport' },
          { docType: 'resume' },
        ],
      },
      roleNeeded: { id: 'role-1', designation: 'Dev', roleCatalog: { id: 'rc-1', name: 'Dev', label: 'Developer' } },
      recruiter: { id: 'rec-1', name: 'Rec', email: 'rec@example.com' },
      mainStatus: { label: 'Documents' },
      subStatus: { name: 'verification_in_progress_document', label: 'In Progress' },
      screenings: [],
      documentVerifications: [
        {
          id: 'dv-1',
          status: 'pending',
          document: { docType: 'passport', fileName: 'passport.pdf' },
        },
      ],
    };

    jest.spyOn(prisma.candidateProjects, 'findMany' as any).mockResolvedValue([candidateProject]);
    jest.spyOn(prisma.candidateProjects, 'count' as any).mockResolvedValue(1);
    jest.spyOn(prisma.documentForwardHistory, 'findFirst' as any).mockResolvedValue(null);

    const result = await service.getVerificationCandidates({
      status: 'verification_in_progress_document',
      page: 1,
      limit: 10,
    });

    expect(result.items[0].documentSummary).toEqual({
      requiredCount: 2,
      submittedCount: 1,
      missingCount: 1,
      missingDocTypes: ['resume'],
    });
  });
});

describe('DocumentsService - requestMissingDocumentUpload', () => {
  let service: DocumentsService;
  let prisma: any;
  let outbox: OutboxService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        OutboxService,
        { provide: 'ProcessingService', useValue: {} },
        { provide: ProcessingService, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
    outbox = moduleRef.get(OutboxService);

    jest.spyOn(outbox, 'publishRecruiterNotification').mockResolvedValue(undefined as never);
  });

  it('notifies recruiter and records history for a missing document', async () => {
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({
      id: 'cpm-1',
      recruiterId: 'rec-1',
      candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
      project: {
        id: 'proj-1',
        title: 'UAE Nurses',
        documentRequirements: [{ docType: 'passport' }, { docType: 'resume' }],
      },
      recruiter: { id: 'rec-1', name: 'Recruiter' },
    });
    jest.spyOn(prisma.candidateProjectDocumentVerification, 'findFirst' as any).mockResolvedValue(null);
    jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({ name: 'Doc Lead' });
    jest.spyOn(prisma.documentVerificationHistory, 'create' as any).mockResolvedValue({ id: 'hist-1' });

    const result = await service.requestMissingDocumentUpload(
      {
        candidateProjectMapId: 'cpm-1',
        docType: 'resume',
        reason: 'Resume was not uploaded before sending for verification.',
      },
      'user-doc',
    );

    expect(result.success).toBe(true);
    expect(prisma.documentVerificationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'upload_requested',
          reason: 'Resume was not uploaded before sending for verification.',
        }),
      }),
    );
    expect(outbox.publishRecruiterNotification).toHaveBeenCalledWith(
      'rec-1',
      expect.stringContaining('Resume'),
      'Missing Document Upload Requested',
      '/recruiter-docs/proj-1/cand-1',
      expect.objectContaining({
        type: 'document_upload_requested',
        docType: 'resume',
      }),
    );
  });

  it('blocks request when document type is already submitted', async () => {
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({
      id: 'cpm-1',
      recruiterId: 'rec-1',
      candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
      project: {
        id: 'proj-1',
        title: 'UAE Nurses',
        documentRequirements: [{ docType: 'resume' }],
      },
      recruiter: { id: 'rec-1', name: 'Recruiter' },
    });
    jest.spyOn(prisma.candidateProjectDocumentVerification, 'findFirst' as any).mockResolvedValue({
      id: 'dv-1',
    });

    await expect(
      service.requestMissingDocumentUpload(
        {
          candidateProjectMapId: 'cpm-1',
          docType: 'resume',
          reason: 'Please upload the missing resume document.',
        },
        'user-doc',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('DocumentsService - reuseDocument missing upload notification', () => {
  let service: DocumentsService;
  let prisma: any;
  let outbox: OutboxService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        OutboxService,
        { provide: 'ProcessingService', useValue: {} },
        { provide: ProcessingService, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
    outbox = moduleRef.get(OutboxService);

    jest.spyOn(outbox, 'publishDataSync').mockResolvedValue(undefined as never);
    jest
      .spyOn(outbox, 'publishDocumentationNotification')
      .mockResolvedValue(undefined as never);
  });

  it('notifies documentation requester when recruiter links a previously requested missing document', async () => {
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({
      id: 'doc-1',
      candidateId: 'cand-1',
      docType: 'resume',
      fileName: 'resume.pdf',
    });
    jest.spyOn(prisma.project, 'findUnique' as any).mockResolvedValue({
      id: 'proj-1',
      title: 'UAE Nurses',
    });
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue({
      id: 'cpm-1',
      recruiterId: 'rec-user',
    });
    jest
      .spyOn(prisma.candidateProjectDocumentVerification, 'findFirst' as any)
      .mockResolvedValue(null);
    jest
      .spyOn(prisma.candidateProjectDocumentVerification, 'create' as any)
      .mockResolvedValue({ id: 'ver-1' });
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Doe',
    });
    jest.spyOn(prisma.documentVerificationHistory, 'findMany' as any).mockResolvedValue([
      {
        action: 'upload_requested',
        performedBy: 'user-doc',
        reason: 'Please upload resume.',
        performedAt: new Date('2026-06-01T10:00:00.000Z'),
        notes: JSON.stringify({
          docType: 'resume',
          candidateProjectMapId: 'cpm-1',
        }),
      },
    ]);

    await service.reuseDocument('doc-1', 'proj-1', 'role-1', 'rec-user');

    expect(outbox.publishDocumentationNotification).toHaveBeenCalledWith(
      'user-doc',
      expect.stringContaining('resume'),
      'Missing Document Uploaded',
      '/candidates/cand-1/documents/proj-1',
      expect.objectContaining({
        type: 'document_missing_uploaded',
        docType: 'resume',
        candidateId: 'cand-1',
        projectId: 'proj-1',
      }),
    );
    expect(outbox.publishDataSync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DocumentVerification',
        candidateId: 'cand-1',
        projectId: 'proj-1',
      }),
    );
    expect(outbox.publishRecruiterNotification).not.toHaveBeenCalled();
  });

  it('notifies recruiter when documentation team uploads a missing document', async () => {
    jest.spyOn(outbox, 'publishRecruiterNotification').mockResolvedValue(undefined as never);

    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({
      id: 'doc-1',
      candidateId: 'cand-1',
      docType: 'resume',
      fileName: 'resume.pdf',
    });
    jest.spyOn(prisma.project, 'findUnique' as any).mockResolvedValue({
      id: 'proj-1',
      title: 'UAE Nurses',
    });
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue({
      id: 'cpm-1',
      recruiterId: 'rec-user',
    });
    jest
      .spyOn(prisma.candidateProjectDocumentVerification, 'findFirst' as any)
      .mockResolvedValue(null);
    jest
      .spyOn(prisma.candidateProjectDocumentVerification, 'create' as any)
      .mockResolvedValue({ id: 'ver-1' });
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Doe',
    });

    await service.reuseDocument('doc-1', 'proj-1', 'role-1', 'user-doc');

    expect(outbox.publishRecruiterNotification).toHaveBeenCalledWith(
      'rec-user',
      expect.stringContaining('resume'),
      'Missing Document Uploaded by Documentation Team',
      '/recruiter-docs/proj-1/cand-1',
      expect.objectContaining({
        type: 'document_uploaded_by_documentation',
        docType: 'resume',
        candidateId: 'cand-1',
        projectId: 'proj-1',
      }),
    );
    expect(outbox.publishDocumentationNotification).not.toHaveBeenCalled();
  });
});

describe('DocumentsService - getVerifiedRejectedDocuments', () => {
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
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
  });

  it('excludes client_revision_requested candidates from verified/rejected results', async () => {
    const findManySpy = jest.spyOn(prisma.candidateProjects, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.candidateProjects, 'count' as any).mockResolvedValue(0);
    jest.spyOn(prisma.candidateProjectStatusHistory, 'findMany' as any).mockResolvedValue([]);

    await service.getVerifiedRejectedDocuments({ status: 'verified', page: 1, limit: 10 });

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subStatus: { name: { in: ['documents_verified', 'submitted_to_client'] } },
        }),
      }),
    );
  });

  it('includes client_revision_requested count in response counts', async () => {
    jest.spyOn(prisma.candidateProjectSubStatus, 'findMany' as any).mockResolvedValue([
      { id: 'ss-pending', name: 'verification_in_progress_document' },
      { id: 'ss-screening', name: 'screening_passed' },
      { id: 'ss-verified', name: 'documents_verified' },
      { id: 'ss-submitted', name: 'submitted_to_client' },
      { id: 'ss-rejected', name: 'rejected_documents' },
      { id: 'ss-client-rev', name: 'client_revision_requested' },
    ]);
    jest.spyOn(prisma.candidateProjects, 'findMany' as any).mockResolvedValue([]);
    jest.spyOn(prisma.candidateProjects, 'count' as any).mockImplementation(async ({ where }: any) => {
      if (where?.subStatusId?.in?.includes('ss-client-rev')) return 2;
      return 0;
    });
    jest.spyOn(prisma.candidateProjectStatusHistory, 'findMany' as any).mockResolvedValue([]);

    const result = await service.getVerifiedRejectedDocuments({ status: 'verified', page: 1, limit: 10 });

    expect(result.counts.client_revision_requested).toBe(2);
  });

  it('flags re-verified candidates after client revision as awaitingResubmitToClient', async () => {
    jest.spyOn(prisma.candidateProjectSubStatus, 'findMany' as any).mockResolvedValue([
      { id: 'ss-pending', name: 'verification_in_progress_document' },
      { id: 'ss-screening', name: 'screening_passed' },
      { id: 'ss-verified', name: 'documents_verified' },
      { id: 'ss-submitted', name: 'submitted_to_client' },
      { id: 'ss-rejected', name: 'rejected_documents' },
      { id: 'ss-client-rev', name: 'client_revision_requested' },
    ]);
    jest.spyOn(prisma.candidateProjects, 'findMany' as any).mockResolvedValue([
      {
        id: 'cpm-1',
        candidate: { id: 'cand-1', firstName: 'Abhi', lastName: 'Anand', email: 'a@test.com' },
        project: { id: 'proj-1', title: 'Project A', documentRequirements: [] },
        roleNeeded: { roleCatalog: { id: 'role-1' } },
        subStatus: { name: 'documents_verified', label: 'Documents Verified' },
        documentVerifications: [{ id: 'ver-1', status: 'verified', document: { id: 'doc-1' } }],
        screenings: [],
      },
    ]);
    jest.spyOn(prisma.candidateProjects, 'count' as any).mockResolvedValue(1);
    jest.spyOn(prisma.candidateProjectStatusHistory, 'findMany' as any).mockImplementation(async ({ where }: any) => {
      if (where?.subStatus?.name === 'client_revision_requested') {
        return [{ candidateProjectMapId: 'cpm-1' }];
      }
      return [];
    });
    jest.spyOn(prisma.documentForwardHistory, 'findFirst' as any).mockResolvedValue(null);

    const result = await service.getVerifiedRejectedDocuments({ status: 'verified', page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].awaitingResubmitToClient).toBe(true);
  });
});

describe('DocumentsService - introduction video notifications', () => {
  let service: DocumentsService;
  let prisma: any;
  let outbox: OutboxService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        OutboxService,
        { provide: 'ProcessingService', useValue: {} },
        { provide: ProcessingService, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
    outbox = moduleRef.get(OutboxService);

    jest.spyOn(outbox, 'publishIntroductionVideoRejected').mockResolvedValue(undefined as never);
    jest.spyOn(outbox, 'publishIntroductionVideoResubmissionRequested').mockResolvedValue(undefined as never);
    jest.spyOn(outbox, 'publishIntroductionVideoResubmitted').mockResolvedValue(undefined as never);
    jest.spyOn(outbox, 'publishDocumentRejected').mockResolvedValue(undefined as never);
    jest.spyOn(outbox, 'publishDocumentResubmissionRequested').mockResolvedValue(undefined as never);
    jest.spyOn(outbox, 'publishDocumentResubmitted').mockResolvedValue(undefined as never);
    jest.spyOn(outbox, 'publishDataSync').mockResolvedValue(undefined as never);
    jest.spyOn(service as any, 'updateCandidateProjectStatus').mockResolvedValue(undefined);
  });

  it('verifyDocument publishes IntroductionVideoRejected for introduction_video docType', async () => {
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({
      id: 'doc-intro',
      candidateId: 'cand-1',
      docType: 'introduction_video',
    });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({
      id: 'cpm-1',
      candidateId: 'cand-1',
      candidate: { id: 'cand-1' },
      project: { documentRequirements: [] },
    });
    jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({ name: 'Verifier' });
    jest.spyOn(prisma.candidateProjectDocumentVerification, 'findUnique' as any).mockResolvedValue({
      id: 'ver-1',
    });

    const txMock: any = {
      candidateProjectDocumentVerification: {
        update: jest.fn().mockResolvedValue({ id: 'ver-1' }),
      },
      document: { update: jest.fn().mockResolvedValue({ id: 'doc-intro' }) },
      documentVerificationHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };
    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    await service.verifyDocument(
      'doc-intro',
      {
        candidateProjectMapId: 'cpm-1',
        status: 'rejected',
        rejectionReason: 'Poor audio quality',
      } as any,
      'user-1',
    );

    expect(outbox.publishIntroductionVideoRejected).toHaveBeenCalledWith(
      'doc-intro',
      'user-1',
      'cpm-1',
      'Poor audio quality',
    );
    expect(outbox.publishDocumentRejected).not.toHaveBeenCalled();
  });

  it('requestResubmission publishes IntroductionVideoResubmissionRequested for introduction_video', async () => {
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({
      id: 'doc-intro',
      candidateId: 'cand-1',
      docType: 'introduction_video',
    });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({
      id: 'cpm-1',
      candidateId: 'cand-1',
    });
    jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({ name: 'Requester' });
    jest.spyOn(prisma.candidateProjectStatus, 'findFirst' as any).mockResolvedValue({ id: 'status-pending' });
    jest.spyOn(prisma.candidateProjects, 'update' as any).mockResolvedValue(undefined);

    const txMock: any = {
      candidateProjectDocumentVerification: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ver-1' }),
        update: jest.fn().mockResolvedValue({ id: 'ver-1' }),
      },
      documentVerificationHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };
    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    await service.requestResubmission(
      'doc-intro',
      {
        candidateProjectMapId: 'cpm-1',
        reason: 'Please re-record in better lighting',
      } as any,
      'user-1',
    );

    expect(outbox.publishIntroductionVideoResubmissionRequested).toHaveBeenCalledWith(
      'doc-intro',
      'user-1',
      'cpm-1',
      'Please re-record in better lighting',
    );
    expect(outbox.publishDocumentResubmissionRequested).not.toHaveBeenCalled();
  });

  it('reupload publishes IntroductionVideoResubmitted for introduction_video docType', async () => {
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({
      id: 'doc-old',
      candidateId: 'cand-1',
      docType: 'introduction_video',
      roleCatalogId: null,
    });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue({
      id: 'cpm-1',
      candidateId: 'cand-1',
    });
    jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({ name: 'Recruiter' });
    jest.spyOn(prisma.candidateProjectDocumentVerification, 'findUnique' as any).mockResolvedValue({
      id: 'ver-old',
      roleCatalogId: null,
    });

    const txMock: any = {
      candidateProjectDocumentVerification: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ver-old' }),
        update: jest.fn().mockResolvedValue({ id: 'ver-old' }),
        create: jest.fn().mockResolvedValue({ id: 'ver-new' }),
      },
      documentVerificationHistory: { create: jest.fn().mockResolvedValue(undefined) },
      document: {
        create: jest.fn().mockResolvedValue({ id: 'doc-new' }),
      },
    };
    jest.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => cb(txMock));

    await service.reupload(
      'doc-old',
      {
        candidateProjectMapId: 'cpm-1',
        fileName: 'intro-v2.mp4',
        fileUrl: 'http://example.com/intro-v2.mp4',
      } as any,
      'user-1',
      false,
    );

    expect(outbox.publishIntroductionVideoResubmitted).toHaveBeenCalledWith(
      'doc-new',
      'user-1',
      'cpm-1',
    );
    expect(outbox.publishDocumentResubmitted).not.toHaveBeenCalled();
  });
});

describe('DocumentsService - mergeVerifiedDocuments', () => {
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
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
  });

  it('rejects documentIds that are not verified for the nomination', async () => {
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue({
      id: 'cpm-1',
      candidateId: 'cand-1',
    });
    jest.spyOn(prisma.candidateProjectDocumentVerification, 'findMany' as any).mockResolvedValue([
      {
        documentId: 'doc-verified',
        status: 'verified',
        isDeleted: false,
        isReuploaded: false,
        isUploadedByProcessingTeam: false,
        document: {
          id: 'doc-verified',
          docType: 'passport_copy',
          fileName: 'passport.pdf',
          fileUrl: 'https://example.com/passport.pdf',
          candidateId: 'cand-1',
          isDeleted: false,
          createdAt: new Date('2026-01-02'),
        },
      },
      {
        documentId: 'doc-pending',
        status: 'pending',
        isDeleted: false,
        isReuploaded: false,
        isUploadedByProcessingTeam: false,
        document: {
          id: 'doc-pending',
          docType: 'degree_certificate',
          fileName: 'degree.pdf',
          fileUrl: 'https://example.com/degree.pdf',
          candidateId: 'cand-1',
          isDeleted: false,
          createdAt: new Date('2026-01-03'),
        },
      },
    ]);

    await expect(
      service.mergeVerifiedDocuments(
        'cand-1',
        'proj-1',
        'role-1',
        'cpm-1',
        ['doc-pending'],
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('isPdfMergeableDocument', () => {
  const { isPdfMergeableDocument, DOCUMENT_TYPE } = jest.requireActual(
    '../../common/constants/document-types',
  );

  it('excludes introduction video from PDF merge', () => {
    expect(
      isPdfMergeableDocument({
        docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
        fileName: 'intro.mp4',
      }),
    ).toBe(false);
  });

  it('includes passport copy PDF documents', () => {
    expect(
      isPdfMergeableDocument({
        docType: DOCUMENT_TYPE.PASSPORT_COPY,
        fileName: 'passport.pdf',
      }),
    ).toBe(true);
  });
});