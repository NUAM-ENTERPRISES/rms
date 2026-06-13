import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { DOCUMENT_TYPE } from '../common/constants/document-types';
import {
  COLLECTION_STATUS,
  COLLECTION_TYPE,
  ORIGINAL_DOCUMENT_CHECKLIST,
} from './constants/collection-types';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListCollectionsQueryDto } from './dto/list-collections-query.dto';
import { SubmitToLockerDto } from './dto/submit-to-locker.dto';
import { CollectionItemDto } from './dto/collection-item.dto';

const candidateSelect = {
  id: true,
  firstName: true,
  lastName: true,
  candidateCode: true,
  lockerFileNumber: true,
  email: true,
  countryCode: true,
  mobileNumber: true,
  gender: true,
  dateOfBirth: true,
  profileImage: true,
  professionType: { select: { id: true, name: true, label: true } },
  currentStatus: { select: { id: true, statusName: true } },
  recruiterAssignments: {
    where: { isActive: true },
    take: 1,
    select: {
      recruiter: { select: { id: true, name: true, email: true } },
    },
  },
} satisfies Prisma.CandidateSelect;

const eventInclude = {
  collectedBy: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  agent: { select: { id: true, name: true } },
  items: true,
} satisfies Prisma.OriginalDocumentCollectionEventInclude;

const collectionInclude = {
  candidate: { select: candidateSelect },
  lockerSubmittedBy: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  mergedDocument: {
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
      docType: true,
    },
  },
  mergeHistory: {
    orderBy: { uploadedAt: 'desc' as const },
    include: {
      document: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
        },
      },
      uploadedBy: { select: { id: true, name: true } },
    },
  },
  events: {
    include: eventInclude,
    orderBy: { collectedAt: 'asc' as const },
  },
} satisfies Prisma.OriginalDocumentCollectionInclude;

type CollectionWithRelations = Prisma.OriginalDocumentCollectionGetPayload<{
  include: typeof collectionInclude;
}>;

type EventWithRelations = Prisma.OriginalDocumentCollectionEventGetPayload<{
  include: typeof eventInclude;
}>;

@Injectable()
export class OriginalDocumentCollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateCollectionDto, userId: string) {
    await this.assertCandidateExists(dto.candidateId);

