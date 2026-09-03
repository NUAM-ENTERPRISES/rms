import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../notifications/outbox.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { UploadService } from '../upload/upload.service';
import { UploadCompressionService } from '../upload/upload-compression.service';
import { getEffectiveMaxBytes } from '../upload/upload.constants';
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_META,
  DOCUMENT_VARIANT,
  getDocumentTypeRelation,
} from '../common/constants/document-types';
import { DOCUMENT_STATUS } from '../common/constants';
import {
  ADDRESS_TYPE_LABELS,
  DELIVERY_MODE,
  OFFICE_ADDRESS_TYPES,
  SHIPMENT_STATUS,
} from './constants/shipment-types';
import { CreateAttestationUploadDto } from './dto/create-attestation-upload.dto';
import { CreateMergedAttestationUploadDto } from './dto/create-merged-attestation-upload.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { ListAttestationUploadsQueryDto } from './dto/list-attestation-uploads-query.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';
import { MarkHandoverDto } from './dto/mark-handover.dto';
import { MarkReceivedDto } from './dto/mark-received.dto';
import { UpdateCourierTrackingDto } from './dto/update-courier-tracking.dto';
import { ADDRESS_TYPE } from './constants/shipment-types';

type AddressSnapshotInput = {
  address?: string;
  pincode?: string;
  phone?: string;
  altPhone?: string;
};

const candidateSelect = {
  id: true,
  firstName: true,
  lastName: true,
  candidateCode: true,
  lockerFileNumber: true,
  profileImage: true,
  email: true,
  address: true,
  addressPincode: true,
  addressCountryCode: true,
  addressStateId: true,
  countryCode: true,
  mobileNumber: true,
  alternatePhone: true,
  addressCountry: { select: { code: true, name: true } },
  addressState: { select: { id: true, name: true } },
} satisfies Prisma.CandidateSelect;

const userBrief = {
  select: { id: true, name: true, email: true },
} as const;

const shipmentInclude = {
  candidate: { select: candidateSelect },
  collection: {
    select: {
      id: true,
      status: true,
      lockerFileNumber: true,
      mergedDocumentId: true,
    },
  },
  project: {
    select: {
      id: true,
      title: true,
      client: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          addressCountryCode: true,
          addressStateId: true,
          addressCountry: { select: { code: true, name: true } },
          addressState: { select: { id: true, name: true } },
        },
      },
    },
  },
  mergedDocument: {
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
    },
  },
  sentBy: userBrief,
  approvedBy: userBrief,
  receivedBy: userBrief,
  createdBy: userBrief,
  documents: true,
} satisfies Prisma.CourierShipmentInclude;

type ShipmentWithRelations = Prisma.CourierShipmentGetPayload<{
  include: typeof shipmentInclude;
}>;

