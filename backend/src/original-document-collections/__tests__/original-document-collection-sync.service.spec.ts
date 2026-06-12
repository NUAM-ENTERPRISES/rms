import { OriginalDocumentCollectionSyncService } from '../original-document-collection-sync.service';

describe('OriginalDocumentCollectionSyncService', () => {
  const prisma = {
    originalDocumentCollection: {
      findUnique: jest.fn(),
    },
    originalDocumentCollectionSyncLog: {
      createMany: jest.fn(),
    },
    processingCandidate: { findMany: jest.fn() },
    processingStepTemplate: { findUnique: jest.fn() },
    processingStep: { findFirst: jest.fn() },
    candidateProjects: { findFirst: jest.fn() },
    document: { findFirst: jest.fn(), create: jest.fn() },
    candidateProjectDocumentVerification: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    processingStepDocument: { findFirst: jest.fn(), create: jest.fn() },
    processingHistory: { create: jest.fn() },
  };

  let service: OriginalDocumentCollectionSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OriginalDocumentCollectionSyncService(prisma as never);
  });

  it('returns empty when collection not found', async () => {
    prisma.originalDocumentCollection.findUnique.mockResolvedValue(null);
    const result = await service.syncCollectionToProcessing('missing', 'user-1');
    expect(result.syncedDocTypes).toEqual([]);
  });

  it('skips doc types already synced via sync log', async () => {
    prisma.originalDocumentCollection.findUnique.mockResolvedValue({
      id: 'col-1',
      candidateId: 'cand-1',
      events: [
        {
          collectedAt: new Date('2026-06-12'),
          items: [
            { docType: 'degree_certificate_original', isReceived: true },
            { docType: 'sslc_certificate_original', isReceived: true },
          ],
        },
      ],
      mergedDocument: {
        id: 'doc-bundle',
        fileName: 'abhi_original_documents.pdf',
        fileUrl: 'https://example.com/bundle.pdf',
        fileSize: 100,
        mimeType: 'application/pdf',
        uploadedBy: 'dce-1',
      },
      syncLogs: [{ docType: 'degree_certificate_original' }],
    });
    prisma.processingCandidate.findMany.mockResolvedValue([]);
    prisma.processingStepTemplate.findUnique.mockResolvedValue({ id: 'tpl-1' });

    const result = await service.syncCollectionToProcessing('col-1', 'user-1');
    expect(result.syncedDocTypes).toEqual([]);
  });
});