    const existing = await this.prisma.originalDocumentCollection.findUnique({
      where: { candidateId: dto.candidateId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException({
        message:
          'This candidate already has an original document collection. Add a new intake event instead.',
        collectionId: existing.id,
      });
    }

    await this.validateEventPayload(dto);

    const collection = await this.prisma.$transaction(async (tx) => {
      const parent = await tx.originalDocumentCollection.create({
        data: {
          candidateId: dto.candidateId,
          status: COLLECTION_STATUS.DRAFT,
          createdByUserId: userId,
        },
      });

      await this.createEventRecord(tx, parent.id, dto, userId);

      return tx.originalDocumentCollection.findUniqueOrThrow({
        where: { id: parent.id },
        include: collectionInclude,
      });
    });

    return { success: true, data: this.enrichCollection(collection) };
  }

  async addEvent(collectionId: string, dto: CreateEventDto, userId: string) {
    const collection = await this.findOrThrow(collectionId);
    await this.validateEventPayload(dto);
    this.assertItemsNotAlreadyReceived(collection, dto.items);

    await this.createEventRecord(this.prisma, collectionId, dto, userId);

    const updated = await this.findOrThrow(collectionId);
    return { success: true, data: this.enrichCollection(updated) };
  }

  async updateEvent(
    collectionId: string,
    eventId: string,
    dto: UpdateEventDto,
  ) {
    const collection = await this.findOrThrow(collectionId);
    const event = collection.events.find((e) => e.id === eventId);
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (dto.collectionType || dto.directOffice !== undefined) {
      await this.validateEventPayload({
        collectionType: dto.collectionType ?? event.collectionType,
        collectedByUserId: dto.collectedByUserId ?? event.collectedByUserId,
        collectedAt: dto.collectedAt ?? event.collectedAt.toISOString(),
        directOffice: dto.directOffice ?? event.directOffice ?? undefined,
        directOfficeOther:
          dto.directOfficeOther ?? event.directOfficeOther ?? undefined,
        interviewVenue:
          dto.interviewVenue ?? event.interviewVenue ?? undefined,
        agentId: dto.agentId ?? event.agentId ?? undefined,
        agentNameManual:
          dto.agentNameManual ?? event.agentNameManual ?? undefined,
        courierPartner:
          dto.courierPartner ?? event.courierPartner ?? undefined,
        trackingNumber:
          dto.trackingNumber ?? event.trackingNumber ?? undefined,
        remarks: dto.remarks ?? event.remarks ?? undefined,
      });
    }

    if (dto.items) {
      const otherEventsReceived = this.buildCumulativeReceived(
        collection.events.filter((e) => e.id !== eventId),
      ).map((i) => i.docType);

      for (const item of dto.items) {
        if (
          item.isReceived &&
          otherEventsReceived.includes(item.docType)
        ) {
          throw new BadRequestException(
            `Document type ${item.docType} was already received in a prior intake event`,
          );
        }
      }
    }

    const { items, collectedAt, ...rest } = dto;

    await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.originalDocumentCollectionEventItem.deleteMany({
          where: { eventId },
        });
        await tx.originalDocumentCollectionEventItem.createMany({
          data: items.map((item) => ({
            eventId,
            docType: item.docType,
            isReceived: item.isReceived,
            remarks: item.remarks,
          })),
        });
      }

      await tx.originalDocumentCollectionEvent.update({
        where: { id: eventId },
        data: {
          ...rest,
          ...(collectedAt ? { collectedAt: new Date(collectedAt) } : {}),
        },
      });
    });

    const updated = await this.findOrThrow(collectionId);
    return { success: true, data: this.enrichCollection(updated) };
  }

  async findOne(id: string) {
    const collection = await this.findOrThrow(id);
    return { success: true, data: this.enrichCollection(collection) };
  }

  async findByCandidate(candidateId: string) {
    const collection = await this.prisma.originalDocumentCollection.findUnique({
      where: { candidateId },
      include: collectionInclude,
    });

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        lockerFileNumber: true,
      },
    });

    const events = collection?.events ?? [];
    const cumulativeReceived = collection
      ? this.buildCumulativeReceived(events)
      : [];

    return {
      success: true,
      data: {
        candidate,
        collection: collection ? this.enrichCollection(collection) : null,
        events,
        cumulativeReceived,
      },
    };
  }

  async getStats() {
    const [collections, events] = await Promise.all([
      this.prisma.originalDocumentCollection.findMany({
        include: { events: { include: { items: true } } },
      }),
      this.prisma.originalDocumentCollectionEvent.findMany({
        select: { collectionType: true, collectedAt: true },
      }),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalDocumentsCollected = 0;
    let completedCollections = 0;
    let pendingCollections = 0;
    let inLocker = 0;
    let thisMonthCollections = 0;
    const byType: Record<string, number> = {};

    for (const collection of collections) {
      const cumulative = this.buildCumulativeReceived(collection.events);
      totalDocumentsCollected += cumulative.length;

      if (collection.status === COLLECTION_STATUS.COMPLETED) {
        completedCollections += 1;
      } else {
        pendingCollections += 1;
      }

      if (collection.lockerSubmittedAt) {
        inLocker += 1;
      }
    }

    for (const event of events) {
      byType[event.collectionType] = (byType[event.collectionType] ?? 0) + 1;
      if (event.collectedAt >= monthStart) {
        thisMonthCollections += 1;
      }
    }

    return {
      success: true,
      data: {
        totalCollections: collections.length,
        totalEvents: events.length,
        totalDocumentsCollected,
        completedCollections,
        pendingCollections,
        inLocker,
        thisMonthCollections,
        byType,
      },
    };
  }

  async findAll(query: ListCollectionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    const [collections, total] = await Promise.all([
      this.prisma.originalDocumentCollection.findMany({
        where,
        include: collectionInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.originalDocumentCollection.count({ where }),
    ]);

    return {
      success: true,
      data: {
        collections: collections.map((c) => this.enrichCollection(c)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async exportCsv(query: ListCollectionsQueryDto): Promise<string> {
    const where = this.buildWhereClause(query);
    const collections = await this.prisma.originalDocumentCollection.findMany({
      where,
      include: collectionInclude,
      orderBy: { updatedAt: 'desc' },
    });

    const headers = [
      'Collection ID',
      'Candidate',
      'Event Count',
      'Latest Event Type',
      'Latest Event Source',
      'Latest Event Date',
      'Collected By (Latest)',
      'Locker Number',
      'Documents On File',
      'Status',
    ];

    const rows = collections.map((c) => {
      const enriched = this.enrichCollection(c);
      const latest = enriched.latestEvent;
      return [
        c.id,
        `${c.candidate.firstName} ${c.candidate.lastName}`.trim(),
        enriched.eventCount,
        latest?.collectionType ?? '',
        latest ? this.formatSourceDetail(latest) : '',
        latest?.collectedAt?.toISOString() ?? '',
        latest?.collectedBy.name ?? '',
        c.lockerFileNumber ?? '',
        enriched.cumulativeReceivedCount,
        c.status,
      ];
    });

    return [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
  }

  async uploadMerge(
    id: string,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const collection = await this.findOrThrow(id);
    if (!files?.length) {
      throw new BadRequestException('At least one file is required');
    }

    const mergedBuffer = await this.mergeFiles(files);
    const slug = this.slugify(
      `${collection.candidate.firstName}_${collection.candidate.lastName}`,
    );
    const fileName = `${slug}_original_documents.pdf`;
    const folder = `candidates/documents/${collection.candidateId}/original_documents_bundle`;

    const upload = await this.uploadService.uploadBuffer(
      mergedBuffer,
      folder,
      fileName,
      'application/pdf',
    );

    const document = await this.prisma.document.create({
      data: {
        candidateId: collection.candidateId,
        docType: DOCUMENT_TYPE.ORIGINAL_DOCUMENTS_BUNDLE,
        fileName: upload.fileName,
        fileUrl: upload.fileUrl,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        uploadedBy: userId,
        status: 'pending',
        notes: `DCE merged original documents (collection ${id})`,
      },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (collection.mergedDocumentId) {
        await tx.originalDocumentCollectionMergeHistory.create({
          data: {
            collectionId: id,
            documentId: collection.mergedDocumentId,
            uploadedByUserId: userId,
            replacedAt: new Date(),
          },
        });
      }

      return tx.originalDocumentCollection.update({
        where: { id },
        data: {
          mergedDocumentId: document.id,
          status:
            collection.status === COLLECTION_STATUS.DRAFT
              ? COLLECTION_STATUS.MERGED_UPLOADED
              : collection.status === COLLECTION_STATUS.LOCKER_SUBMITTED
                ? COLLECTION_STATUS.LOCKER_SUBMITTED
                : COLLECTION_STATUS.MERGED_UPLOADED,
        },
        include: collectionInclude,
      });
    });

    return {
      success: true,
      data: this.enrichCollection(updated),
      mergedDocumentId: document.id,
    };
  }

  async submitToLocker(id: string, dto: SubmitToLockerDto, userId: string) {
    const collection = await this.findOrThrow(id);
    if (!collection.mergedDocumentId) {
      throw new BadRequestException(
        'Upload merged scan before submitting to locker',
      );
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.candidate.update({
        where: { id: collection.candidateId },
        data: { lockerFileNumber: dto.lockerFileNumber },
      });

      return tx.originalDocumentCollection.update({
        where: { id },
        data: {
          lockerFileNumber: dto.lockerFileNumber,
          lockerSubmittedAt: now,
          lockerSubmittedByUserId: userId,
          status: COLLECTION_STATUS.LOCKER_SUBMITTED,
        },
        include: collectionInclude,
      });
    });

    return { success: true, data: this.enrichCollection(updated) };
  }

  async complete(id: string, userId: string) {
    const collection = await this.findOrThrow(id);
    if (!collection.mergedDocumentId) {
      throw new BadRequestException('Merged document upload is required');
    }
    if (!collection.lockerFileNumber || !collection.lockerSubmittedAt) {
      throw new BadRequestException('Locker submission is required');
    }

    const updated = await this.prisma.originalDocumentCollection.update({
      where: { id },
      data: {
        completedAt: new Date(),
        completedByUserId: userId,
        status: COLLECTION_STATUS.COMPLETED,
      },
      include: collectionInclude,
    });

    return {
      success: true,
      data: this.enrichCollection(updated),
    };
  }

  private async createEventRecord(
    tx: Prisma.TransactionClient | PrismaService,
    collectionId: string,
    dto: CreateEventDto | CreateCollectionDto,
    userId: string,
  ) {
    return tx.originalDocumentCollectionEvent.create({
      data: {
        collectionId,
        collectionType: dto.collectionType,
        collectedByUserId: dto.collectedByUserId,
        collectedAt: new Date(dto.collectedAt),
        directOffice: dto.directOffice,
        directOfficeOther: dto.directOfficeOther,
        interviewVenue: dto.interviewVenue,
        agentId: dto.agentId,
        agentNameManual: dto.agentNameManual,
        courierPartner: dto.courierPartner,
        trackingNumber: dto.trackingNumber,
        remarks: dto.remarks,
        createdByUserId: userId,
        items: {
          create: this.buildItemsCreate(dto.items),
        },
      },
    });
  }

  private enrichCollection(collection: CollectionWithRelations) {
    const cumulativeReceived = this.buildCumulativeReceived(collection.events);
    const latestEvent =
      collection.events.length > 0
        ? collection.events[collection.events.length - 1]
        : null;

    return {
      ...collection,
      eventCount: collection.events.length,
      cumulativeReceivedCount: cumulativeReceived.length,
      cumulativeReceived,
      latestEvent,
      latestEventAt: latestEvent?.collectedAt ?? null,
    };
  }

  private async findOrThrow(id: string): Promise<CollectionWithRelations> {
    const collection = await this.prisma.originalDocumentCollection.findUnique({
      where: { id },
      include: collectionInclude,
    });
    if (collection) {
      return collection;
    }

    // Support legacy/event URLs: resolve intake event id → parent collection
    const event = await this.prisma.originalDocumentCollectionEvent.findUnique({
      where: { id },
      select: { collectionId: true },
    });
    if (event) {
      const parent = await this.prisma.originalDocumentCollection.findUnique({
        where: { id: event.collectionId },
        include: collectionInclude,
      });
      if (parent) {
        return parent;
      }
    }

    throw new NotFoundException(`Collection ${id} not found`);
  }

  private async assertCandidateExists(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }
  }

  private async validateEventPayload(dto: CreateEventDto) {
    if (dto.collectionType === COLLECTION_TYPE.DIRECT && !dto.directOffice) {
      throw new BadRequestException(
        'directOffice is required for direct collection',
      );
    }
    if (
      dto.collectionType === COLLECTION_TYPE.DIRECT &&
      dto.directOffice === 'other' &&
      !dto.directOfficeOther?.trim()
    ) {
      throw new BadRequestException(
        'directOfficeOther is required when office is other',
      );
    }
    if (
      dto.collectionType === COLLECTION_TYPE.AGENT &&
      !dto.agentId &&
      !dto.agentNameManual?.trim()
    ) {
      throw new BadRequestException(
        'agentId or agentNameManual is required for agent collection',
      );
    }
  }

  private assertItemsNotAlreadyReceived(
    collection: CollectionWithRelations,
    items?: CollectionItemDto[],
  ) {
    if (!items?.length) return;
    const cumulative = new Set(
      this.buildCumulativeReceived(collection.events).map((i) => i.docType),
    );
    for (const item of items) {
      if (item.isReceived && cumulative.has(item.docType)) {
        throw new BadRequestException(
          `Document type ${item.docType} was already received in a prior intake event`,
        );
      }
    }
  }

  private buildItemsCreate(items?: CollectionItemDto[]) {
    const source = items?.length
      ? items
      : ORIGINAL_DOCUMENT_CHECKLIST.map((docType) => ({
          docType,
          isReceived: false,
        }));

    return source.map((item) => ({
      docType: item.docType,
      isReceived: item.isReceived ?? false,
      remarks: item.remarks,
    }));
  }

  private buildWhereClause(
    query: ListCollectionsQueryDto,
  ): Prisma.OriginalDocumentCollectionWhereInput {
    const where: Prisma.OriginalDocumentCollectionWhereInput = {};

    if (query.candidateId) where.candidateId = query.candidateId;
    if (query.status) where.status = query.status;

    if (query.pendingOnly) {
      where.status = { not: COLLECTION_STATUS.COMPLETED };
    }

    if (query.lockerSubmittedOnly) {
      where.lockerSubmittedAt = { not: null };
    }

    if (query.collectionType || query.dateFrom || query.dateTo) {
      where.events = {
        some: {
          ...(query.collectionType
            ? { collectionType: query.collectionType }
            : {}),
          ...(query.dateFrom || query.dateTo
            ? {
                collectedAt: {
                  ...(query.dateFrom
                    ? { gte: new Date(query.dateFrom) }
                    : {}),
                  ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
                },
              }
            : {}),
        },
      };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        {
          candidate: {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { candidateCode: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
        { lockerFileNumber: { contains: term, mode: 'insensitive' } },
        {
          events: {
            some: {
              trackingNumber: { contains: term, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    return where;
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

  private formatSourceDetail(event: {
    collectionType: string;
    directOffice: string | null;
    directOfficeOther: string | null;
    interviewVenue: string | null;
    agent?: { name: string } | null;
    agentNameManual: string | null;
    courierPartner: string | null;
    trackingNumber: string | null;
  }): string {
    switch (event.collectionType) {
      case COLLECTION_TYPE.DIRECT:
        return event.directOffice === 'other'
          ? (event.directOfficeOther ?? 'other')
          : (event.directOffice ?? '');
      case COLLECTION_TYPE.AGENT:
        return event.agent?.name ?? event.agentNameManual ?? '';
      case COLLECTION_TYPE.INTERVIEW_COORDINATOR:
        return event.interviewVenue ?? '';
      case COLLECTION_TYPE.COURIER:
        return [event.courierPartner, event.trackingNumber]
          .filter(Boolean)
          .join(' / ');
      default:
        return '';
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 80);
  }

  private async mergeFiles(files: Express.Multer.File[]): Promise<Buffer> {
    if (files.length === 1) {
      const file = files[0];
      const isPdf =
        file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');
      if (isPdf) return file.buffer;
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const mime = file.mimetype?.toLowerCase() ?? '';
      const name = file.originalname.toLowerCase();

      if (mime === 'application/pdf' || name.endsWith('.pdf')) {
        const pdfDoc = await PDFDocument.load(file.buffer);
        const copied = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices(),
        );
        copied.forEach((page) => mergedPdf.addPage(page));
      } else if (
        mime === 'image/jpeg' ||
        mime === 'image/jpg' ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg')
      ) {
        const image = await mergedPdf.embedJpg(file.buffer);
        const page = mergedPdf.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      } else if (mime === 'image/png' || name.endsWith('.png')) {
        const image = await mergedPdf.embedPng(file.buffer);
        const page = mergedPdf.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      } else {
        throw new BadRequestException(
          `Unsupported file type: ${file.originalname}`,
        );
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      throw new BadRequestException('No valid pages to merge');
    }

    return Buffer.from(await mergedPdf.save());
  }
}