@Injectable()
export class CourierShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly systemConfigService: SystemConfigService,
    private readonly uploadService: UploadService,
    private readonly uploadCompressionService: UploadCompressionService,
  ) {}

  async getStats() {
    const shipments = await this.prisma.courierShipment.findMany({
      select: {
        candidateId: true,
        status: true,
        deliveryMode: true,
        purposeType: true,
      },
    });

    const legsByCandidate = new Map<
      string,
      Array<{
        status: string;
        deliveryMode: string;
        purposeType: string;
      }>
    >();

    for (const s of shipments) {
      const list = legsByCandidate.get(s.candidateId) ?? [];
      list.push({
        status: s.status,
        deliveryMode: s.deliveryMode,
        purposeType: s.purposeType,
      });
      legsByCandidate.set(s.candidateId, list);
    }

    let candidatesInTransit = 0;
    let candidatesReceived = 0;
    let candidatesCourier = 0;
    let candidatesDirect = 0;
    let candidatesReturn = 0;

    for (const legs of legsByCandidate.values()) {
      if (legs.some((l) => l.status === SHIPMENT_STATUS.IN_TRANSIT)) {
        candidatesInTransit += 1;
      }
      if (legs.some((l) => l.status === SHIPMENT_STATUS.RECEIVED)) {
        candidatesReceived += 1;
      }
      if (legs.some((l) => l.deliveryMode === DELIVERY_MODE.COURIER)) {
        candidatesCourier += 1;
      }
      if (legs.some((l) => l.deliveryMode === DELIVERY_MODE.DIRECT)) {
        candidatesDirect += 1;
      }
      if (legs.some((l) => l.purposeType === 'return')) {
        candidatesReturn += 1;
      }
    }

    return {
      success: true,
      data: {
        totalCandidates: legsByCandidate.size,
        totalLegs: shipments.length,
        candidatesInTransit,
        candidatesReceived,
        candidatesCourier,
        candidatesDirect,
        candidatesReturn,
      },
    };
  }

  async findCandidateGroups(query: ListShipmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildListWhere(query);

    const matching = await this.prisma.courierShipment.findMany({
      where,
      select: {
        candidateId: true,
        createdAt: true,
        sentAt: true,
      },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    });

    const orderedCandidateIds: string[] = [];
    const seen = new Set<string>();
    for (const row of matching) {
      if (!seen.has(row.candidateId)) {
        seen.add(row.candidateId);
        orderedCandidateIds.push(row.candidateId);
      }
    }

    const total = orderedCandidateIds.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const pageCandidateIds = orderedCandidateIds.slice(
      (page - 1) * limit,
      page * limit,
    );

    if (pageCandidateIds.length === 0) {
      return {
        success: true,
        data: {
          groups: [],
          pagination: { page, limit, total, totalPages },
        },
      };
    }

    const allLegs = await this.prisma.courierShipment.findMany({
      where: { candidateId: { in: pageCandidateIds } },
      include: shipmentInclude,
      orderBy: { legNumber: 'asc' },
    });

    const enrichedLegs = allLegs.map((s) => this.enrichShipment(s));
    const legsByCandidate = new Map<string, typeof enrichedLegs>();
    for (const leg of enrichedLegs) {
      const list = legsByCandidate.get(leg.candidateId) ?? [];
      list.push(leg);
      legsByCandidate.set(leg.candidateId, list);
    }

    const groups = pageCandidateIds.map((candidateId) =>
      this.buildCandidateGroup(
        candidateId,
        legsByCandidate.get(candidateId) ?? [],
        query,
      ),
    );

    return {
      success: true,
      data: {
        groups,
        pagination: { page, limit, total, totalPages },
      },
    };
  }

  async findAll(query: ListShipmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildListWhere(query);

    const [total, shipments] = await Promise.all([
      this.prisma.courierShipment.count({ where }),
      this.prisma.courierShipment.findMany({
        where,
        include: shipmentInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        shipments: shipments.map((s) => this.enrichShipment(s)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  }

  async findOne(id: string) {
    const shipment = await this.findOrThrow(id);
    return { success: true, data: this.enrichShipment(shipment) };
  }

  /**
   * Returns all courier legs for one candidate (ordered by legNumber).
   * Not paginated: pipeline / movement UIs need the full timeline, and
   * candidates typically have only a small number of legs.
   */
  async findByCandidate(candidateId: string) {
    await this.assertCandidateExists(candidateId);
    const shipments = await this.prisma.courierShipment.findMany({
      where: { candidateId },
      include: shipmentInclude,
      orderBy: { legNumber: 'asc' },
    });

    return {
      success: true,
      data: shipments.map((s) => this.enrichShipment(s)),
    };
  }

  async getPipeline(candidateId: string) {
    const result = await this.findByCandidate(candidateId);
    const legs = result.data;
    const receivedLegs = legs.filter(
      (l) => l.status === SHIPMENT_STATUS.RECEIVED,
    ).length;
    const lastReceived = [...legs]
      .reverse()
      .find((l) => l.status === SHIPMENT_STATUS.RECEIVED);

    const currentLocationHint = lastReceived
      ? ADDRESS_TYPE_LABELS[lastReceived.toAddressType] ??
        lastReceived.toAddressType
      : null;

    return {
      success: true,
      data: {
        legs,
        receivedLegs,
        totalLegs: legs.length,
        currentLocationHint,
      },
    };
  }

  async getOfficeAddresses() {
    const data = await this.systemConfigService.getOfficeAddresses();
    return {
      success: true,
      data,
    };
  }

  async getCollectionDocs(candidateId: string) {
    const collection =
      await this.prisma.originalDocumentCollection.findUnique({
        where: { candidateId },
        include: {
          events: { include: { items: true }, orderBy: { collectedAt: 'asc' } },
        },
      });

    if (!collection) {
      throw new NotFoundException(
        'No original document collection found for this candidate',
      );
    }

    const cumulativeReceived = this.buildCumulativeReceived(collection.events);

    return {
      success: true,
      data: {
        collectionId: collection.id,
        lockerFileNumber: collection.lockerFileNumber,
        mergedDocumentId: collection.mergedDocumentId,
        cumulativeReceived,
      },
    };
  }

  async create(dto: CreateShipmentDto, userId: string) {
    const collection = await this.prisma.originalDocumentCollection.findUnique({
      where: { candidateId: dto.candidateId },
      include: {
        events: { include: { items: true }, orderBy: { collectedAt: 'asc' } },
      },
    });

    if (!collection) {
      throw new BadRequestException(
        'Candidate must have an original document collection before creating a courier leg',
      );
    }

    const cumulative = this.buildCumulativeReceived(collection.events);
    const receivedTypes = new Set(cumulative.map((c) => c.docType));

    for (const docType of dto.docTypes) {
      if (!receivedTypes.has(docType)) {
        throw new BadRequestException(
          `Document type ${docType} has not been received in the original collection`,
        );
      }
    }

    const maxLeg = await this.prisma.courierShipment.aggregate({
      where: { candidateId: dto.candidateId },
      _max: { legNumber: true },
    });
    const legNumber = (maxLeg._max.legNumber ?? 0) + 1;

    const shipment = await this.prisma.courierShipment.create({
      data: {
        candidateId: dto.candidateId,
        collectionId: collection.id,
        projectId: dto.projectId ?? null,
        legNumber,
        purposeType: dto.purposeType,
        deliveryMode: dto.deliveryMode,
        status: SHIPMENT_STATUS.DRAFT,
        fromAddressType: dto.fromAddressType,
        toAddressType: dto.toAddressType,
        fromAddressSnapshot: (dto.fromAddressSnapshot ?? {}) as Prisma.InputJsonValue,
        toAddressSnapshot: (dto.toAddressSnapshot ?? {}) as Prisma.InputJsonValue,
        lockerFileNumber: collection.lockerFileNumber,
        mergedDocumentId: collection.mergedDocumentId,
        remarks: dto.remarks,
        createdByUserId: userId,
        documents: {
          create: dto.docTypes.map((docType) => ({ docType })),
        },
      },
      include: shipmentInclude,
    });

    if (dto.fromAddressType === ADDRESS_TYPE.CANDIDATE && dto.fromAddressSnapshot) {
      await this.syncCandidateMailingFromSnapshot(
        dto.candidateId,
        dto.fromAddressSnapshot as AddressSnapshotInput,
      );
    }
    if (dto.toAddressType === ADDRESS_TYPE.CANDIDATE && dto.toAddressSnapshot) {
      await this.syncCandidateMailingFromSnapshot(
        dto.candidateId,
        dto.toAddressSnapshot as AddressSnapshotInput,
      );
    }

    return { success: true, data: this.enrichShipment(shipment) };
  }

  async dispatch(id: string, dto: DispatchShipmentDto) {
    const shipment = await this.findOrThrow(id);

    if (shipment.deliveryMode !== DELIVERY_MODE.COURIER) {
      throw new BadRequestException(
        'Dispatch is only for courier delivery mode. Use handover for direct transfers.',
      );
    }
    if (shipment.status !== SHIPMENT_STATUS.DRAFT) {
      throw new BadRequestException('Only draft legs can be dispatched');
    }

    const updated = await this.prisma.courierShipment.update({
      where: { id },
      data: {
        trackingId: dto.trackingId?.trim() || null,
        courierPartner: dto.courierPartner ?? null,
        sentAt: new Date(dto.sentAt),
        sentByUserId: dto.sentByUserId,
        approvedByUserId: dto.approvedByUserId,
        status: SHIPMENT_STATUS.IN_TRANSIT,
      },
      include: shipmentInclude,
    });

    return { success: true, data: this.enrichShipment(updated) };
  }

  async updateCourierTracking(id: string, dto: UpdateCourierTrackingDto) {
    const shipment = await this.findOrThrow(id);

    if (shipment.deliveryMode !== DELIVERY_MODE.COURIER) {
      throw new BadRequestException(
        'Tracking details can only be updated for courier delivery legs',
      );
    }
    if (shipment.status !== SHIPMENT_STATUS.IN_TRANSIT) {
      throw new BadRequestException(
        'Only in-transit courier legs can have tracking details updated',
      );
    }

    const hasTrackingUpdate = dto.trackingId !== undefined;
    const hasPartnerUpdate = dto.courierPartner !== undefined;
    if (!hasTrackingUpdate && !hasPartnerUpdate) {
      throw new BadRequestException(
        'Provide trackingId and/or courierPartner to update',
      );
    }

    const updated = await this.prisma.courierShipment.update({
      where: { id },
      data: {
        ...(hasTrackingUpdate
          ? { trackingId: dto.trackingId?.trim() || null }
          : {}),
        ...(hasPartnerUpdate ? { courierPartner: dto.courierPartner ?? null } : {}),
      },
      include: shipmentInclude,
    });

    return { success: true, data: this.enrichShipment(updated) };
  }

  async handover(id: string, dto: MarkHandoverDto) {
    const shipment = await this.findOrThrow(id);

    if (shipment.deliveryMode !== DELIVERY_MODE.DIRECT) {
      throw new BadRequestException(
        'Handover is only for direct delivery mode. Use dispatch for courier legs.',
      );
    }
    if (shipment.status !== SHIPMENT_STATUS.DRAFT) {
      throw new BadRequestException('Only draft legs can be handed over');
    }

    const updated = await this.prisma.courierShipment.update({
      where: { id },
      data: {
        sentAt: new Date(dto.sentAt),
        sentByUserId: dto.sentByUserId,
        approvedByUserId: dto.approvedByUserId,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        trackingId: null,
        courierPartner: null,
      },
      include: shipmentInclude,
    });

    return { success: true, data: this.enrichShipment(updated) };
  }

  async receive(id: string, dto: MarkReceivedDto, actorUserId: string) {
    const shipment = await this.findOrThrow(id);

    if (shipment.status !== SHIPMENT_STATUS.IN_TRANSIT) {
      throw new BadRequestException(
        'Only in-transit legs can be marked as received',
      );
    }

    const expectedDocTypes = shipment.documents.map((doc) => doc.docType);
    this.assertDocumentReceiptsValid(expectedDocTypes, dto.verifiedDocuments);

    const isOfficeDest = (OFFICE_ADDRESS_TYPES as readonly string[]).includes(
      shipment.toAddressType,
    );

    const receivedByUserId = dto.receivedByUserId ?? actorUserId;
    const receivedAt = new Date(dto.receivedAt);
    const receiptByDocType = new Map(
      dto.verifiedDocuments.map((doc) => [doc.docType, doc]),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const shipmentUpdate = await tx.courierShipment.update({
        where: { id },
        data: {
          receivedAt,
          receivedByUserId,
          receivedByName: dto.receivedByName?.trim() ?? null,
          status: SHIPMENT_STATUS.RECEIVED,
        },
        include: shipmentInclude,
      });

      await Promise.all(
        shipment.documents.map((doc) => {
          const receipt = receiptByDocType.get(doc.docType);
          return tx.courierShipmentDocument.update({
            where: { id: doc.id },
            data: {
              receiveVerifiedAt: receipt?.isReceived ? receivedAt : null,
              receiveRemarks: receipt?.remarks?.trim() ?? null,
            },
          });
        }),
      );

      return shipmentUpdate;
    });

    if (isOfficeDest) {
      await this.outboxService.publishCourierShipmentReceived(
        id,
        receivedByUserId,
      );
    }

    return { success: true, data: this.enrichShipment(updated) };
  }

  async getAttestationProjects(
    shipmentId: string,
    page = 1,
    limit = 10,
  ) {
    const shipment = await this.findOrThrow(shipmentId);
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 10));
    const skip = (safePage - 1) * safeLimit;

    const where = {
      candidateId: shipment.candidateId,
      processingStatus: { not: 'cancelled' as const },
    };

    const [total, processingCandidates] = await Promise.all([
      this.prisma.processingCandidate.count({ where }),
      this.prisma.processingCandidate.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          processingStatus: true,
          project: {
            select: {
              id: true,
              title: true,
              countryCode: true,
              country: {
                select: { code: true, name: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const projects = processingCandidates
      .filter((pc) => pc.project != null)
      .map((pc) => ({
        projectId: pc.project!.id,
        title: pc.project!.title,
        countryCode: pc.project!.countryCode,
        countryName: pc.project!.country?.name ?? null,
        processingCandidateId: pc.id,
        processingStatus: pc.processingStatus,
        isShipmentProject: shipment.projectId === pc.project!.id,
      }));

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      success: true,
      data: {
        shipmentId: shipment.id,
        shipmentStatus: shipment.status,
        defaultProjectId: shipment.projectId,
        projects,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      },
    };
  }

  async getAttestationEligibility(shipmentId: string, projectId: string) {
    const shipment = await this.findOrThrow(shipmentId);
    this.assertShipmentReceivedForAttestation(shipment.status);

    const { project, processingCandidateId } =
      await this.assertProjectEligibleForShipment(
        shipment.candidateId,
        projectId,
      );

    const countryCode = project.countryCode ?? null;

    const eligible: Array<{
      docType: string;
      label: string;
      baseDocType: string;
      alreadyUploaded: boolean;
      verifiedByProcessingTeam: boolean;
    }> = [];

    const seen = new Set<string>();
    for (const legDoc of shipment.documents) {
      const relation = getDocumentTypeRelation(legDoc.docType);
      if (!relation || relation.variant !== DOCUMENT_VARIANT.ORIGINAL) continue;
      if (relation.baseType === DOCUMENT_TYPE.ORIGINAL_DOCUMENTS_BUNDLE) continue;

      const attestedDocType = `${relation.baseType}_attested`;
      if (seen.has(attestedDocType)) continue;
      seen.add(attestedDocType);
      eligible.push({
        docType: attestedDocType,
        label: this.deriveAttestedLabel(
          legDoc.docType,
          relation.baseType,
          attestedDocType,
        ),
        baseDocType: relation.baseType,
        alreadyUploaded: false,
        verifiedByProcessingTeam: false,
      });
    }

    const activeUploads =
      await this.prisma.courierShipmentAttestationUpload.findMany({
        where: {
          shipmentId,
          projectId,
          replacedAt: null,
          docType: { in: eligible.map((e) => e.docType) },
        },
        select: { docType: true, documentId: true },
      });
    const uploaded = new Set(activeUploads.map((u) => u.docType));
    const documentIdByDocType = new Map(
      activeUploads.map((u) => [u.docType, u.documentId]),
    );
    const verifiedDocumentIds =
      await this.resolveProcessingVerifiedAttestationDocumentIds(
        processingCandidateId,
        Array.from(documentIdByDocType.values()),
      );
    for (const slot of eligible) {
      slot.alreadyUploaded = uploaded.has(slot.docType);
      const documentId = documentIdByDocType.get(slot.docType);
      slot.verifiedByProcessingTeam =
        !!documentId && verifiedDocumentIds.has(documentId);
    }

    return {
      success: true,
      data: {
        shipmentId,
        projectId,
        processingCandidateId,
        countryCode,
        projectTitle: project.title,
        eligibleDocuments: eligible,
      },
    };
  }

  async listAttestationUploads(
    shipmentId: string,
    query: ListAttestationUploadsQueryDto,
  ) {
    const shipment = await this.findOrThrow(shipmentId);

    const safePage = Math.max(1, query.page || 1);
    const safeLimit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (safePage - 1) * safeLimit;

    const where = {
      shipmentId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };

    const [total, uploads] = await Promise.all([
      this.prisma.courierShipmentAttestationUpload.count({ where }),
      this.prisma.courierShipmentAttestationUpload.findMany({
        where,
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              mimeType: true,
              docType: true,
            },
          },
          project: {
            select: { id: true, title: true, countryCode: true },
          },
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const verifiedDocumentIdsByProject = new Map<string, Set<string>>();
    const projectIds = [...new Set(uploads.map((u) => u.projectId))];
    await Promise.all(
      projectIds.map(async (projectId) => {
        const activeDocumentIds = uploads
          .filter((u) => u.projectId === projectId && u.replacedAt == null)
          .map((u) => u.document.id);
        const verified =
          await this.resolveProcessingVerifiedAttestationDocumentIdsForProject(
            shipment.candidateId,
            projectId,
            activeDocumentIds,
          );
        verifiedDocumentIdsByProject.set(projectId, verified);
      }),
    );

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      success: true,
      data: {
        uploads: uploads.map((u) =>
          this.mapAttestationUploadRow(
            u,
            this.deriveAttestedLabel(u.docType, this.stripAttestedSuffix(u.docType), u.docType),
            {
              verifiedByProcessingTeam:
                u.replacedAt == null &&
                (verifiedDocumentIdsByProject.get(u.projectId)?.has(u.document.id) ??
                  false),
            },
          ),
        ),
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      },
    };
  }

  async createAttestationUpload(
    shipmentId: string,
    dto: CreateAttestationUploadDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ) {
    const shipment = await this.findOrThrow(shipmentId);
    this.assertShipmentReceivedForAttestation(shipment.status);

    if (!file?.buffer?.length) {
      throw new BadRequestException('Please upload a PDF file.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        'Only PDF files can be used for attested uploads. Please choose a PDF.',
      );
    }

    const eligibility = await this.getAttestationEligibility(
      shipmentId,
      dto.projectId,
    );
    const slot = eligibility.data.eligibleDocuments.find(
      (d) => d.docType === dto.docType,
    );
    if (!slot) {
      throw new BadRequestException(
        `Document type ${dto.docType} is not eligible for attestation on this leg for the selected project`,
      );
    }
    if (slot.verifiedByProcessingTeam) {
      throw new BadRequestException(
        'This attested document has been verified by the processing team and cannot be replaced',
      );
    }

    const prepared = await this.uploadCompressionService.prepareFile(
      file,
      getEffectiveMaxBytes(dto.docType),
      DOCUMENT_TYPE_META[dto.docType as keyof typeof DOCUMENT_TYPE_META]
        ?.displayName ?? dto.docType,
    );

    const folder = `candidates/documents/${shipment.candidateId}/${dto.docType}`;
    const safeName = prepared.originalname?.replace(/[^\w.\-]+/g, '_') || 'attested.pdf';
    const fileName = `${Date.now()}_${safeName}`;

    const upload = await this.uploadService.uploadBuffer(
      prepared.buffer,
      folder,
      fileName,
      prepared.mimetype,
    );

    const document = await this.prisma.document.create({
      data: {
        candidateId: shipment.candidateId,
        docType: dto.docType,
        fileName: upload.fileName,
        fileUrl: upload.fileUrl,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        uploadedBy: userId,
        status: 'pending',
        notes: dto.remarks?.trim() || null,
      },
    });

    const now = new Date();
    await this.prisma.courierShipmentAttestationUpload.updateMany({
      where: {
        shipmentId,
        projectId: dto.projectId,
        docType: dto.docType,
        replacedAt: null,
      },
      data: { replacedAt: now },
    });

    const row = await this.prisma.courierShipmentAttestationUpload.create({
      data: {
        shipmentId,
        projectId: dto.projectId,
        docType: dto.docType,
        documentId: document.id,
        remarks: dto.remarks?.trim() || null,
        uploadedByUserId: userId,
      },
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            docType: true,
          },
        },
        project: {
          select: { id: true, title: true, countryCode: true },
        },
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      success: true,
      data: this.mapAttestationUploadRow(row, slot.label),
      message: 'Attested document uploaded',
    };
  }

  /**
   * Uploads a single PDF that covers two or more attested document types at
   * once (e.g. SSLC + Plus Two merged into one scan). Creates one Document
   * row and one CourierShipmentAttestationUpload row per selected docType,
   * all pointing at the same uploaded file.
   */
  async createMergedAttestationUpload(
    shipmentId: string,
    dto: CreateMergedAttestationUploadDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ) {
    const shipment = await this.findOrThrow(shipmentId);
    this.assertShipmentReceivedForAttestation(shipment.status);

    if (!file?.buffer?.length) {
      throw new BadRequestException('Please upload a PDF file.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        'Only PDF files can be used for attested uploads. Please choose a PDF.',
      );
    }

    const docTypes = Array.from(new Set(dto.docTypes));
    if (docTypes.length < 2) {
      throw new BadRequestException(
        'Select at least 2 documents to merge into one PDF',
      );
    }

    const eligibility = await this.getAttestationEligibility(
      shipmentId,
      dto.projectId,
    );
    const labelByType = new Map(
      eligibility.data.eligibleDocuments.map((d) => [d.docType, d.label]),
    );
    const missing = docTypes.filter((t) => !labelByType.has(t));
    if (missing.length > 0) {
      throw new BadRequestException(
        `The following document types are not eligible for attestation on this leg for the selected project: ${missing.join(', ')}`,
      );
    }
    const verifiedSlots = eligibility.data.eligibleDocuments.filter(
      (d) => docTypes.includes(d.docType) && d.verifiedByProcessingTeam,
    );
    if (verifiedSlots.length > 0) {
      throw new BadRequestException(
        `Cannot replace attested documents verified by the processing team: ${verifiedSlots.map((s) => s.label).join(', ')}`,
      );
    }

    const prepared = await this.uploadCompressionService.prepareFile(
      file,
      getEffectiveMaxBytes(DOCUMENT_TYPE.MERGED_ATTESTED_DOCUMENTS),
      DOCUMENT_TYPE_META[DOCUMENT_TYPE.MERGED_ATTESTED_DOCUMENTS]?.displayName ??
        'Merged attested documents',
    );

    const folder = `candidates/documents/${shipment.candidateId}/merged_attested`;
    const safeName =
      prepared.originalname?.replace(/[^\w.\-]+/g, '_') || 'attested-merged.pdf';
    const fileName = `${Date.now()}_${safeName}`;

    const uploadResult = await this.uploadService.uploadBuffer(
      prepared.buffer,
      folder,
      fileName,
      prepared.mimetype,
    );

    const remarks = dto.remarks?.trim() || null;
    const now = new Date();

    const rows = await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          candidateId: shipment.candidateId,
          docType: DOCUMENT_TYPE.MERGED_ATTESTED_DOCUMENTS,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          uploadedBy: userId,
          status: 'pending',
          notes: remarks,
        },
      });

      await tx.courierShipmentAttestationUpload.updateMany({
        where: {
          shipmentId,
          projectId: dto.projectId,
          docType: { in: docTypes },
          replacedAt: null,
        },
        data: { replacedAt: now },
      });

      const created = await Promise.all(
        docTypes.map((docType) =>
          tx.courierShipmentAttestationUpload.create({
            data: {
              shipmentId,
              projectId: dto.projectId,
              docType,
              documentId: document.id,
              remarks,
              uploadedByUserId: userId,
            },
            include: {
              document: {
                select: {
                  id: true,
                  fileName: true,
                  fileUrl: true,
                  mimeType: true,
                  docType: true,
                },
              },
              project: {
                select: { id: true, title: true, countryCode: true },
              },
              uploadedBy: { select: { id: true, name: true, email: true } },
            },
          }),
        ),
      );
      return created;
    });

    return {
      success: true,
      data: rows.map((row) =>
        this.mapAttestationUploadRow(
          row,
          labelByType.get(row.docType) ?? row.docType,
        ),
      ),
      message: `Merged attested document uploaded for ${docTypes.length} document types`,
    };
  }

  private mapAttestationUploadRow(
    row: {
      id: string;
      shipmentId: string;
      projectId: string;
      project: { id: string; title: string; countryCode: string | null } | null;
      docType: string;
      remarks: string | null;
      uploadedAt: Date;
      replacedAt: Date | null;
      document: {
        id: string;
        fileName: string;
        fileUrl: string;
        mimeType: string | null;
        docType: string;
      };
      uploadedBy: { id: string; name: string; email: string } | null;
    },
    label: string,
    extras?: { verifiedByProcessingTeam?: boolean },
  ) {
    return {
      id: row.id,
      shipmentId: row.shipmentId,
      projectId: row.projectId,
      project: row.project,
      docType: row.docType,
      label,
      remarks: row.remarks,
      uploadedAt: row.uploadedAt,
      replacedAt: row.replacedAt,
      isActive: row.replacedAt == null,
      verifiedByProcessingTeam: extras?.verifiedByProcessingTeam ?? false,
      document: row.document,
      uploadedBy: row.uploadedBy,
    };
  }

  private async resolveProcessingVerifiedAttestationDocumentIdsForProject(
    candidateId: string,
    projectId: string,
    documentIds: string[],
  ): Promise<Set<string>> {
    if (!documentIds.length) return new Set();

    const processingCandidate = await this.prisma.processingCandidate.findFirst({
      where: {
        candidateId,
        projectId,
        processingStatus: { not: 'cancelled' },
      },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!processingCandidate) return new Set();

    return this.resolveProcessingVerifiedAttestationDocumentIds(
      processingCandidate.id,
      documentIds,
    );
  }

  private async resolveProcessingVerifiedAttestationDocumentIds(
    processingCandidateId: string,
    documentIds: string[],
  ): Promise<Set<string>> {
    if (!documentIds.length) return new Set();

    const rows = await this.prisma.processingStepDocument.findMany({
      where: {
        status: DOCUMENT_STATUS.VERIFIED,
        processingStep: {
          processingCandidateId,
          template: { key: 'document_attestation' },
        },
        candidateProjectDocumentVerification: {
          documentId: { in: documentIds },
          isProcessingReplaced: false,
          isDeleted: false,
        },
      },
      select: {
        candidateProjectDocumentVerification: {
          select: { documentId: true },
        },
      },
    });

    return new Set(
      rows.map((row) => row.candidateProjectDocumentVerification.documentId),
    );
  }

  private assertShipmentReceivedForAttestation(status: string) {
    if (status !== SHIPMENT_STATUS.RECEIVED) {
      throw new BadRequestException(
        'Attested documents can only be uploaded after the leg is received',
      );
    }
  }

  private async assertProjectEligibleForShipment(
    candidateId: string,
    projectId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, countryCode: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const processingCandidate = await this.prisma.processingCandidate.findFirst({
      where: {
        candidateId,
        projectId,
        processingStatus: { not: 'cancelled' },
      },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!processingCandidate) {
      throw new BadRequestException(
        'Candidate is not in active processing for the selected project',
      );
    }

    return {
      project,
      processingCandidateId: processingCandidate.id,
    };
  }

  /** Best-effort base type recovery from an attested docType string. */
  private stripAttestedSuffix(docType: string): string {
    return docType.endsWith('_attested')
      ? docType.slice(0, -'_attested'.length)
      : docType;
  }

  /**
   * Derives a human-readable label for an attested document slot without
   * requiring a hardcoded per-type constant. Prefers metadata for the
   * attested type itself, then falls back to the original document's
   * label (stripping "(Original)"), then a humanized base type.
   */
  private deriveAttestedLabel(
    originalDocType: string,
    baseType: string,
    attestedDocType: string,
  ): string {
    const attestedMeta =
      DOCUMENT_TYPE_META[attestedDocType as keyof typeof DOCUMENT_TYPE_META];
    if (attestedMeta?.displayName) return attestedMeta.displayName;

    const originalMeta =
      DOCUMENT_TYPE_META[originalDocType as keyof typeof DOCUMENT_TYPE_META];
    if (originalMeta?.displayName) {
      const stripped = originalMeta.displayName
        .replace(/\s*\(original\)\s*$/i, '')
        .trim();
      if (stripped) return `${stripped} (Attested)`;
    }

    const humanized = baseType
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${humanized} (Attested)`;
  }

  async exportCsv(query: ListShipmentsQueryDto) {
    const where = this.buildListWhere(query);
    const shipments = await this.prisma.courierShipment.findMany({
      where,
      include: shipmentInclude,
      orderBy: { createdAt: 'desc' },
    });

    const header =
      'Leg,Candidate Code,Candidate Name,Purpose,Mode,Status,From,To,Tracking,Partner,Sent At,Received At,Locker File\n';
    const rows = shipments.map((s) => {
      const name = `${s.candidate.firstName} ${s.candidate.lastName}`;
      return [
        s.legNumber,
        s.candidate.candidateCode ?? '',
        `"${name.replace(/"/g, '""')}"`,
        s.purposeType,
        s.deliveryMode,
        s.status,
        s.fromAddressType,
        s.toAddressType,
        s.trackingId ?? '',
        s.courierPartner ?? '',
        s.sentAt?.toISOString() ?? '',
        s.receivedAt?.toISOString() ?? '',
        s.lockerFileNumber ?? '',
      ].join(',');
    });

    return header + rows.join('\n');
  }

  private buildListWhere(
    query: ListShipmentsQueryDto,
  ): Prisma.CourierShipmentWhereInput {
    const where: Prisma.CourierShipmentWhereInput = {};

    if (query.candidateId) {
      where.candidateId = query.candidateId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.deliveryMode) {
      where.deliveryMode = query.deliveryMode;
    }
    if (query.purposeType) {
      where.purposeType = query.purposeType;
    }
    if (query.dateFrom || query.dateTo) {
      where.sentAt = {};
      if (query.dateFrom) {
        where.sentAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.sentAt.lte = new Date(query.dateTo);
      }
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.candidate = {
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { candidateCode: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    return where;
  }

  private async findOrThrow(id: string): Promise<ShipmentWithRelations> {
    const shipment = await this.prisma.courierShipment.findUnique({
      where: { id },
      include: shipmentInclude,
    });
    if (!shipment) {
      throw new NotFoundException(`Courier shipment ${id} not found`);
    }
    return shipment;
  }

  private async assertCandidateExists(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }
  }

  private buildCumulativeReceived(
    events: Array<{
      items: Array<{
        docType: string;
        isReceived: boolean;
        remarks?: string | null;
      }>;
    }>,
  ) {
    const map = new Map<
      string,
      { isReceived: boolean; remarks?: string | null }
    >();
    for (const event of events) {
      for (const item of event.items) {
        if (item.isReceived) {
          map.set(item.docType, {
            isReceived: true,
            remarks: item.remarks,
          });
        }
      }
    }
    return Array.from(map.entries()).map(([docType, value]) => ({
      docType,
      ...value,
    }));
  }

  private async syncCandidateMailingFromSnapshot(
    candidateId: string,
    snapshot: AddressSnapshotInput,
  ): Promise<void> {
    const data: Prisma.CandidateUpdateInput = {};

    const address = snapshot.address?.trim();
    if (address) {
      data.address = address;
    }

    const pincode = snapshot.pincode?.trim();
    if (pincode) {
      data.addressPincode = pincode;
    }

    const altPhone = snapshot.altPhone?.trim();
    if (altPhone) {
      data.alternatePhone = altPhone;
    }

    const phone = snapshot.phone?.trim();
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits) {
        data.mobileNumber = digits;
      }
    }

    if (Object.keys(data).length === 0) {
      return;
    }

    await this.prisma.candidate.update({
      where: { id: candidateId },
      data,
    });
  }

  private enrichShipment(shipment: ShipmentWithRelations) {
    return {
      ...shipment,
      fromAddressLabel:
        ADDRESS_TYPE_LABELS[shipment.fromAddressType] ??
        shipment.fromAddressType,
      toAddressLabel:
        ADDRESS_TYPE_LABELS[shipment.toAddressType] ?? shipment.toAddressType,
      docTypes: shipment.documents.map((d) => d.docType),
    };
  }

  private assertDocumentReceiptsValid(
    expectedDocTypes: string[],
    verifiedDocuments: MarkReceivedDto['verifiedDocuments'],
  ) {
    if (expectedDocTypes.length === 0) {
      throw new BadRequestException(
        'Cannot mark as received: leg has no documents to verify',
      );
    }

    const expected = new Set(expectedDocTypes);
    const reviewed = new Set<string>();

    for (const doc of verifiedDocuments) {
      if (reviewed.has(doc.docType)) {
        throw new BadRequestException(
          `Duplicate document verification for ${doc.docType}`,
        );
      }
      reviewed.add(doc.docType);
      if (!expected.has(doc.docType)) {
        throw new BadRequestException(
          `Document type ${doc.docType} is not on this leg`,
        );
      }

      if (!doc.isReceived && !doc.remarks?.trim()) {
        throw new BadRequestException(
          `Document type ${doc.docType} was not received; remarks are required`,
        );
      }
    }

    for (const docType of expected) {
      if (!reviewed.has(docType)) {
        throw new BadRequestException(
          `Document type ${docType} must be cross-checked before marking as received`,
        );
      }
    }
  }

  private legMatchesQuery(
    leg: ReturnType<CourierShipmentsService['enrichShipment']>,
    query: ListShipmentsQueryDto,
  ): boolean {
    if (query.status && leg.status !== query.status) {
      return false;
    }
    if (query.deliveryMode && leg.deliveryMode !== query.deliveryMode) {
      return false;
    }
    if (query.purposeType && leg.purposeType !== query.purposeType) {
      return false;
    }
    return true;
  }

  private buildCandidateGroup(
    candidateId: string,
    legs: ReturnType<CourierShipmentsService['enrichShipment']>[],
    query: ListShipmentsQueryDto,
  ) {
    const sortedByLeg = [...legs].sort((a, b) => b.legNumber - a.legNumber);
    const matchingLegs = legs.filter((leg) => this.legMatchesQuery(leg, query));
    const latestLeg =
      [...matchingLegs].sort((a, b) => b.legNumber - a.legNumber)[0] ??
      sortedByLeg[0];

    const inTransitCount = legs.filter(
      (l) => l.status === SHIPMENT_STATUS.IN_TRANSIT,
    ).length;
    const receivedCount = legs.filter(
      (l) => l.status === SHIPMENT_STATUS.RECEIVED,
    ).length;
    const draftCount = legs.filter(
      (l) => l.status === SHIPMENT_STATUS.DRAFT,
    ).length;

    const lastReceived = [...legs]
      .filter((l) => l.status === SHIPMENT_STATUS.RECEIVED && l.receivedAt)
      .sort(
        (a, b) =>
          new Date(b.receivedAt!).getTime() - new Date(a.receivedAt!).getTime(),
      )[0];

    return {
      candidateId,
      candidate: latestLeg.candidate,
      legCount: legs.length,
      matchingLegCount: matchingLegs.length,
      inTransitCount,
      receivedCount,
      draftCount,
      currentLocationHint: lastReceived?.toAddressLabel ?? null,
      latestLeg,
    };
  }
}
