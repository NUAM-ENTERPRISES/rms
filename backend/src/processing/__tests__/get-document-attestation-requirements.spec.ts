import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import { CandidateProjectsService } from '../../candidate-projects/candidate-projects.service';
import { CandidateCountryRestrictionsService } from '../../candidate-country-restrictions/candidate-country-restrictions.service';
import { DOCUMENT_TYPE } from '../../common/constants';

describe('ProcessingService - getDocumentAttestationRequirements', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        { provide: OutboxService, useValue: {} },
        { provide: ProcessingRemindersService, useValue: {} },
        { provide: CandidateProjectsService, useValue: {} },
        {
          provide: CandidateCountryRestrictionsService,
          useValue: {},
        },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);

    jest
      .spyOn(service, 'createStepsForProcessingCandidate' as any)
      .mockResolvedValue(undefined);
  });

  function mockBase(options?: {
    processingDocuments?: any[];
    courierUploads?: any[];
    candidateDocuments?: any[];
  }) {
    const pcId = 'pc-1';
    const template = { id: 'tpl-attest', key: 'document_attestation' };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: pcId,
      candidateId: 'cand-1',
      projectId: 'proj-1',
      processingStatus: 'in_progress',
      candidate: {
        id: 'cand-1',
        firstName: 'A',
        lastName: 'B',
        email: 'a@example.com',
        mobileNumber: 'x',
        countryCode: 'SA',
      },
      project: {
        id: 'proj-1',
        title: 'Saudi MOH',
        countryCode: 'SA',
        description: null,
        clientId: null,
        teamId: null,
      },
      role: null,
    });

    jest
      .spyOn(prisma.processingStepTemplate, 'findUnique' as any)
      .mockResolvedValue(template);

    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([
      {
        countryCode: 'ALL',
        docType: 'degree_certificate',
        label: 'Degree Certificate',
        mandatory: true,
      },
      {
        countryCode: 'ALL',
        docType: 'registration_certificate',
        label: 'Registration Certificate',
        mandatory: true,
      },
      {
        countryCode: 'ALL',
        docType: 'passport_copy',
        label: 'Passport Copy',
        mandatory: false,
      },
    ]);

    jest.spyOn(prisma.processingStep, 'findFirst' as any).mockResolvedValue({
      id: 'step-1',
      status: 'pending',
      template,
      documents: options?.processingDocuments || [],
    });

    jest
      .spyOn(prisma.document, 'findMany' as any)
      .mockResolvedValue(options?.candidateDocuments || []);

    jest
      .spyOn(prisma.courierShipmentAttestationUpload, 'findMany' as any)
      .mockResolvedValue(options?.courierUploads || []);

    return { pcId };
  }

  it('returns courier leg uploads mapped to base requirement types', async () => {
    const { pcId } = mockBase({
      courierUploads: [
        {
          id: 'up-1',
          shipmentId: 'ship-1',
          projectId: 'proj-1',
          docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
          documentId: 'doc-attest-1',
          remarks: null,
          uploadedAt: new Date('2026-07-01T10:00:00Z'),
          document: {
            id: 'doc-attest-1',
            docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
            fileName: 'degree-attested.pdf',
            fileUrl: 'https://cdn.example/degree.pdf',
            mimeType: 'application/pdf',
            status: 'pending',
          },
          uploadedBy: { id: 'u1', name: 'Staff', email: 's@test.com' },
          shipment: { id: 'ship-1', legNumber: 3, status: 'received' },
        },
        {
          id: 'up-2',
          shipmentId: 'ship-1',
          projectId: 'proj-1',
          docType: 'sslc_certificate_attested',
          documentId: 'doc-sslc-1',
          remarks: null,
          uploadedAt: new Date('2026-07-01T11:00:00Z'),
          document: {
            id: 'doc-sslc-1',
            docType: 'sslc_certificate_attested',
            fileName: 'sslc.pdf',
            fileUrl: 'https://cdn.example/sslc.pdf',
            mimeType: 'application/pdf',
            status: 'pending',
          },
          uploadedBy: { id: 'u1', name: 'Staff', email: 's@test.com' },
          shipment: { id: 'ship-1', legNumber: 3, status: 'received' },
        },
      ],
    });

    const res = await service.getDocumentAttestationRequirements(pcId);

    expect(res.courierAttestationDocuments).toHaveLength(2);
    expect(res.courierAttestationDocuments[0]).toEqual(
      expect.objectContaining({
        baseDocType: 'degree_certificate',
        attestedDocType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
        legNumber: 3,
        isMerged: false,
      }),
    );
    expect(res.courierAttestationDocuments[1]).toEqual(
      expect.objectContaining({
        baseDocType: 'sslc_certificate',
        attestedDocType: 'sslc_certificate_attested',
      }),
    );
  });

  it('counts courier uploads toward uploaded / missing for required types', async () => {
    const { pcId } = mockBase({
      courierUploads: [
        {
          id: 'up-1',
          shipmentId: 'ship-1',
          projectId: 'proj-1',
          docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
          documentId: 'doc-1',
          remarks: null,
          uploadedAt: new Date(),
          document: {
            id: 'doc-1',
            docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
            fileName: 'degree.pdf',
            fileUrl: 'https://cdn.example/degree.pdf',
            mimeType: 'application/pdf',
          },
          uploadedBy: null,
          shipment: { id: 'ship-1', legNumber: 2, status: 'received' },
        },
      ],
    });

    const res = await service.getDocumentAttestationRequirements(pcId);

    // degree uploaded via courier; registration still missing (mandatory)
    expect(res.counts.uploadedCount).toBeGreaterThanOrEqual(1);
    expect(res.counts.missingCount).toBe(1);
    expect(res.counts.totalMandatory).toBe(2);
  });

  it('includes verified attested documents in processing_documents via base mapping', async () => {
    const { pcId } = mockBase({
      processingDocuments: [
        {
          id: 'psd-1',
          status: 'verified',
          notes: null,
          uploadedBy: 'u1',
          createdAt: new Date(),
          updatedAt: new Date(),
          candidateProjectDocumentVerification: {
            id: 'ver-1',
            status: 'verified',
            notes: null,
            rejectionReason: null,
            resubmissionRequested: false,
            isProcessingReplaced: false,
            roleCatalog: null,
            candidateProjectMap: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            document: {
              id: 'doc-attest-1',
              docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
              fileName: 'degree-attested.pdf',
              fileUrl: 'https://cdn.example/degree.pdf',
              mimeType: 'application/pdf',
            },
          },
        },
      ],
    });

    const res = await service.getDocumentAttestationRequirements(pcId);

    expect(res.processing_documents).toHaveLength(1);
    const first = res.processing_documents[0]!;
    expect(first.matchedRequirementDocType).toBe('degree_certificate');
    expect(first.document?.docType).toBe(
      DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
    );
    expect(res.counts.verifiedCount).toBe(1);
  });

  it('marks merged courier uploads when document type is merged_attested_documents', async () => {
    const { pcId } = mockBase({
      courierUploads: [
        {
          id: 'up-a',
          shipmentId: 'ship-1',
          projectId: 'proj-1',
          docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ATTESTED,
          documentId: 'doc-merged',
          remarks: null,
          uploadedAt: new Date(),
          document: {
            id: 'doc-merged',
            docType: DOCUMENT_TYPE.MERGED_ATTESTED_DOCUMENTS,
            fileName: 'merged.pdf',
            fileUrl: 'https://cdn.example/merged.pdf',
            mimeType: 'application/pdf',
          },
          uploadedBy: null,
          shipment: { id: 'ship-1', legNumber: 1, status: 'received' },
        },
        {
          id: 'up-b',
          shipmentId: 'ship-1',
          projectId: 'proj-1',
          docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE_ATTESTED,
          documentId: 'doc-merged',
          remarks: null,
          uploadedAt: new Date(),
          document: {
            id: 'doc-merged',
            docType: DOCUMENT_TYPE.MERGED_ATTESTED_DOCUMENTS,
            fileName: 'merged.pdf',
            fileUrl: 'https://cdn.example/merged.pdf',
            mimeType: 'application/pdf',
          },
          uploadedBy: null,
          shipment: { id: 'ship-1', legNumber: 1, status: 'received' },
        },
      ],
    });

    const res = await service.getDocumentAttestationRequirements(pcId);

    expect(res.courierAttestationDocuments).toHaveLength(2);
    expect(res.courierAttestationDocuments.every((r: any) => r.isMerged)).toBe(
      true,
    );
    expect(res.counts.missingCount).toBe(0);
  });
});
