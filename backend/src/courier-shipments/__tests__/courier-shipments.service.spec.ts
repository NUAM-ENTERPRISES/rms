import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { CourierShipmentsService } from '../courier-shipments.service';
import { SystemConfigService } from '../../system-config/system-config.service';
import { UploadService } from '../../upload/upload.service';
import {
  DELIVERY_MODE,
  SHIPMENT_STATUS,
} from '../constants/shipment-types';

describe('CourierShipmentsService', () => {
  let service: CourierShipmentsService;

  const outboxService = {
    publishCourierShipmentReceived: jest.fn(),
  };

  const systemConfigService = {
    getOfficeAddresses: jest.fn(),
  };

  const uploadService = {
    uploadBuffer: jest.fn(),
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
    courierShipmentDocument: {
      update: jest.fn(),
    },
    courierShipmentAttestationUpload: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    originalDocumentCollection: {
      findUnique: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    processingCandidate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    processingStepTemplate: {
      findUnique: jest.fn(),
    },
    processingStepDocument: {
      findMany: jest.fn(),
    },
    countryDocumentRequirement: {
      findMany: jest.fn(),
    },
    document: {
      create: jest.fn(),
    },
    candidateProjectDocumentVerification: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierShipmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outboxService },
        { provide: SystemConfigService, useValue: systemConfigService },
        { provide: UploadService, useValue: uploadService },
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

    it('dispatch succeeds without trackingId or courierPartner', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.DRAFT,
        documents: [],
        candidate: {},
      });
      prisma.courierShipment.update.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        trackingId: null,
        courierPartner: null,
        documents: [],
        candidate: {},
      });

      const sentAt = new Date().toISOString();
      await service.dispatch('s1', {
        sentAt,
        sentByUserId: 'u1',
        approvedByUserId: 'u2',
      });

      expect(prisma.courierShipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: expect.objectContaining({
            trackingId: null,
            courierPartner: null,
            status: SHIPMENT_STATUS.IN_TRANSIT,
          }),
        }),
      );
    });

    it('dispatch normalizes empty trackingId to null', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.DRAFT,
        documents: [],
        candidate: {},
      });
      prisma.courierShipment.update.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        trackingId: null,
        courierPartner: 'Blue Dart',
        documents: [],
        candidate: {},
      });

      await service.dispatch('s1', {
        trackingId: '   ',
        courierPartner: 'Blue Dart',
        sentAt: new Date().toISOString(),
        sentByUserId: 'u1',
        approvedByUserId: 'u2',
      });

      expect(prisma.courierShipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingId: null,
            courierPartner: 'Blue Dart',
          }),
        }),
      );
    });
  });

  describe('updateCourierTracking', () => {
    it('updates tracking fields on in-transit courier legs', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        documents: [],
        candidate: {},
      });
      prisma.courierShipment.update.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        trackingId: 'TRK-99',
        courierPartner: 'Delhivery',
        documents: [],
        candidate: {},
      });

      await service.updateCourierTracking('s1', {
        trackingId: 'TRK-99',
        courierPartner: 'Delhivery',
      });

      expect(prisma.courierShipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: {
            trackingId: 'TRK-99',
            courierPartner: 'Delhivery',
          },
        }),
      );
    });

    it('rejects updates for draft legs', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.DRAFT,
        documents: [],
        candidate: {},
      });

      await expect(
        service.updateCourierTracking('s1', { trackingId: 'TRK-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects updates for received legs', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.RECEIVED,
        documents: [],
        candidate: {},
      });

      await expect(
        service.updateCourierTracking('s1', { trackingId: 'TRK-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects updates for direct delivery legs', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.DIRECT,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        documents: [],
        candidate: {},
      });

      await expect(
        service.updateCourierTracking('s1', { trackingId: 'TRK-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires at least one field in the update payload', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        id: 's1',
        deliveryMode: DELIVERY_MODE.COURIER,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        documents: [],
        candidate: {},
      });

      await expect(
        service.updateCourierTracking('s1', {}),
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
    const verifiedDocuments = [
      { docType: 'passport', isReceived: true, remarks: 'Seal intact' },
      { docType: 'degree_certificate_original', isReceived: true },
    ];

    const partialReceiptDocuments = [
      { docType: 'passport', isReceived: true },
      {
        docType: 'degree_certificate_original',
        isReceived: false,
        remarks: 'Not arrived, please check Kochi office',
      },
    ];

    const shipmentWithDocs = {
      id: 's1',
      status: SHIPMENT_STATUS.IN_TRANSIT,
      toAddressType: 'delhi',
      sentByUserId: 'u1',
      createdByUserId: 'u2',
      documents: [
        { id: 'doc-1', docType: 'passport' },
        { id: 'doc-2', docType: 'degree_certificate_original' },
      ],
      candidate: {},
    };

    beforeEach(() => {
      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          courierShipment: prisma.courierShipment,
          courierShipmentDocument: prisma.courierShipmentDocument,
        }),
      );
      prisma.courierShipmentDocument.update.mockResolvedValue({});
    });

    it('publishes notification for office destination', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue(shipmentWithDocs);
      prisma.courierShipment.update.mockResolvedValue({
        ...shipmentWithDocs,
        status: SHIPMENT_STATUS.RECEIVED,
        documents: shipmentWithDocs.documents,
      });

      await service.receive(
        's1',
        {
          receivedAt: new Date().toISOString(),
          receivedByUserId: 'u3',
          verifiedDocuments,
        },
        'u3',
      );

      expect(outboxService.publishCourierShipmentReceived).toHaveBeenCalledWith(
        's1',
        'u3',
      );
      expect(prisma.courierShipmentDocument.update).toHaveBeenCalledTimes(2);
      expect(prisma.courierShipmentDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: expect.objectContaining({
          receiveRemarks: 'Seal intact',
          receiveVerifiedAt: expect.any(Date),
        }),
      });
      expect(prisma.courierShipmentDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: expect.objectContaining({
          receiveRemarks: null,
          receiveVerifiedAt: expect.any(Date),
        }),
      });
    });

    it('allows partial receipt when not-arrived documents include remarks', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue(shipmentWithDocs);
      prisma.courierShipment.update.mockResolvedValue({
        ...shipmentWithDocs,
        status: SHIPMENT_STATUS.RECEIVED,
      });

      await service.receive(
        's1',
        {
          receivedAt: new Date().toISOString(),
          verifiedDocuments: partialReceiptDocuments,
        },
        'u1',
      );

      expect(prisma.courierShipmentDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: expect.objectContaining({
          receiveVerifiedAt: expect.any(Date),
          receiveRemarks: null,
        }),
      });
      expect(prisma.courierShipmentDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: expect.objectContaining({
          receiveVerifiedAt: null,
          receiveRemarks: 'Not arrived, please check Kochi office',
        }),
      });
    });

    it('throws when not-arrived document is missing remarks', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue(shipmentWithDocs);

      await expect(
        service.receive(
          's1',
          {
            receivedAt: new Date().toISOString(),
            verifiedDocuments: [
              { docType: 'passport', isReceived: true },
              { docType: 'degree_certificate_original', isReceived: false },
            ],
          },
          'u1',
        ),
      ).rejects.toThrow(
        'Document type degree_certificate_original was not received; remarks are required',
      );
    });

    it('throws when shipment not in transit', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        ...shipmentWithDocs,
        status: SHIPMENT_STATUS.DRAFT,
      });

      await expect(
        service.receive(
          's1',
          {
            receivedAt: new Date().toISOString(),
            receivedByUserId: 'u1',
            verifiedDocuments,
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uses actor user when receiving at client destination', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        ...shipmentWithDocs,
        toAddressType: 'client',
      });
      prisma.courierShipment.update.mockResolvedValue({
        ...shipmentWithDocs,
        status: SHIPMENT_STATUS.RECEIVED,
        toAddressType: 'client',
        receivedByUserId: 'actor-1',
      });

      await service.receive(
        's1',
        {
          receivedAt: new Date().toISOString(),
          verifiedDocuments,
        },
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

    it('throws when a leg document is missing from verification payload', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue(shipmentWithDocs);

      await expect(
        service.receive(
          's1',
          {
            receivedAt: new Date().toISOString(),
            verifiedDocuments: [{ docType: 'passport', isReceived: true }],
          },
          'u1',
        ),
      ).rejects.toThrow(
        'Document type degree_certificate_original must be cross-checked before marking as received',
      );
    });

    it('throws when verification payload includes unknown document', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue(shipmentWithDocs);

      await expect(
        service.receive(
          's1',
          {
            receivedAt: new Date().toISOString(),
            verifiedDocuments: [
              ...verifiedDocuments,
              {
                docType: 'sslc_certificate_original',
                isReceived: true,
              },
            ],
          },
          'u1',
        ),
      ).rejects.toThrow(
        'Document type sslc_certificate_original is not on this leg',
      );
    });

    it('throws when leg has no documents', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        ...shipmentWithDocs,
        documents: [],
      });

      await expect(
        service.receive(
          's1',
          {
            receivedAt: new Date().toISOString(),
            verifiedDocuments: [{ docType: 'passport', isReceived: true }],
          },
          'u1',
        ),
      ).rejects.toThrow(
        'Cannot mark as received: leg has no documents to verify',
      );
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

  describe('attestation uploads', () => {
    const receivedShipment = {
      id: 'leg-1',
      candidateId: 'cand-1',
      projectId: 'proj-saudi',
      status: SHIPMENT_STATUS.RECEIVED,
      documents: [
        { id: 'd1', docType: 'degree_certificate_original' },
        { id: 'd2', docType: 'registration_certificate_original' },
        { id: 'd3', docType: 'pcc_original' },
        { id: 'd4', docType: 'sslc_certificate_original' },
        { id: 'd5', docType: 'plus_two_certificate_original' },
      ],
      candidate: { firstName: 'Abhi', lastName: 'Test' },
      collection: { id: 'col-1', status: 'completed' },
      project: { id: 'proj-saudi', title: 'Saudi MOH', client: null },
      mergedDocument: null,
      sentBy: null,
      approvedBy: null,
      receivedBy: null,
      createdBy: { id: 'u1', name: 'User', email: 'u@test.com' },
      fromAddressType: 'kochi',
      toAddressType: 'delhi',
    };

    beforeEach(() => {
      prisma.courierShipment.findUnique.mockResolvedValue(receivedShipment);
      prisma.project.findUnique.mockResolvedValue({
        id: 'proj-saudi',
        title: 'Saudi MOH',
        countryCode: 'SA',
      });
      prisma.processingCandidate.findFirst.mockResolvedValue({
        id: 'pc-1',
      });
      prisma.courierShipmentAttestationUpload.findMany.mockResolvedValue([]);
      prisma.processingStepDocument.findMany.mockResolvedValue([]);
    });

    it('returns an attested slot for every original document on the leg, regardless of country requirements', async () => {
      const result = await service.getAttestationEligibility(
        'leg-1',
        'proj-saudi',
      );

      const types = result.data.eligibleDocuments.map((d) => d.docType);
      expect(types).toEqual(
        expect.arrayContaining([
          'degree_certificate_attested',
          'registration_certificate_attested',
          'pcc_attested',
          'sslc_certificate_attested',
          'plus_two_certificate_attested',
        ]),
      );
      expect(types).toHaveLength(5);
      expect(result.data.countryCode).toBe('SA');
      expect(
        prisma.countryDocumentRequirement.findMany,
      ).not.toHaveBeenCalled();
      expect(prisma.processingStepTemplate.findUnique).not.toHaveBeenCalled();
    });

    it('marks slots verified by processing team and blocks re-upload', async () => {
      prisma.courierShipmentAttestationUpload.findMany.mockResolvedValue([
        {
          docType: 'degree_certificate_attested',
          documentId: 'doc-verified',
        },
      ]);
      prisma.processingStepDocument.findMany.mockResolvedValue([
        {
          candidateProjectDocumentVerification: {
            documentId: 'doc-verified',
          },
        },
      ]);

      const result = await service.getAttestationEligibility(
        'leg-1',
        'proj-saudi',
      );

      const degree = result.data.eligibleDocuments.find(
        (d) => d.docType === 'degree_certificate_attested',
      );
      expect(degree?.verifiedByProcessingTeam).toBe(true);
      expect(degree?.alreadyUploaded).toBe(true);

      await expect(
        service.createAttestationUpload(
          'leg-1',
          {
            projectId: 'proj-saudi',
            docType: 'degree_certificate_attested',
          },
          {
            buffer: Buffer.from('%PDF'),
            mimetype: 'application/pdf',
            originalname: 'degree.pdf',
          } as Express.Multer.File,
          'user-1',
        ),
      ).rejects.toThrow(/verified by the processing team/i);
    });

    it('rejects attestation upload when leg is not received', async () => {
      prisma.courierShipment.findUnique.mockResolvedValue({
        ...receivedShipment,
        status: SHIPMENT_STATUS.IN_TRANSIT,
      });

      await expect(
        service.createAttestationUpload(
          'leg-1',
          {
            projectId: 'proj-saudi',
            docType: 'degree_certificate_attested',
          },
          {
            buffer: Buffer.from('%PDF'),
            mimetype: 'application/pdf',
            originalname: 'degree.pdf',
          } as Express.Multer.File,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects attested upload for a document type not present on the leg', async () => {
      await expect(
        service.createAttestationUpload(
          'leg-1',
          {
            projectId: 'proj-saudi',
            // No passport document was sent on this leg.
            docType: 'passport_copy_attested',
          },
          {
            buffer: Buffer.from('%PDF'),
            mimetype: 'application/pdf',
            originalname: 'passport.pdf',
          } as Express.Multer.File,
          'user-1',
        ),
      ).rejects.toThrow(/not eligible/);
    });

    it('uploads individual attested PDF without creating CPDV rows', async () => {
      uploadService.uploadBuffer.mockResolvedValue({
        fileUrl: 'https://cdn.example/degree.pdf',
        fileName: 'degree.pdf',
        fileSize: 12,
        mimeType: 'application/pdf',
      });
      prisma.document.create.mockResolvedValue({
        id: 'doc-attest-1',
        fileName: 'degree.pdf',
        fileUrl: 'https://cdn.example/degree.pdf',
        mimeType: 'application/pdf',
        docType: 'degree_certificate_attested',
      });
      prisma.courierShipmentAttestationUpload.updateMany.mockResolvedValue({
        count: 0,
      });
      prisma.courierShipmentAttestationUpload.create.mockResolvedValue({
        id: 'upload-1',
        shipmentId: 'leg-1',
        projectId: 'proj-saudi',
        docType: 'degree_certificate_attested',
        remarks: null,
        uploadedAt: new Date(),
        replacedAt: null,
        document: {
          id: 'doc-attest-1',
          fileName: 'degree.pdf',
          fileUrl: 'https://cdn.example/degree.pdf',
          mimeType: 'application/pdf',
          docType: 'degree_certificate_attested',
        },
        project: {
          id: 'proj-saudi',
          title: 'Saudi MOH',
          countryCode: 'SA',
        },
        uploadedBy: { id: 'user-1', name: 'User', email: 'u@test.com' },
      });

      const result = await service.createAttestationUpload(
        'leg-1',
        {
          projectId: 'proj-saudi',
          docType: 'degree_certificate_attested',
          remarks: 'Ministry stamp',
        },
        {
          buffer: Buffer.from('%PDF-1.4'),
          mimetype: 'application/pdf',
          originalname: 'degree.pdf',
        } as Express.Multer.File,
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.data.docType).toBe('degree_certificate_attested');
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            docType: 'degree_certificate_attested',
            candidateId: 'cand-1',
          }),
        }),
      );
      expect(prisma.courierShipmentAttestationUpload.create).toHaveBeenCalled();
      expect(
        prisma.candidateProjectDocumentVerification.create,
      ).not.toHaveBeenCalled();
    });

    describe('merged attestation upload', () => {
      beforeEach(() => {
        prisma.$transaction.mockImplementation(async (callback) =>
          callback({
            document: prisma.document,
            courierShipmentAttestationUpload:
              prisma.courierShipmentAttestationUpload,
          }),
        );
      });

      it('rejects merged upload with fewer than 2 document types', async () => {
        await expect(
          service.createMergedAttestationUpload(
            'leg-1',
            {
              projectId: 'proj-saudi',
              docTypes: ['sslc_certificate_attested'],
            },
            {
              buffer: Buffer.from('%PDF'),
              mimetype: 'application/pdf',
              originalname: 'merged.pdf',
            } as Express.Multer.File,
            'user-1',
          ),
        ).rejects.toThrow(/at least 2/i);
      });

      it('rejects merged upload when a document type is not eligible on this leg', async () => {
        await expect(
          service.createMergedAttestationUpload(
            'leg-1',
            {
              projectId: 'proj-saudi',
              // No passport document was sent on this leg.
              docTypes: ['sslc_certificate_attested', 'passport_copy_attested'],
            },
            {
              buffer: Buffer.from('%PDF'),
              mimetype: 'application/pdf',
              originalname: 'merged.pdf',
            } as Express.Multer.File,
            'user-1',
          ),
        ).rejects.toThrow(/not eligible/);
      });

      it('uploads one PDF and creates a linked attestation row per merged document type', async () => {
        uploadService.uploadBuffer.mockResolvedValue({
          fileUrl: 'https://cdn.example/merged.pdf',
          fileName: 'merged.pdf',
          fileSize: 20,
          mimeType: 'application/pdf',
        });
        prisma.document.create.mockResolvedValue({
          id: 'doc-merged-1',
          fileName: 'merged.pdf',
          fileUrl: 'https://cdn.example/merged.pdf',
          mimeType: 'application/pdf',
          docType: 'merged_attested_documents',
        });
        prisma.courierShipmentAttestationUpload.updateMany.mockResolvedValue({
          count: 0,
        });
        const sharedDocument = {
          id: 'doc-merged-1',
          fileName: 'merged.pdf',
          fileUrl: 'https://cdn.example/merged.pdf',
          mimeType: 'application/pdf',
          docType: 'merged_attested_documents',
        };
        const sharedProject = {
          id: 'proj-saudi',
          title: 'Saudi MOH',
          countryCode: 'SA',
        };
        const sharedUploadedBy = {
          id: 'user-1',
          name: 'User',
          email: 'u@test.com',
        };
        prisma.courierShipmentAttestationUpload.create
          .mockResolvedValueOnce({
            id: 'upload-sslc',
            shipmentId: 'leg-1',
            projectId: 'proj-saudi',
            docType: 'sslc_certificate_attested',
            remarks: 'Combined scan',
            uploadedAt: new Date(),
            replacedAt: null,
            document: sharedDocument,
            project: sharedProject,
            uploadedBy: sharedUploadedBy,
          })
          .mockResolvedValueOnce({
            id: 'upload-plustwo',
            shipmentId: 'leg-1',
            projectId: 'proj-saudi',
            docType: 'plus_two_certificate_attested',
            remarks: 'Combined scan',
            uploadedAt: new Date(),
            replacedAt: null,
            document: sharedDocument,
            project: sharedProject,
            uploadedBy: sharedUploadedBy,
          });

        const result = await service.createMergedAttestationUpload(
          'leg-1',
          {
            projectId: 'proj-saudi',
            docTypes: [
              'sslc_certificate_attested',
              'plus_two_certificate_attested',
            ],
            remarks: 'Combined scan',
          },
          {
            buffer: Buffer.from('%PDF-1.4'),
            mimetype: 'application/pdf',
            originalname: 'merged.pdf',
          } as Express.Multer.File,
          'user-1',
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data.map((d) => d.docType)).toEqual(
          expect.arrayContaining([
            'sslc_certificate_attested',
            'plus_two_certificate_attested',
          ]),
        );
        expect(result.data[0].document.id).toBe('doc-merged-1');
        expect(result.data[1].document.id).toBe('doc-merged-1');
        expect(prisma.document.create).toHaveBeenCalledTimes(1);
        expect(prisma.document.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              docType: 'merged_attested_documents',
              candidateId: 'cand-1',
            }),
          }),
        );
        expect(
          prisma.courierShipmentAttestationUpload.create,
        ).toHaveBeenCalledTimes(2);
      });
    });

    it('paginates attestation projects with default limit 10', async () => {
      prisma.processingCandidate.count.mockResolvedValue(12);
      prisma.processingCandidate.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `pc-${i}`,
          projectId: `proj-${i}`,
          processingStatus: 'assigned',
          project: {
            id: `proj-${i}`,
            title: `Project ${i}`,
            countryCode: 'SA',
            country: { code: 'SA', name: 'Saudi Arabia' },
          },
        })),
      );

      const result = await service.getAttestationProjects('leg-1');

      expect(prisma.processingCandidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          select: expect.objectContaining({
            project: expect.objectContaining({
              select: expect.objectContaining({
                country: { select: { code: true, name: true } },
              }),
            }),
          }),
        }),
      );
      expect(result.data.projects).toHaveLength(10);
      expect(result.data.projects[0]).toEqual(
        expect.objectContaining({
          countryCode: 'SA',
          countryName: 'Saudi Arabia',
        }),
      );
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 12,
        totalPages: 2,
      });
    });

    it('respects page for attestation projects', async () => {
      prisma.processingCandidate.count.mockResolvedValue(12);
      prisma.processingCandidate.findMany.mockResolvedValue([
        {
          id: 'pc-10',
          projectId: 'proj-10',
          processingStatus: 'assigned',
          project: {
            id: 'proj-10',
            title: 'Project 10',
            countryCode: 'SA',
            country: { code: 'SA', name: 'Saudi Arabia' },
          },
        },
        {
          id: 'pc-11',
          projectId: 'proj-11',
          processingStatus: 'assigned',
          project: {
            id: 'proj-11',
            title: 'Project 11',
            countryCode: 'SA',
            country: { code: 'SA', name: 'Saudi Arabia' },
          },
        },
      ]);

      const result = await service.getAttestationProjects('leg-1', 2, 10);

      expect(prisma.processingCandidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.data.pagination.page).toBe(2);
      expect(result.data.projects).toHaveLength(2);
    });

    it('paginates attestation uploads with default limit 10', async () => {
      prisma.courierShipmentAttestationUpload.count.mockResolvedValue(15);
      prisma.courierShipmentAttestationUpload.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `up-${i}`,
          shipmentId: 'leg-1',
          projectId: 'proj-saudi',
          docType: 'degree_certificate_attested',
          remarks: null,
          uploadedAt: new Date(),
          replacedAt: null,
          document: {
            id: `doc-${i}`,
            fileName: 'a.pdf',
            fileUrl: 'https://cdn.example/a.pdf',
            mimeType: 'application/pdf',
            docType: 'degree_certificate_attested',
          },
          project: {
            id: 'proj-saudi',
            title: 'Saudi MOH',
            countryCode: 'SA',
          },
          uploadedBy: { id: 'user-1', name: 'User', email: 'u@test.com' },
        })),
      );

      const result = await service.listAttestationUploads('leg-1', {
        projectId: 'proj-saudi',
      });

      expect(prisma.courierShipmentAttestationUpload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: {
            shipmentId: 'leg-1',
            projectId: 'proj-saudi',
          },
        }),
      );
      expect(result.data.uploads).toHaveLength(10);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
      });
    });
  });
});
