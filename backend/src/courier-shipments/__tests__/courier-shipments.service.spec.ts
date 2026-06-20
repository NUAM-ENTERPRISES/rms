import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { CourierShipmentsService } from '../courier-shipments.service';
import {
  DELIVERY_MODE,
  SHIPMENT_STATUS,
} from '../constants/shipment-types';

describe('CourierShipmentsService', () => {
  let service: CourierShipmentsService;

  const outboxService = {
    publishCourierShipmentReceived: jest.fn(),
  };

  const prisma = {
    courierShipment: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    originalDocumentCollection: {
      findUnique: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierShipmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    service = module.get(CourierShipmentsService);
  });

  describe('create', () => {
    it('assigns incrementing legNumber per candidate', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        lockerFileNumber: 'L-100',
        mergedDocumentId: 'doc-1',
        events: [
          {
            items: [
              { docType: 'degree_certificate_original', isReceived: true },
            ],
          },
        ],
      });
      prisma.courierShipment.aggregate.mockResolvedValue({
        _max: { legNumber: 2 },
      });
      prisma.courierShipment.create.mockResolvedValue({
        id: 'ship-3',
        candidateId: 'cand-1',
        legNumber: 3,
        documents: [{ docType: 'degree_certificate_original' }],
        candidate: { firstName: 'A', lastName: 'B' },
      });

      const result = await service.create(
        {
          candidateId: 'cand-1',
          purposeType: 'internal',
          deliveryMode: DELIVERY_MODE.COURIER,
          fromAddressType: 'kochi',
          toAddressType: 'delhi',
          docTypes: ['degree_certificate_original'],
        },
        'user-1',
      );

      expect(prisma.courierShipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ legNumber: 3 }),
        }),
      );
      expect(result.data.legNumber).toBe(3);
    });

    it('syncs candidate mailing fields when address type is candidate', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        lockerFileNumber: 'L-100',
        mergedDocumentId: 'doc-1',
        events: [
          {
            items: [
              { docType: 'degree_certificate_original', isReceived: true },
            ],
          },
        ],
      });
      prisma.courierShipment.aggregate.mockResolvedValue({
        _max: { legNumber: 0 },
      });
      prisma.courierShipment.create.mockResolvedValue({
        id: 'ship-1',
        candidateId: 'cand-1',
        legNumber: 1,
        documents: [{ docType: 'degree_certificate_original' }],
        candidate: { firstName: 'A', lastName: 'B' },
      });
      prisma.candidate.update.mockResolvedValue({ id: 'cand-1' });

      await service.create(
        {
          candidateId: 'cand-1',
          purposeType: 'return',
          deliveryMode: DELIVERY_MODE.COURIER,
          fromAddressType: 'candidate',
          toAddressType: 'delhi',
          fromAddressSnapshot: {
            address: '12 MG Road',
            pincode: '682016',
            phone: '9876543210',
            altPhone: '9876543211',
          },
          docTypes: ['degree_certificate_original'],
        },
        'user-1',
      );

      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: {
          address: '12 MG Road',
          addressPincode: '682016',
          mobileNumber: '9876543210',
          alternatePhone: '9876543211',
        },
      });
    });

    it('rejects doc types not in cumulative received', async () => {
      prisma.originalDocumentCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        events: [{ items: [{ docType: 'sslc_certificate_original', isReceived: true }] }],
      });

      await expect(
        service.create(
          {
            candidateId: 'cand-1',
            purposeType: 'internal',
            deliveryMode: DELIVERY_MODE.COURIER,
            fromAddressType: 'kochi',
            toAddressType: 'delhi',
            docTypes: ['degree_certificate_original'],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('dispatch vs handover', () => {
    it('dispatch requires courier mode', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.DIRECT,
        status: SHIPMENT_STATUS.DRAFT,
        documents: [],
        candidate: {},
      });

      await expect(
        service.dispatch('s1', {
          trackingId: 'T1',
          courierPartner: 'Blue Dart',
          sentAt: new Date().toISOString(),
          sentByUserId: 'u1',
          approvedByUserId: 'u2',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('handover rejects courier mode', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.DRAFT,
        documents: [],
        candidate: {},
      });

      await expect(
        service.handover('s1', {
          sentAt: new Date().toISOString(),
          sentByUserId: 'u1',
          approvedByUserId: 'u2',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findByCandidate', () => {
    it('returns legs ordered by legNumber', async () => {
      prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.courierShipment.findMany.mockResolvedValue([
        { id: '1', legNumber: 1, documents: [], candidate: {} },
        { id: '2', legNumber: 2, documents: [], candidate: {} },
      ]);

      const result = await service.findByCandidate('c1');
      expect(result.data).toHaveLength(2);
      expect(prisma.courierShipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { legNumber: 'asc' },
        }),
      );
    });
  });

  describe('receive', () => {
    it('publishes notification for office destination', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        status: SHIPMENT_STATUS.IN_TRANSIT,
        toAddressType: 'delhi',
        sentByUserId: 'u1',
        createdByUserId: 'u2',
        documents: [],
        candidate: {},
      });
      prisma.courierShipment.update.mockResolvedValue({
        id: 's1',
        status: SHIPMENT_STATUS.RECEIVED,
        toAddressType: 'delhi',
        documents: [],
        candidate: {},
      });

      await service.receive(
        's1',
        {
          receivedAt: new Date().toISOString(),
          receivedByUserId: 'u3',
        },
        'u3',
      );

      expect(outboxService.publishCourierShipmentReceived).toHaveBeenCalledWith(
        's1',
        'u3',
      );
    });

    it('throws when shipment not in transit', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        status: SHIPMENT_STATUS.DRAFT,
        toAddressType: 'delhi',
        documents: [],
        candidate: {},
      });

      await expect(
        service.receive(
          's1',
          { receivedAt: new Date().toISOString(), receivedByUserId: 'u1' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uses actor user when receiving at client destination', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        status: SHIPMENT_STATUS.IN_TRANSIT,
        toAddressType: 'client',
        sentByUserId: 'u1',
        createdByUserId: 'u2',
        documents: [],
        candidate: {},
      });
      prisma.courierShipment.update.mockResolvedValue({
        id: 's1',
        status: SHIPMENT_STATUS.RECEIVED,
        toAddressType: 'client',
        receivedByUserId: 'actor-1',
        documents: [],
        candidate: {},
      });

      await service.receive(
        's1',
        { receivedAt: new Date().toISOString() },
        'actor-1',
      );

      expect(prisma.courierShipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receivedByUserId: 'actor-1',
            status: SHIPMENT_STATUS.RECEIVED,
          }),
        }),
      );
      expect(outboxService.publishCourierShipmentReceived).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for missing leg', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
