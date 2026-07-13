import { BadRequestException, ConflictException } from '@nestjs/common';
import { OriginalDocumentCollectionsService } from '../original-document-collections.service';
import { COLLECTION_STATUS } from '../constants/collection-types';

describe('OriginalDocumentCollectionsService', () => {
  const prisma = {
    originalDocumentCollection: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    originalDocumentCollectionEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    originalDocumentCollectionChecklistItem: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

  describe('candidate checklist configuration', () => {
    const checklistItem = {
      id: 'check-1',
      collectionId: 'col-1',
      docType: 'passport_original',
      mandatory: true,
      sortOrder: 0,
    };
    const baseCollection = {
      id: 'col-1',
      candidateId: 'cand-1',
      status: COLLECTION_STATUS.DRAFT,
      checklistItems: [checklistItem],
      events: [],
    };

    it('seeds the default checklist when creating a collection', async () => {
      prisma.candidate.findUnique.mockResolvedValue({ id: 'cand-1' });
      prisma.originalDocumentCollection.findUnique.mockResolvedValue(null);
      prisma.originalDocumentCollection.create.mockResolvedValue({
        id: 'col-1',
      });
      prisma.originalDocumentCollectionEvent.create.mockResolvedValue({
        id: 'evt-1',
      });
      prisma.originalDocumentCollection.findUniqueOrThrow.mockResolvedValue({
        ...baseCollection,
        checklistItems: [],
      });

      await service.create(
        {
          candidateId: 'cand-1',
          collectionType: 'direct',
          collectedByUserId: 'user-1',
          collectedAt: '2026-07-13T10:00:00.000Z',
          directOffice: 'kochi',
          items: [],
        },
        'user-1',
      );

      expect(prisma.originalDocumentCollection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          checklistItems: {
            create: expect.arrayContaining([
              expect.objectContaining({
                docType: 'passport_original',
                mandatory: true,
                sortOrder: 0,
              }),
            ]),
          },
        }),
      });
    });

    it('adds a supported original document as the next checklist item', async () => {
      prisma.originalDocumentCollection.findUnique
        .mockResolvedValueOnce(baseCollection)
        .mockResolvedValueOnce({
          ...baseCollection,
          checklistItems: [
            checklistItem,
            {
              ...checklistItem,
              id: 'check-2',
              docType: 'offer_letter_original',
              mandatory: false,
              sortOrder: 1,
            },
          ],
        });

      await service.addChecklistItem('col-1', {
        docType: 'offer_letter_original',
        mandatory: false,
      });

      expect(
        prisma.originalDocumentCollectionChecklistItem.create,
      ).toHaveBeenCalledWith({
        data: {
          collectionId: 'col-1',
          docType: 'offer_letter_original',
          mandatory: false,
          sortOrder: 1,
        },
      });
    });

    it('updates mandatory status', async () => {
      prisma.originalDocumentCollection.findUnique
        .mockResolvedValueOnce(baseCollection)
        .mockResolvedValueOnce({
          ...baseCollection,
          checklistItems: [{ ...checklistItem, mandatory: false }],
        });

      await service.updateChecklistItem('col-1', 'passport_original', {
        mandatory: false,
      });

      expect(
        prisma.originalDocumentCollectionChecklistItem.update,
      ).toHaveBeenCalledWith({
        where: { id: 'check-1' },
        data: { mandatory: false },
      });
    });

    it('removes an unreceived checklist item', async () => {
      prisma.originalDocumentCollection.findUnique
        .mockResolvedValueOnce(baseCollection)
        .mockResolvedValueOnce({
          ...baseCollection,
          checklistItems: [],
        });

      await service.removeChecklistItem('col-1', 'passport_original');

      expect(
        prisma.originalDocumentCollectionChecklistItem.delete,
      ).toHaveBeenCalledWith({ where: { id: 'check-1' } });
    });

    it('rejects removing a received checklist item', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        ...baseCollection,
        events: [
          {
            items: [
              {
                docType: 'passport_original',
                isReceived: true,
                remarks: null,
              },
            ],
          },
        ],
      });

      await expect(
        service.removeChecklistItem('col-1', 'passport_original'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate checklist items', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue(
        baseCollection,
      );

      await expect(
        service.addChecklistItem('col-1', {
          docType: 'passport_original',
          mandatory: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects unsupported document types', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue(
        baseCollection,
      );

      await expect(
        service.addChecklistItem('col-1', {
          docType: 'resume',
          mandatory: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
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

    it('includes per-document remarks in cumulative received and events', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-parent',
        candidateId: 'cand-1',
        status: COLLECTION_STATUS.DRAFT,
        events: [
          {
            id: 'evt-1',
            collectedAt: new Date('2026-06-12'),
            remarks: 'Visit note',
            items: [
              {
                docType: 'sslc_certificate_original',
                isReceived: true,
                remarks: 'Original copy received',
              },
              {
                docType: 'degree_certificate_original',
                isReceived: true,
                remarks: null,
              },
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

      expect(result.data.cumulativeReceived).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            docType: 'sslc_certificate_original',
            remarks: 'Original copy received',
          }),
        ]),
      );
      expect(result.data.events[0].remarks).toBe('Visit note');
      expect(result.data.events[0].items[0].remarks).toBe(
        'Original copy received',
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

  describe('addEvent', () => {
    it('persists trimmed remarks only for received items', async () => {
      const baseCollection = {
        id: 'col-1',
        candidateId: 'cand-1',
        status: COLLECTION_STATUS.DRAFT,
        checklistItems: [
          {
            id: 'check-sslc',
            docType: 'sslc_certificate_original',
            mandatory: true,
            sortOrder: 0,
          },
          {
            id: 'check-degree',
            docType: 'degree_certificate_original',
            mandatory: true,
            sortOrder: 1,
          },
        ],
        events: [],
        candidate: { id: 'cand-1', firstName: 'A', lastName: 'B' },
        lockerSubmittedBy: null,
        completedBy: null,
        createdBy: { id: 'user-1', name: 'User', email: 'u@test.com' },
        mergedDocument: null,
      };

      const newEvent = {
        id: 'evt-new',
        collectionId: 'col-1',
        collectionType: 'direct',
        collectedByUserId: 'user-1',
        collectedAt: new Date('2026-06-15'),
        directOffice: 'kochi',
        remarks: null,
        items: [
          {
            docType: 'sslc_certificate_original',
            isReceived: true,
            remarks: 'SSLC note',
          },
          {
            docType: 'degree_certificate_original',
            isReceived: false,
            remarks: null,
          },
        ],
        collectedBy: { id: 'user-1', name: 'User', email: 'u@test.com' },
        createdBy: { id: 'user-1', name: 'User' },
        agent: null,
        mergedDocument: null,
      };

      prisma.originalDocumentCollection.findUnique
        .mockResolvedValueOnce(baseCollection)
        .mockResolvedValueOnce({
          ...baseCollection,
          events: [newEvent],
        });
      prisma.originalDocumentCollectionEvent.create.mockResolvedValue(newEvent);

      await service.addEvent(
        'col-1',
        {
          collectionType: 'direct',
          collectedByUserId: 'user-1',
          collectedAt: '2026-06-15T10:00:00.000Z',
          directOffice: 'kochi',
          items: [
            {
              docType: 'sslc_certificate_original',
              isReceived: true,
              remarks: '  SSLC note  ',
            },
            {
              docType: 'degree_certificate_original',
              isReceived: false,
              remarks: 'should not persist',
            },
          ],
        },
        'user-1',
      );

      expect(prisma.originalDocumentCollectionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  docType: 'sslc_certificate_original',
                  isReceived: true,
                  remarks: 'SSLC note',
                }),
                expect.objectContaining({
                  docType: 'degree_certificate_original',
                  isReceived: false,
                  remarks: null,
                }),
              ]),
            },
          }),
        }),
      );
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
