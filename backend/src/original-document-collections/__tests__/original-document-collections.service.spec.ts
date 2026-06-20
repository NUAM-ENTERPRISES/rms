import { ConflictException } from '@nestjs/common';
import { OriginalDocumentCollectionsService } from '../original-document-collections.service';
import { COLLECTION_STATUS } from '../constants/collection-types';

describe('OriginalDocumentCollectionsService', () => {
  const prisma = {
    originalDocumentCollection: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };

  const uploadService = {} as never;

  let service: OriginalDocumentCollectionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OriginalDocumentCollectionsService(
      prisma as never,
      uploadService,
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

  describe('getEventMerges', () => {
    it('returns event merged scans newest first with stable event numbers', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        candidateId: 'cand-1',
        events: [
          {
            id: 'evt-1',
            collectedAt: new Date('2026-06-10'),
            mergedDocument: {
              id: 'doc-1',
              fileName: 'candidate_intake_event_1.pdf',
              fileUrl: 'https://example.com/event-1.pdf',
              mimeType: 'application/pdf',
            },
          },
          {
            id: 'evt-2',
            collectedAt: new Date('2026-06-15'),
            mergedDocument: {
              id: 'doc-2',
              fileName: 'candidate_intake_event_2.pdf',
              fileUrl: 'https://example.com/event-2.pdf',
              mimeType: 'application/pdf',
            },
          },
        ],
      });

      const result = await service.getEventMerges('col-1', { page: 1, limit: 5 });

      expect(result.success).toBe(true);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 2,
        totalPages: 1,
      });
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0]).toMatchObject({
        eventId: 'evt-2',
        eventNumber: 2,
        document: { fileName: 'candidate_intake_event_2.pdf' },
      });
      expect(result.data.items[1]).toMatchObject({
        eventId: 'evt-1',
        eventNumber: 1,
        document: { fileName: 'candidate_intake_event_1.pdf' },
      });
    });

    it('paginates event merged scans', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        candidateId: 'cand-1',
        events: [
          {
            id: 'evt-1',
            collectedAt: new Date('2026-06-10'),
            mergedDocument: {
              id: 'doc-1',
              fileName: 'event-1.pdf',
              fileUrl: 'https://example.com/event-1.pdf',
              mimeType: 'application/pdf',
            },
          },
          {
            id: 'evt-2',
            collectedAt: new Date('2026-06-12'),
            mergedDocument: {
              id: 'doc-2',
              fileName: 'event-2.pdf',
              fileUrl: 'https://example.com/event-2.pdf',
              mimeType: 'application/pdf',
            },
          },
          {
            id: 'evt-3',
            collectedAt: new Date('2026-06-15'),
            mergedDocument: {
              id: 'doc-3',
              fileName: 'event-3.pdf',
              fileUrl: 'https://example.com/event-3.pdf',
              mimeType: 'application/pdf',
            },
          },
        ],
      });

      const page1 = await service.getEventMerges('col-1', { page: 1, limit: 2 });
      const page2 = await service.getEventMerges('col-1', { page: 2, limit: 2 });

      expect(page1.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(page1.data.items).toHaveLength(2);
      expect(page1.data.items[0].eventId).toBe('evt-3');
      expect(page2.data.items).toHaveLength(1);
      expect(page2.data.items[0].eventId).toBe('evt-1');
    });
  });

  describe('checkLockerFileNumberAvailability', () => {
    it('returns unavailable when another collection uses the locker number', async () => {
      prisma.originalDocumentCollection.findFirst.mockResolvedValue({
        id: 'col-other',
        candidate: {
          firstName: 'Jane',
          lastName: 'Doe',
          candidateCode: 'C-002',
        },
      });

      const result = await service.checkLockerFileNumberAvailability({
        lockerFileNumber: 'l-100',
        excludeCollectionId: 'col-1',
      });

      expect(result.data.available).toBe(false);
      expect(result.data.lockerFileNumber).toBe('L-100');
      expect(result.data.usedBy).toEqual({
        collectionId: 'col-other',
        candidateName: 'Jane Doe',
        candidateCode: 'C-002',
      });
    });

    it('returns available when no conflict exists', async () => {
      prisma.originalDocumentCollection.findFirst.mockResolvedValue(null);

      const result = await service.checkLockerFileNumberAvailability({
        lockerFileNumber: 'L-200',
      });

      expect(result.data.available).toBe(true);
      expect(result.data.usedBy).toBeNull();
    });
  });

  describe('submitToLocker', () => {
    it('rejects duplicate locker file numbers', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        candidateId: 'cand-1',
        mergedDocumentId: 'doc-1',
        lockerSubmittedAt: null,
        lockerFileNumber: null,
        events: [],
      });
      prisma.originalDocumentCollection.findFirst.mockResolvedValue({
        id: 'col-other',
        candidate: {
          firstName: 'Other',
          lastName: 'Candidate',
          candidateCode: 'C-002',
        },
      });

      await expect(
        service.submitToLocker('col-1', { lockerFileNumber: 'L-100' }, 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('stores normalized locker file numbers', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        candidateId: 'cand-1',
        mergedDocumentId: 'doc-1',
        lockerSubmittedAt: null,
        lockerFileNumber: null,
        events: [],
      });
      prisma.originalDocumentCollection.findFirst.mockResolvedValue(null);
      prisma.originalDocumentCollection.update.mockResolvedValue({
        id: 'col-1',
        candidateId: 'cand-1',
        mergedDocumentId: 'doc-1',
        lockerFileNumber: 'L-100',
        lockerSubmittedAt: new Date('2026-06-15'),
        lockerSubmittedByUserId: 'user-1',
        status: COLLECTION_STATUS.LOCKER_SUBMITTED,
        events: [],
      });

      await service.submitToLocker('col-1', { lockerFileNumber: ' l-100 ' }, 'user-1');

      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: { lockerFileNumber: 'L-100' },
      });
      expect(prisma.originalDocumentCollection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lockerFileNumber: 'L-100',
          }),
        }),
      );
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
    });
  });
});
