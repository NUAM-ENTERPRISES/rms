import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';

describe('ProcessingService - linked history proxies', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        { provide: OutboxService, useValue: {} },
        { provide: ProcessingRemindersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  describe('getDocumentCollectionHistory', () => {
    it('throws when processing candidate is not found', async () => {
      jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(null);

      await expect(service.getDocumentCollectionHistory('missing-pc')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns empty paginated result when no collection exists', async () => {
      jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
        candidateId: 'cand-1',
      });
      jest.spyOn(prisma.originalDocumentCollection, 'findUnique' as any).mockResolvedValue(null);

      const result = await service.getDocumentCollectionHistory('pc-1', { page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      });
    });

    it('returns paginated collection events with mapped fields', async () => {
      jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
        candidateId: 'cand-1',
      });
      jest.spyOn(prisma.originalDocumentCollection, 'findUnique' as any).mockResolvedValue({
        id: 'col-1',
        status: 'locker_submitted',
        lockerFileNumber: 'L-42',
      });
      jest.spyOn(prisma.originalDocumentCollectionEvent, 'count' as any).mockResolvedValue(2);
      jest
        .spyOn(prisma.originalDocumentCollectionEvent, 'findMany' as any)
        .mockImplementation((args: any) => {
          if (args?.select?.id && args?.orderBy?.collectedAt === 'asc') {
            return Promise.resolve([{ id: 'evt-1' }, { id: 'evt-2' }]);
          }
          return Promise.resolve([
            {
              id: 'evt-2',
              collectionType: 'direct',
              directOffice: 'kochi',
              directOfficeOther: null,
              interviewVenue: null,
              agent: null,
              agentNameManual: null,
              courierPartner: null,
              trackingNumber: null,
              mergedDocumentId: 'doc-1',
              collectedAt: new Date('2026-06-10T10:00:00Z'),
              collectedBy: { id: 'u-1', name: 'Alice' },
              items: [{ isReceived: true }, { isReceived: false }],
              mergedDocument: { id: 'doc-1', fileName: 'merged.pdf' },
            },
            {
              id: 'evt-1',
              collectionType: 'courier',
              directOffice: null,
              directOfficeOther: null,
              interviewVenue: null,
              agent: null,
              agentNameManual: null,
              courierPartner: 'DHL',
              trackingNumber: 'TRK-99',
              mergedDocumentId: null,
              collectedAt: new Date('2026-06-01T08:00:00Z'),
              collectedBy: { id: 'u-2', name: 'Bob' },
              items: [{ isReceived: true }],
              mergedDocument: null,
            },
          ]);
        });

      const result = await service.getDocumentCollectionHistory('pc-1', { page: 1, limit: 10 });

      expect(result.pagination.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        id: 'evt-2',
        eventNumber: 2,
        collectionType: 'direct',
        collectionTypeLabel: 'Direct',
        sourceDetail: 'Kochi',
        documentCount: 1,
        lockerFileNumber: 'L-42',
        collectionStatus: 'locker_submitted',
        collectedBy: { id: 'u-1', name: 'Alice' },
        hasMergedScan: true,
        mergedFileName: 'merged.pdf',
      });
      expect(result.items[1]).toMatchObject({
        id: 'evt-1',
        eventNumber: 1,
        collectionType: 'courier',
        sourceDetail: 'DHL / TRK-99',
        documentCount: 1,
        hasMergedScan: false,
        mergedFileName: null,
      });
    });
  });

  describe('getCourierHistory', () => {
    it('throws when processing candidate is not found', async () => {
      jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(null);

      await expect(service.getCourierHistory('missing-pc')).rejects.toThrow(NotFoundException);
    });

    it('returns paginated courier legs with address labels', async () => {
      jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
        candidateId: 'cand-1',
      });
      jest.spyOn(prisma.courierShipment, 'count' as any).mockResolvedValue(1);
      jest.spyOn(prisma.courierShipment, 'findMany' as any).mockResolvedValue([
        {
          id: 'ship-1',
          legNumber: 2,
          purposeType: 'internal',
          deliveryMode: 'courier',
          status: 'in_transit',
          trackingId: 'AWB-123',
          courierPartner: 'BlueDart',
          fromAddressType: 'kochi_office',
          toAddressType: 'delhi_office',
          sentAt: new Date('2026-06-12T14:00:00Z'),
          receivedAt: null,
          sentBy: { id: 'u-3', name: 'Carol' },
        },
      ]);

      const result = await service.getCourierHistory('pc-1', { page: 1, limit: 10 });

      expect(result.pagination.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'ship-1',
        legNumber: 2,
        purposeType: 'internal',
        deliveryMode: 'courier',
        status: 'in_transit',
        trackingId: 'AWB-123',
        courierPartner: 'BlueDart',
        sentBy: { id: 'u-3', name: 'Carol' },
      });
      expect(result.items[0].fromAddressLabel).toBeTruthy();
      expect(result.items[0].toAddressLabel).toBeTruthy();
    });
  });
});
