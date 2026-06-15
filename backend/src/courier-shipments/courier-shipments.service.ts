import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../notifications/outbox.service';
import {
  ADDRESS_TYPE_LABELS,
  AFFINIKS_OFFICE_ADDRESSES_KEY,
  DELIVERY_MODE,
  OFFICE_ADDRESS_TYPES,
  SHIPMENT_STATUS,
} from './constants/shipment-types';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';
import { MarkHandoverDto } from './dto/mark-handover.dto';
import { MarkReceivedDto } from './dto/mark-received.dto';
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
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: AFFINIKS_OFFICE_ADDRESSES_KEY },
    });

    return {
      success: true,
      data: (config?.value as Record<string, unknown>) ?? {},
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
        trackingId: dto.trackingId,
        courierPartner: dto.courierPartner,
        sentAt: new Date(dto.sentAt),
        sentByUserId: dto.sentByUserId,
        approvedByUserId: dto.approvedByUserId,
        status: SHIPMENT_STATUS.IN_TRANSIT,
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

    const isOfficeDest = (OFFICE_ADDRESS_TYPES as readonly string[]).includes(
      shipment.toAddressType,
    );

    const receivedByUserId = dto.receivedByUserId ?? actorUserId;

    const updated = await this.prisma.courierShipment.update({
      where: { id },
      data: {
        receivedAt: new Date(dto.receivedAt),
        receivedByUserId,
        receivedByName: dto.receivedByName?.trim() ?? null,
        status: SHIPMENT_STATUS.RECEIVED,
      },
      include: shipmentInclude,
    });

    if (isOfficeDest) {
      await this.outboxService.publishCourierShipmentReceived(
        id,
        receivedByUserId,
      );
    }

    return { success: true, data: this.enrichShipment(updated) };
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
