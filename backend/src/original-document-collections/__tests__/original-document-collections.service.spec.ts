import { OriginalDocumentCollectionsService } from '../original-document-collections.service';
import { COLLECTION_STATUS } from '../constants/collection-types';

describe('OriginalDocumentCollectionsService', () => {
  const prisma = {
    originalDocumentCollection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    originalDocumentCollectionEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };

  const uploadService = {} as never;
  const syncService = {
    syncCollectionToProcessing: jest.fn(),
  };

  let service: OriginalDocumentCollectionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OriginalDocumentCollectionsService(
      prisma as never,
      uploadService,
      syncService as never,
    );
  });

  describe('findByCandidate', () => {
    it('returns one collection with cumulative received from all events', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-parent',
        candidateId: 'cand-1',
        status: COLLECTION_STATUS.LOCKER_SUBMITTED,
        events: [
          {
            id: 'evt-1',
            collectedAt: new Date('2026-05-12'),
            items: [
              { docType: 'degree_certificate_original', isReceived: true, remarks: null },
              { docType: 'experience_certificate_original', isReceived: true, remarks: null },
            ],
          },
          {
            id: 'evt-2',
            collectedAt: new Date('2026-06-12'),
            items: [
              { docType: 'sslc_certificate_original', isReceived: true, remarks: null },
              { docType: 'plus_two_certificate_original', isReceived: true, remarks: null },
            ],
          },
        ],
      });
      prisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-1',
        firstName: 'Abhi',
        lastName: 'Kumar',
        lockerFileNumber: 'L-100',
      });

      const result = await service.findByCandidate('cand-1');

      expect(result.success).toBe(true);
      expect(result.data.collection?.id).toBe('col-parent');
      expect(result.data.events).toHaveLength(2);
      expect(result.data.cumulativeReceived).toHaveLength(4);
      expect(result.data.cumulativeReceived.map((i) => i.docType)).toEqual(
        expect.arrayContaining([
          'degree_certificate_original',
          'experience_certificate_original',
          'sslc_certificate_original',
          'plus_two_certificate_original',
        ]),
      );
    });

    it('returns empty when candidate has no collection', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue(null);
      prisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-2',
        firstName: 'New',
        lastName: 'Candidate',
        lockerFileNumber: null,
      });

      const result = await service.findByCandidate('cand-2');

      expect(result.data.collection).toBeNull();
      expect(result.data.events).toEqual([]);
      expect(result.data.cumulativeReceived).toEqual([]);
    });
  });

  describe('complete', () => {
    it('sets collection status to completed', async () => {
      const existingCollection = {
        id: 'col-1',
        candidateId: 'cand-1',
        mergedDocumentId: 'doc-merge',
        lockerFileNumber: 'L-100',
        lockerSubmittedAt: new Date('2026-06-10'),
        events: [],
      };

      prisma.originalDocumentCollection.findUnique.mockResolvedValue(
        existingCollection,
      );
      syncService.syncCollectionToProcessing.mockResolvedValue({
        syncedDocTypes: ['degree_certificate_original'],
      });
      prisma.originalDocumentCollection.update.mockResolvedValue({
        ...existingCollection,
        status: COLLECTION_STATUS.COMPLETED,
        completedAt: new Date('2026-06-12'),
        completedByUserId: 'user-1',
        events: [],
      });

      const result = await service.complete('col-1', 'user-1');

      expect(prisma.originalDocumentCollection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'col-1' },
          data: expect.objectContaining({
            status: COLLECTION_STATUS.COMPLETED,
            completedByUserId: 'user-1',
          }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.data.status).toBe(COLLECTION_STATUS.COMPLETED);
      expect(result.syncedDocTypes).toEqual(['degree_certificate_original']);
    });
  });
});
