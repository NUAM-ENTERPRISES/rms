import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';
import { PrismaService } from '../database/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { RequestResubmissionDto } from './dto/request-resubmission.dto';
import { ReuploadDocumentDto } from './dto/reupload-document.dto';
import { RequestClientReuploadDto } from './dto/request-client-reupload.dto';
import { RequestMissingDocumentDto } from './dto/request-missing-document.dto';
import { RequestOfferLetterUploadDto } from './dto/request-offer-letter-upload.dto';
import { UploadOfferLetterDto } from './dto/upload-offer-letter.dto';
import { VerifyOfferLetterDto } from './dto/verify-offer-letter.dto';
import { ForwardToClientDto, SendType } from './dto/forward-to-client.dto';
import { BulkForwardToClientDto, DeliveryMethod } from './dto/bulk-forward-to-client.dto';
import { BulkSendCsvProfilesDto } from './dto/bulk-send-csv-profiles.dto';
import { mapCandidateProjectToBulkSendCsvProfile } from './utils/bulk-send-csv-profile.util';
import {
  DocumentWithRelations,
  DocumentListRow,
  PaginatedDocuments,
  DocumentStats,
  CandidateProjectDocumentSummary,
  CandidateProjectRequirementsResult,
} from './types';
import {
  DOCUMENT_STATUS,
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_META,
  DocumentType,
  CANDIDATE_PROJECT_STATUS,
  canTransitionStatus,
  ROLE_NAMES,
  isPdfMergeableDocument,
} from '../common/constants';
import { OutboxService } from '../notifications/outbox.service';
import { ProcessingService } from '../processing/processing.service';
import { UploadService } from '../upload/upload.service';
import { getEffectiveMaxBytes } from '../upload/upload.constants';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { validatePassportDocumentFields } from './utils/passport-document.util';
import { validateEligibilityDocumentFields } from './utils/eligibility-document.util';
import { parseDocumentDate } from './utils/document-date.util';
import { syncCandidatePassportNumberFromDocument } from '../candidates/utils/passport-number.util';
import { syncCandidateEligibilityNumberFromDocument } from '../candidates/utils/eligibility-number.util';
import {
  computeDocumentRepositoryCompletion,
  getDocumentRepositorySlots,
} from '../candidates/utils/profile-completion.util';

@Injectable()
export class DocumentsService {
  private isResumeOrCvDocument(docType: string): boolean {
    return docType === DOCUMENT_TYPE.RESUME || docType === DOCUMENT_TYPE.CV;
  }

  private async assertValidResumeRoleCatalog(roleCatalogId: string): Promise<void> {
    const roleCatalog = await this.prisma.roleCatalog.findFirst({
      where: {
        id: roleCatalogId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!roleCatalog) {
      throw new BadRequestException(
        'Valid active roleCatalogId is required for resume/cv documents',
      );
    }
  }

  /** Human-readable label for a document type key (fallback when not in DOCUMENT_TYPE_META). */
  private formatDocTypeKey(docType: string): string {
    return docType
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /** Checklist rows for recruiter list progress tooltip (project requirements + intro video). */
  private buildRecruiterProjectDocumentChecklist(cp: {
    project: {
      documentRequirements: Array<{
        id: string;
        docType: string;
        mandatory: boolean;
      }>;
      introductionVideoRequired?: boolean;
    };
    documentVerifications: Array<{
      document: { docType: string; fileName?: string | null };
    }>;
  }): {
    rows: Array<{
      key: string;
      docType: string;
      mandatory: boolean;
      isUploaded: boolean;
      fileName: string | null;
    }>;
  } {
    const uploadedByType = new Map<string, string | null>();
    for (const dv of cp.documentVerifications) {
      const typeKey = dv.document.docType.toLowerCase();
      if (!uploadedByType.has(typeKey)) {
        uploadedByType.set(typeKey, dv.document.fileName ?? null);
      }
    }

    const rows = cp.project.documentRequirements.map((req) => {
      const typeKey = req.docType.toLowerCase();
      return {
        key: req.id,
        docType: req.docType,
        mandatory: req.mandatory,
        isUploaded: uploadedByType.has(typeKey),
        fileName: uploadedByType.get(typeKey) ?? null,
      };
    });

    if (cp.project.introductionVideoRequired) {
      const introType = DOCUMENT_TYPE.INTRODUCTION_VIDEO;
      const introKey = introType.toLowerCase();
      rows.push({
        key: introType,
        docType: introType,
        mandatory: true,
        isUploaded: uploadedByType.has(introKey),
        fileName: uploadedByType.get(introKey) ?? null,
      });
    }

    return { rows };
  }

  /** Requirement row for recruiter UI: friendly name vs technical type key. */
  private enrichProjectRequirementRow(r: Record<string, unknown> & { docType: string }) {
    const docType = r.docType;
    const meta = DOCUMENT_TYPE_META[docType as DocumentType];
    const documentName =
      meta?.displayName ?? this.formatDocTypeKey(docType);
    return {
      ...r,
      documentName,
      documentType: docType,
    };
  }

  /** Document list row: optional user-provided docName, else catalog display name. */
  private enrichDocumentListItem(doc: Record<string, unknown>) {
    const docType = doc.docType as string;
    const meta = DOCUMENT_TYPE_META[docType as DocumentType];
    const docName = doc.docName;
    const documentDisplayName =
      typeof docName === 'string' && docName.trim() !== ''
        ? docName.trim()
        : meta?.displayName ?? this.formatDocTypeKey(docType);
    return {
      ...doc,
      documentDisplayName,
      documentType: docType,
    };
  }

  private mapRequirementsVerificationDocument(
    doc: Record<string, unknown>,
    includeFileUrls: boolean,
  ): Record<string, unknown> {
    const enriched = this.enrichDocumentListItem(doc) as Record<string, unknown>;
    if (includeFileUrls) {
      return enriched;
    }
    return {
      id: enriched.id,
      docType: enriched.docType,
      docName: enriched.docName,
      fileName: enriched.fileName,
      createdAt: enriched.createdAt,
      documentDisplayName: enriched.documentDisplayName,
      documentType: enriched.documentType,
    };
  }

  private async attachDocumentActorNames(
    documents: DocumentWithRelations[],
  ): Promise<Record<string, unknown>[]> {
    const userIds = new Set<string>();
    const verificationIds: string[] = [];

    for (const doc of documents) {
      if (doc.uploadedBy) userIds.add(doc.uploadedBy);
      if (doc.verifiedBy) userIds.add(doc.verifiedBy);
      if (doc.rejectedBy) userIds.add(doc.rejectedBy);
      for (const ver of doc.verifications || []) {
        if (ver?.id) verificationIds.push(ver.id);
      }
    }

    const [users, historyRows] = await Promise.all([
      userIds.size
        ? this.prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      verificationIds.length
        ? this.prisma.documentVerificationHistory.findMany({
            where: { verificationId: { in: verificationIds } },
            orderBy: { performedAt: 'desc' },
            include: {
              performer: {
                select: { id: true, name: true, email: true },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const usersById = new Map<string, any>(
      (users as any[]).map((u): [string, any] => [u.id, u]),
    );
    const latestHistoryByVerificationId = new Map<string, (typeof historyRows)[number]>();
    for (const row of historyRows) {
      if (!row.verificationId || latestHistoryByVerificationId.has(row.verificationId)) {
        continue;
      }
      latestHistoryByVerificationId.set(row.verificationId, row);
    }

    return documents.map((doc) => ({
      ...doc,
      uploadedByUser: doc.uploadedBy ? usersById.get(doc.uploadedBy) || null : null,
      verifiedByUser: doc.verifiedBy ? usersById.get(doc.verifiedBy) || null : null,
      rejectedByUser: doc.rejectedBy ? usersById.get(doc.rejectedBy) || null : null,
      verifications: (doc.verifications || []).map((ver) => {
        const latest = latestHistoryByVerificationId.get(ver.id);
        return {
          ...ver,
          latestAction: latest?.action || null,
          latestActionAt: latest?.performedAt || null,
          latestActionBy: latest?.performer || null,
          latestActionByName: latest?.performedByName || latest?.performer?.name || null,
        };
      }),
    }));
  }

  private computeVerificationSummary(
    requirementsCount: number,
    introductionVideoRequired: boolean,
    verifications: Array<{ status: string; document: { docType: string } }>,
  ) {
    const introVerification = verifications.find(
      (v) => v.document.docType === DOCUMENT_TYPE.INTRODUCTION_VIDEO,
    );
    const totalRequired =
      requirementsCount + (introductionVideoRequired ? 1 : 0);
    const totalSubmitted =
      verifications.filter((v) => {
        if (v.document.docType === DOCUMENT_TYPE.INTRODUCTION_VIDEO) {
          return introductionVideoRequired;
        }
        return true;
      }).length;
    const relevantVerifications = verifications.filter((v) => {
      if (v.document.docType === DOCUMENT_TYPE.INTRODUCTION_VIDEO) {
        return introductionVideoRequired;
      }
      return true;
    });
    const totalVerified = relevantVerifications.filter(
      (v) => v.status === DOCUMENT_STATUS.VERIFIED,
    ).length;
    const totalRejected = relevantVerifications.filter(
      (v) => v.status === DOCUMENT_STATUS.REJECTED,
    ).length;
    const totalPending = relevantVerifications.filter(
      (v) => v.status === DOCUMENT_STATUS.PENDING,
    ).length;
    const allDocumentsVerified =
      totalRequired > 0 && totalVerified === totalRequired;

    return {
      totalRequired,
      totalSubmitted,
      totalVerified,
      totalRejected,
      totalPending,
      allDocumentsVerified,
      introductionVideo: introVerification ?? null,
    };
  }

  private async hasBeenSentForDocumentVerification(
    candidateProjectMapId: string,
  ): Promise<boolean> {
    const history = await this.prisma.candidateProjectStatusHistory.findFirst({
      where: {
        candidateProjectMapId,
        OR: [
          { mainStatus: { name: 'documents' } },
          {
            subStatus: {
              name: {
                in: [
                  'verification_in_progress_document',
                  'pending_documents',
                  'documents_verified',
                  'rejected_documents',
                ],
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return history !== null;
  }

  private async resolveDocumentationReviewState(candidateProject: {
    id: string;
    subStatus?: { name: string } | null;
  }): Promise<{
    isDocumentationReviewed: boolean;
    documentationStatusCode: string;
    documentationStatus: string;
  }> {
    const currentSubStatusName = candidateProject.subStatus?.name;

    if (currentSubStatusName === 'client_revision_requested') {
      return {
        isDocumentationReviewed: false,
        documentationStatusCode: 'client_revision_requested',
        documentationStatus: 'Client revision in progress',
      };
    }

    if (
      currentSubStatusName === 'documents_verified' ||
      currentSubStatusName === 'submitted_to_client'
    ) {
      return {
        isDocumentationReviewed: true,
        documentationStatusCode: 'documents_verified',
        documentationStatus: 'Document verified',
      };
    }

    if (currentSubStatusName === 'rejected_documents') {
      return {
        isDocumentationReviewed: true,
        documentationStatusCode: 'rejected_documents',
        documentationStatus: 'Document rejected',
      };
    }

    const reviewSubStatuses = await this.prisma.candidateProjectSubStatus.findMany({
      where: { name: { in: ['documents_verified', 'rejected_documents'] } },
      select: { id: true, name: true },
    });

    if (reviewSubStatuses.length === 0) {
      return {
        isDocumentationReviewed: false,
        documentationStatusCode: 'pending',
        documentationStatus: 'Document verification pending',
      };
    }

    const reviewSubStatusIds = reviewSubStatuses.map((s) => s.id);
    const reviewHistory = await this.prisma.candidateProjectStatusHistory.findFirst({
      where: {
        candidateProjectMapId: candidateProject.id,
        subStatusId: { in: reviewSubStatusIds },
      },
      include: {
        subStatus: { select: { name: true } },
      },
      orderBy: { statusChangedAt: 'desc' },
    });

    if (!reviewHistory) {
      return {
        isDocumentationReviewed: false,
        documentationStatusCode: 'pending',
        documentationStatus: 'Document verification pending',
      };
    }

    const subName = reviewHistory.subStatus?.name;
    if (subName === 'documents_verified') {
      return {
        isDocumentationReviewed: true,
        documentationStatusCode: 'documents_verified',
        documentationStatus: 'Document verified',
      };
    }

    if (subName === 'rejected_documents') {
      return {
        isDocumentationReviewed: true,
        documentationStatusCode: 'rejected_documents',
        documentationStatus: 'Document rejected',
      };
    }

    return {
      isDocumentationReviewed: false,
      documentationStatusCode: 'pending',
      documentationStatus: 'Document verification pending',
    };
  }

  /**
   * Keep only the newest uploaded document per docType (matches verification detail page logic).
   */
  private selectLatestVerificationsPerDocType<
    T extends { document: { docType: string; createdAt: Date | string } },
  >(verifications: T[]): T[] {
    const latest = new Map<string, T>();

    for (const verification of verifications) {
      const docType = verification.document.docType;
      const existing = latest.get(docType);

      if (
        !existing ||
        new Date(verification.document.createdAt) >
          new Date(existing.document.createdAt)
      ) {
        latest.set(docType, verification);
      }
    }

    return Array.from(latest.values());
  }

  /**
   * Verified, PDF-mergeable documents for a single candidate-project nomination.
   * Excludes superseded/reuploaded rows, processing-team uploads, and non-verified latest rows.
   */
  private async getVerifiedDocumentsForMerge(
    cpMap: { id: string; candidateId: string },
    roleCatalogId?: string,
  ) {
    const verifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: {
          candidateProjectMapId: cpMap.id,
          isDeleted: false,
          isReuploaded: false,
          isUploadedByProcessingTeam: false,
          ...(roleCatalogId
            ? { OR: [{ roleCatalogId }, { roleCatalogId: null }] }
            : {}),
        },
        include: {
          document: true,
        },
        orderBy: {
          document: {
            createdAt: 'asc',
          },
        },
      });

    const latestPerDocType = this.selectLatestVerificationsPerDocType(verifications);

    return latestPerDocType.filter(
      (verification) =>
        verification.status === DOCUMENT_STATUS.VERIFIED &&
        !verification.document.isDeleted &&
        verification.document.candidateId === cpMap.candidateId &&
        isPdfMergeableDocument(verification.document),
    );
  }

  private readonly logger = new Logger(DocumentsService.name);

  /** Broadcast requirements/verification cache refresh to all connected clients. */
  private async publishDocumentVerificationSync(params: {
    candidateId: string;
    projectId?: string;
    message: string;
  }): Promise<void> {
    try {
      await this.outboxService.publishDataSync({
        type: 'DocumentVerification',
        candidateId: params.candidateId,
        projectId: params.projectId,
        message: params.message,
      });
    } catch (err) {
      this.logger.error(
        `Failed to publish document verification sync: ${(err as Error).message}`,
      );
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly processingService: ProcessingService,
    private readonly uploadService: UploadService,
    private readonly googleDriveService: GoogleDriveService,
    @InjectQueue('document-forward') private readonly documentForwardQueue: Queue,
  ) { }

  /**
   * Upload a new document for a candidate
   */
  async create(
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ): Promise<DocumentWithRelations> {
    // Validate candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: createDocumentDto.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(
        `Candidate with ID ${createDocumentDto.candidateId} not found`,
      );
    }

    // Validate stored file size (upload route compresses before storage)
    if (createDocumentDto.fileSize && createDocumentDto.docType) {
      const maxBytes = getEffectiveMaxBytes(createDocumentDto.docType);
      if (createDocumentDto.fileSize > maxBytes) {
        const maxSizeMB = maxBytes / (1024 * 1024);
        throw new BadRequestException(
          `File size exceeds maximum allowed ${maxSizeMB}MB for ${createDocumentDto.docType}`,
        );
      }
    }

    // Validate expiry date for documents that require it
    if (
      createDocumentDto.docType in DOCUMENT_TYPE_META &&
      DOCUMENT_TYPE_META[createDocumentDto.docType].expiryRequired &&
      !createDocumentDto.expiryDate
    ) {
      // Relaxed: do not throw here to avoid surfacing this error to callers.
      // Previously we raised a BadRequestException: `Expiry date is required for ${createDocumentDto.docType}`
      this.logger.warn(`Expiry date missing for ${createDocumentDto.docType}; continuing without expiryDate.`);
    }

    validatePassportDocumentFields(createDocumentDto.docType, {
      documentNumber: createDocumentDto.documentNumber,
      expiryDate: createDocumentDto.expiryDate,
    });
    validateEligibilityDocumentFields(createDocumentDto.docType, {
      documentNumber: createDocumentDto.documentNumber,
      issuedAt: createDocumentDto.issuedAt,
      expiryDate: createDocumentDto.expiryDate,
    });

    const explicitRoleCatalogId =
      createDocumentDto.roleCatalog ||
      createDocumentDto.roleCatalogId ||
      createDocumentDto.roleCatelogId ||
      null;

    // Some document types are role-scoped in the UI (e.g. experience letters).
    // If caller didn't send `roleCatalogId`, default to the candidate's roleCatalogId when available.
    let resolvedRoleCatalogId: string | null = explicitRoleCatalogId;
    if (!resolvedRoleCatalogId && createDocumentDto.docType === 'experience_letters') {
      // Prefer the linked work-experience role when present (most accurate).
      if (createDocumentDto.workExperienceId) {
        const we = await this.prisma.workExperience.findFirst({
          where: {
            id: createDocumentDto.workExperienceId,
            candidateId: createDocumentDto.candidateId,
          },
          select: { roleCatalogId: true },
        });
        resolvedRoleCatalogId = we?.roleCatalogId ?? null;
      }

      // Fall back to the candidate's roleCatalogId (if your Candidate model stores it).
      if (!resolvedRoleCatalogId) {
        resolvedRoleCatalogId = (candidate as any).roleCatalogId ?? null;
      }

      // Fall back to most recent role-scoped document (e.g. resume).
      if (!resolvedRoleCatalogId) {
        const recentRoleDoc = await this.prisma.document.findFirst({
          where: {
            candidateId: createDocumentDto.candidateId,
            roleCatalogId: { not: null },
            isDeleted: false,
          },
          orderBy: { createdAt: 'desc' },
          select: { roleCatalogId: true },
        });
        resolvedRoleCatalogId = (recentRoleDoc?.roleCatalogId as string | null) ?? null;
      }

      // Final fallback: most recent candidate-project roleNeeded roleCatalogId.
      if (!resolvedRoleCatalogId) {
        const recentAssignment = await this.prisma.candidateProjects.findFirst({
          where: { candidateId: createDocumentDto.candidateId },
          orderBy: { createdAt: 'desc' },
          select: { roleNeeded: { select: { roleCatalogId: true } } },
        });
        resolvedRoleCatalogId = recentAssignment?.roleNeeded?.roleCatalogId ?? null;
      }
    }

    if (this.isResumeOrCvDocument(createDocumentDto.docType)) {
      if (!resolvedRoleCatalogId) {
        throw new BadRequestException(
          'roleCatalogId is required for resume/cv documents',
        );
      }
      await this.assertValidResumeRoleCatalog(resolvedRoleCatalogId);
    }

    // Create document
    const document = await this.prisma.document.create({
      data: {
        candidateId: createDocumentDto.candidateId,
        docType: createDocumentDto.docType,
        docName: createDocumentDto.docName ?? null,
        fileName: createDocumentDto.fileName,
        fileUrl: createDocumentDto.fileUrl,
        fileSize: createDocumentDto.fileSize,
        mimeType: createDocumentDto.mimeType,
        expiryDate: parseDocumentDate(createDocumentDto.expiryDate) ?? null,
        issuedAt: parseDocumentDate(createDocumentDto.issuedAt) ?? null,
        documentNumber: createDocumentDto.documentNumber,
        notes: createDocumentDto.notes,
        roleCatalogId: resolvedRoleCatalogId,
        workExperienceId: createDocumentDto.workExperienceId ?? null,
        uploadedBy: userId,
        status: DOCUMENT_STATUS.PENDING,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
            email: true,
          },
        },
        roleCatalog: true,
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await syncCandidatePassportNumberFromDocument(
      this.prisma,
      createDocumentDto.candidateId,
      createDocumentDto.docType,
      createDocumentDto.documentNumber,
    );
    await syncCandidateEligibilityNumberFromDocument(
      this.prisma,
      createDocumentDto.candidateId,
      createDocumentDto.docType,
      createDocumentDto.documentNumber,
    );

    // Attach to a processing step if requested
    if (createDocumentDto.processingStepId) {
      await this.processingService.attachDocumentToStep(createDocumentDto.processingStepId, document.id, userId);
    }

    await this.publishDocumentVerificationSync({
      candidateId: createDocumentDto.candidateId,
      message: 'Document uploaded successfully',
    });

    return document as DocumentWithRelations;
  }

  /**
   * Get candidate data for naming files
   */
  async getCandidateForNaming(candidateId: string) {
    return this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { firstName: true, lastName: true },
    });
  }

  /**
   * Get all documents with pagination and filtering
   */
  async findAll(query: QueryDocumentsDto): Promise<PaginatedDocuments> {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;
    const normalizedSearch = search?.trim();

    // Build where clause
    const where: any = { isDeleted: false };

    if (filters.candidateId) {
      where.candidateId = filters.candidateId;
    }

    if (filters.docType) {
      where.docType = filters.docType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.uploadedBy) {
      where.uploadedBy = filters.uploadedBy;
    }

    if (filters.roleCatalogId) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { roleCatalogId: filters.roleCatalogId },
            { roleCatalogId: null },
          ],
        },
      ];
    }

    if (normalizedSearch) {
      where.AND = [
        {
          OR: [
            { fileName: { contains: normalizedSearch, mode: 'insensitive' } },
            { docName: { contains: normalizedSearch, mode: 'insensitive' } },
            {
              documentNumber: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
            {
              roleCatalog: {
                is: {
                  name: { contains: normalizedSearch, mode: 'insensitive' },
                },
              },
            },
            {
              roleCatalog: {
                is: {
                  label: { contains: normalizedSearch, mode: 'insensitive' },
                },
              },
            },
            {
              roleCatalog: {
                is: {
                  roleDepartment: {
                    is: {
                      name: { contains: normalizedSearch, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
            {
              roleCatalog: {
                is: {
                  roleDepartment: {
                    is: {
                      label: {
                        contains: normalizedSearch,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }

    // Get total count and documents
    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              countryCode: true,
              mobileNumber: true,
              email: true,
            },
          },
          roleCatalog: true,
          verifications: {
            where: { isDeleted: false },
            include: {
              candidateProjectMap: {
                include: {
                  project: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const docsWithActors = await this.attachDocumentActorNames(
      documents as DocumentWithRelations[],
    );

    return {
      documents: docsWithActors.map((d) =>
        this.enrichDocumentListItem(d as unknown as Record<string, unknown>),
      ) as DocumentListRow[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single document by ID
   */
  async findOne(id: string): Promise<DocumentWithRelations> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
            email: true,
          },
        },
        roleCatalog: true,
        verifications: {
          where: { isDeleted: false },
          include: {
            candidateProjectMap: {
              include: {
                project: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!document || (document as any).isDeleted) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document as DocumentWithRelations;
  }

  /**
   * Update a document
   */
  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<DocumentWithRelations> {
    // Check if document exists
    const existingDocument = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!existingDocument) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    const docType = updateDocumentDto.docType || existingDocument.docType;
    const mergedDocumentNumber =
      updateDocumentDto.documentNumber !== undefined
        ? updateDocumentDto.documentNumber
        : existingDocument.documentNumber;
    const mergedExpiryDate =
      updateDocumentDto.expiryDate !== undefined
        ? updateDocumentDto.expiryDate
        : existingDocument.expiryDate;
    const mergedIssuedAt =
      updateDocumentDto.issuedAt !== undefined
        ? updateDocumentDto.issuedAt
        : existingDocument.issuedAt;

    validatePassportDocumentFields(docType, {
      documentNumber: mergedDocumentNumber,
      expiryDate: mergedExpiryDate,
    });
    validateEligibilityDocumentFields(docType, {
      documentNumber: mergedDocumentNumber,
      issuedAt: mergedIssuedAt,
      expiryDate: mergedExpiryDate,
    });

    // Update document
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        docName: updateDocumentDto.docName,
        fileName: updateDocumentDto.fileName,
        fileUrl: updateDocumentDto.fileUrl,
        fileSize: updateDocumentDto.fileSize,
        mimeType: updateDocumentDto.mimeType,
        expiryDate:
          updateDocumentDto.expiryDate !== undefined
            ? parseDocumentDate(updateDocumentDto.expiryDate)
            : undefined,
        issuedAt:
          updateDocumentDto.issuedAt !== undefined
            ? parseDocumentDate(updateDocumentDto.issuedAt)
            : undefined,
        documentNumber: updateDocumentDto.documentNumber,
        notes: updateDocumentDto.notes,
        roleCatalogId:
          updateDocumentDto.roleCatalog || updateDocumentDto.roleCatalogId || updateDocumentDto.roleCatelogId || null,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
            email: true,
          },
        },
        roleCatalog: true,
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await syncCandidatePassportNumberFromDocument(
      this.prisma,
      existingDocument.candidateId,
      docType,
      mergedDocumentNumber,
    );
    await syncCandidateEligibilityNumberFromDocument(
      this.prisma,
      existingDocument.candidateId,
      docType,
      mergedDocumentNumber,
    );

    return document as DocumentWithRelations;
  }

  /**
   * Delete a document
   */
  async remove(id: string): Promise<void> {
    // Check if document exists
    const document = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!document || (document as any).isDeleted) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Soft delete the document
    await this.prisma.document.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      } as any,
    });

    // Also soft-delete any verifications associated with this document
    await this.prisma.candidateProjectDocumentVerification.updateMany({
      where: { documentId: id, isDeleted: false } as any,
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      } as any,
    });
  }

  /**
   * Verify a document for a specific project nomination
   */
  async verifyDocument(
    documentId: string,
    verifyDto: VerifyDocumentDto,
    verifierId: string,
  ): Promise<any> {
    // Check document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check candidateProjectMap exists
    const candidateProjectMap =
      await this.prisma.candidateProjects.findUnique({
        where: { id: verifyDto.candidateProjectMapId },
        include: {
          candidate: true,
          project: {
            include: {
              documentRequirements: true,
            },
          },
        },
      });
    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${verifyDto.candidateProjectMapId} not found`,
      );
    }

    // Verify document belongs to this candidate
    if (document.candidateId !== candidateProjectMap.candidateId) {
      throw new BadRequestException(
        'Document does not belong to this candidate',
      );
    }

    // Get verifier details for history
    const verifier = await this.prisma.user.findUnique({
      where: { id: verifierId },
      select: { name: true },
    });

    // Check if verification record exists
    let verification =
      await this.prisma.candidateProjectDocumentVerification.findUnique({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId: verifyDto.candidateProjectMapId,
            documentId: documentId,
          },
        },
      });

    // Create or update verification in a transaction with history
    verification = await this.prisma.$transaction(async (tx) => {
      let updatedVerification;

      if (!verification) {
        // Create new verification
        updatedVerification = await tx.candidateProjectDocumentVerification.create({
          data: {
            candidateProjectMapId: verifyDto.candidateProjectMapId,
            documentId: documentId,
            roleCatalogId: verifyDto.roleCatalogId,
            status: verifyDto.status,
            notes: verifyDto.notes,
            rejectionReason: verifyDto.rejectionReason,
            isDeleted: false,
          } as any,
        });
      } else {
        // Update existing verification (undelete if it was deleted)
        updatedVerification = await tx.candidateProjectDocumentVerification.update({
          where: { id: verification.id },
          data: {
            roleCatalogId: verifyDto.roleCatalogId || verifyDto.roleCatalog || verifyDto.roleCatelogId || null,
            status: verifyDto.status,
            notes: verifyDto.notes,
            rejectionReason: verifyDto.rejectionReason,
            isDeleted: false,
            deletedAt: null,
          } as any,
        });
      }

      // update main document status
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: verifyDto.status,
          verifiedAt:
            verifyDto.status === DOCUMENT_STATUS.VERIFIED ? new Date() : null,
          rejectedAt:
            verifyDto.status === DOCUMENT_STATUS.REJECTED ? new Date() : null,
          verifiedBy:
            verifyDto.status === DOCUMENT_STATUS.VERIFIED ? verifierId : null,
          rejectedBy:
            verifyDto.status === DOCUMENT_STATUS.REJECTED ? verifierId : null,
          rejectionReason:
            verifyDto.status === DOCUMENT_STATUS.REJECTED
              ? verifyDto.rejectionReason || null
              : null,
        },
      });



      // Create history entry
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: updatedVerification.id,
          action: verifyDto.status,
          performedBy: verifierId,
          performedByName: verifier?.name || null,
          notes: verifyDto.notes,
          reason: verifyDto.rejectionReason,
        },
      });

      return updatedVerification;
    });

    // Update CandidateProjectMap status based on verification
    await this.updateCandidateProjectStatus(verifyDto.candidateProjectMapId);

    // Publish event for specific document verification/rejection
    const isIntroductionVideo =
      document.docType === DOCUMENT_TYPE.INTRODUCTION_VIDEO;

    if (verifyDto.status === DOCUMENT_STATUS.VERIFIED) {
      if (isIntroductionVideo) {
        await this.outboxService.publishIntroductionVideoVerified(
          documentId,
          verifierId,
          verifyDto.candidateProjectMapId,
        );
      } else {
        await this.outboxService.publishDocumentVerified(
          documentId,
          verifierId,
          verifyDto.candidateProjectMapId,
        );
      }
    } else if (verifyDto.status === DOCUMENT_STATUS.REJECTED) {
      if (isIntroductionVideo) {
        await this.outboxService.publishIntroductionVideoRejected(
          documentId,
          verifierId,
          verifyDto.candidateProjectMapId,
          verifyDto.rejectionReason,
        );
      } else {
        await this.outboxService.publishDocumentRejected(
          documentId,
          verifierId,
          verifyDto.candidateProjectMapId,
          verifyDto.rejectionReason,
        );
      }
    }

    /* 
    NOT WANTED: The user wants notification ONLY on explicit "complete-verification" button click.
    Removing automatic "CandidateDocumentsVerified" trigger here.
    
    if (verifyDto.status === DOCUMENT_STATUS.VERIFIED) {
      const summary = await this.getDocumentSummary(
        verifyDto.candidateProjectMapId,
      );

      if (summary.allDocumentsVerified) {
        // Publish event to notify recruiter that all documents are verified
        await this.outboxService.publishCandidateDocumentsVerified(
          verifyDto.candidateProjectMapId,
          verifierId,
        );
      }
    }
    */

    return verification;
  }

  /**
   * Request resubmission of a document
   */
  async requestResubmission(
    documentId: string,
    requestDto: RequestResubmissionDto,
    requesterId: string,
  ): Promise<any> {
    // Check document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check candidateProjectMap exists
    const candidateProjectMap =
      await this.prisma.candidateProjects.findUnique({
        where: { id: requestDto.candidateProjectMapId },
      });
    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${requestDto.candidateProjectMapId} not found`,
      );
    }

    // Get requester details for history
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true },
    });

    // Get or create verification record with history
    let verification = await this.prisma.$transaction(async (tx) => {
      let updatedVerification = await tx.candidateProjectDocumentVerification.findUnique({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId: requestDto.candidateProjectMapId,
            documentId: documentId,
          },
        },
      });

      if (!updatedVerification) {
        updatedVerification = await tx.candidateProjectDocumentVerification.create({
          data: {
            candidateProjectMapId: requestDto.candidateProjectMapId,
            documentId: documentId,
            roleCatalogId: requestDto.roleCatalogId || requestDto.roleCatalog || requestDto.roleCatelogId || null,
            status: DOCUMENT_STATUS.RESUBMISSION_REQUIRED,
            resubmissionRequested: true,
            rejectionReason: requestDto.reason,
            isDeleted: false,
          } as any,
        });
      } else {
        updatedVerification = await tx.candidateProjectDocumentVerification.update({
          where: { id: updatedVerification.id },
          data: {
            roleCatalogId: requestDto.roleCatalogId || requestDto.roleCatalog || requestDto.roleCatelogId || null,
            status: DOCUMENT_STATUS.RESUBMISSION_REQUIRED,
            resubmissionRequested: true,
            rejectionReason: requestDto.reason,
            isDeleted: false,
            deletedAt: null,
          } as any,
        });
      }

      // Create history entry
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: updatedVerification.id,
          action: DOCUMENT_STATUS.RESUBMISSION_REQUIRED,
          performedBy: requesterId,
          performedByName: requester?.name || null,
          reason: requestDto.reason,
        },
      });

      return updatedVerification;
    });

    // Get pending documents status
    const pendingDocsStatus = await this.prisma.candidateProjectStatus.findFirst({
      where: { statusName: 'pending_documents' },
    });

    // Update candidateProjectMap status to pending_documents
    if (pendingDocsStatus) {
      await this.prisma.candidateProjects.update({
        where: { id: requestDto.candidateProjectMapId },
        data: {
          currentProjectStatusId: pendingDocsStatus.id,
        },
      });
    }

    // Publish event for document resubmission request
    if (document.docType === DOCUMENT_TYPE.INTRODUCTION_VIDEO) {
      await this.outboxService.publishIntroductionVideoResubmissionRequested(
        documentId,
        requesterId,
        requestDto.candidateProjectMapId,
        requestDto.reason,
      );
    } else {
      await this.outboxService.publishDocumentResubmissionRequested(
        documentId,
        requesterId,
        requestDto.candidateProjectMapId,
        requestDto.reason,
      );
    }

    return verification;
  }

  private static readonly UPLOAD_REQUESTED_ACTION = 'upload_requested';

  static buildDefaultOfferLetterUploadRequestReason(
    requesterName?: string | null,
  ): string {
    return `This candidate was sent for processing without an offer letter. The interview coordinator did not receive the signed offer letter from the candidate at the time of sending. Please call the candidate to obtain the signed offer letter and upload it once received.${
      requesterName ? ` (Requested by ${requesterName})` : ''
    }`;
  }

  static formatOfferLetterUploadRequestReason(
    note: string,
    requesterName?: string | null,
  ): string {
    const trimmed = note.trim();
    if (requesterName && !/\(Requested by /i.test(trimmed)) {
      return `${trimmed} (Requested by ${requesterName})`;
    }
    return trimmed;
  }

  /**
   * Manually request the assigned recruiter to upload a missing offer letter.
   */
  async requestOfferLetterUpload(
    dto: RequestOfferLetterUploadDto,
    requesterId: string,
  ): Promise<{ success: boolean }> {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: dto.candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, title: true },
        },
        recruiter: { select: { id: true, name: true } },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${dto.candidateProjectMapId} not found`,
      );
    }

    if (!candidateProject.recruiterId) {
      throw new BadRequestException(
        'No recruiter is assigned to this candidate project nomination',
      );
    }

    const existingOfferLetter =
      await this.prisma.candidateProjectDocumentVerification.findFirst({
        where: {
          candidateProjectMapId: dto.candidateProjectMapId,
          isDeleted: false,
          document: {
            docType: DOCUMENT_TYPE.OFFER_LETTER,
            isDeleted: false,
          },
        },
      });

    if (existingOfferLetter) {
      throw new BadRequestException(
        'An offer letter is already uploaded for this project nomination',
      );
    }

    const existingRequest = await this.getLatestUploadRequest(
      dto.candidateProjectMapId,
      DOCUMENT_TYPE.OFFER_LETTER,
    );

    if (existingRequest) {
      throw new BadRequestException(
        'An offer letter upload request is already pending for this project nomination',
      );
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true },
    });

    const requesterName = requester?.name || null;
    const reason = DocumentsService.formatOfferLetterUploadRequestReason(
      dto.reason,
      requesterName,
    );
    const candidateName = `${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName}`;

    await this.requestOfferLetterUploadAfterSendForProcessing({
      candidateProjectMapId: dto.candidateProjectMapId,
      candidateId: candidateProject.candidate.id,
      projectId: candidateProject.project.id,
      recruiterId: candidateProject.recruiterId,
      roleCatalogId: dto.roleCatalogId ?? null,
      requesterId,
      requesterName,
      candidateName,
      projectName: candidateProject.project.title,
      reason,
    });

    return { success: true };
  }

  /**
   * Request recruiter to upload a missing required document for a project.
   */
  async requestMissingDocumentUpload(
    dto: RequestMissingDocumentDto,
    requesterId: string,
  ): Promise<{ success: boolean }> {
    const { candidateProjectMapId, docType, reason, roleCatalogId } = dto;

    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: {
            id: true,
            title: true,
            documentRequirements: {
              where: { isDeleted: false } as any,
              select: { docType: true },
            },
          },
        },
        recruiter: { select: { id: true, name: true } },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${candidateProjectMapId} not found`,
      );
    }

    if (!candidateProject.recruiterId) {
      throw new BadRequestException(
        'Recruiter ID is missing for this candidate project',
      );
    }

    const requirement = candidateProject.project.documentRequirements.find(
      (r) => r.docType === docType,
    );
    if (!requirement) {
      throw new BadRequestException(
        `Document type "${docType}" is not a requirement for this project`,
      );
    }

    const existingVerification =
      await this.prisma.candidateProjectDocumentVerification.findFirst({
        where: {
          candidateProjectMapId,
          isDeleted: false,
          document: {
            docType,
            isDeleted: false,
          },
        },
      });

    if (existingVerification) {
      throw new BadRequestException(
        `A document of type "${docType}" is already submitted for this project`,
      );
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true },
    });

    const docLabel =
      DOCUMENT_TYPE_META[docType as DocumentType]?.displayName ??
      this.formatDocTypeKey(docType);

    await this.prisma.documentVerificationHistory.create({
      data: {
        verificationId: null,
        action: DocumentsService.UPLOAD_REQUESTED_ACTION,
        performedBy: requesterId,
        performedByName: requester?.name || null,
        reason,
        notes: JSON.stringify({ docType, candidateProjectMapId, roleCatalogId }),
      },
    });

    const candidateName = `${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName}`;
    const projectTitle = candidateProject.project.title;

    await this.outboxService.publishRecruiterNotification(
      candidateProject.recruiterId,
      `Missing document "${docLabel}" requested for ${candidateName} on project ${projectTitle}. Reason: ${reason}`,
      'Missing Document Upload Requested',
      `/recruiter-docs/${candidateProject.project.id}/${candidateProject.candidate.id}`,
      {
        type: 'document_upload_requested',
        docType,
        candidateProjectMapId,
        candidateId: candidateProject.candidate.id,
        projectId: candidateProject.project.id,
        requestedBy: requesterId,
        reason,
        roleCatalogId: roleCatalogId ?? null,
      },
    );

    return { success: true };
  }

  private async getUploadRequestsForCandidateProject(
    candidateProjectMapId: string,
  ): Promise<
    Map<string, { reason: string; requestedAt: string }>
  > {
    const histories = await this.prisma.documentVerificationHistory.findMany({
      where: {
        action: DocumentsService.UPLOAD_REQUESTED_ACTION,
        notes: { contains: candidateProjectMapId },
      },
      orderBy: { performedAt: 'desc' },
    });

    const byDocType = new Map<string, { reason: string; requestedAt: string }>();

    for (const entry of histories) {
      if (!entry.notes) continue;
      try {
        const parsed = JSON.parse(entry.notes) as {
          docType?: string;
          candidateProjectMapId?: string;
        };
        if (
          parsed.candidateProjectMapId !== candidateProjectMapId ||
          !parsed.docType
        ) {
          continue;
        }
        if (!byDocType.has(parsed.docType)) {
          byDocType.set(parsed.docType, {
            reason: entry.reason || '',
            requestedAt: entry.performedAt.toISOString(),
          });
        }
      } catch {
        continue;
      }
    }

    return byDocType;
  }

  /**
   * Notify recruiter to upload offer letter when coordinator sends for processing without one.
   */
  async requestOfferLetterUploadAfterSendForProcessing(
    params: {
      candidateProjectMapId: string;
      candidateId: string;
      projectId: string;
      recruiterId: string;
      roleCatalogId?: string | null;
      requesterId: string;
      requesterName?: string | null;
      candidateName: string;
      projectName: string;
      reason?: string;
    },
    tx?: any,
  ): Promise<void> {
    const {
      candidateProjectMapId,
      candidateId,
      projectId,
      recruiterId,
      roleCatalogId,
      requesterId,
      requesterName,
      candidateName,
      projectName,
    } = params;

    const existingOfferLetter =
      await this.prisma.candidateProjectDocumentVerification.findFirst({
        where: {
          candidateProjectMapId,
          isDeleted: false,
          document: {
            docType: DOCUMENT_TYPE.OFFER_LETTER,
            isDeleted: false,
          },
        },
      });

    if (existingOfferLetter) {
      return;
    }

    const reason =
      params.reason?.trim() ||
      DocumentsService.buildDefaultOfferLetterUploadRequestReason(requesterName);

    const prisma = tx ?? this.prisma;

    await prisma.documentVerificationHistory.create({
      data: {
        verificationId: null,
        action: DocumentsService.UPLOAD_REQUESTED_ACTION,
        performedBy: requesterId,
        performedByName: requesterName || null,
        reason,
        notes: JSON.stringify({
          docType: DOCUMENT_TYPE.OFFER_LETTER,
          candidateProjectMapId,
          roleCatalogId: roleCatalogId ?? null,
        }),
      },
    });

    await this.outboxService.publishOfferLetterUploadRequested(
      {
        candidateId,
        projectId,
        candidateProjectMapId,
        recruiterId,
        roleCatalogId: roleCatalogId ?? null,
        candidateName,
        projectTitle: projectName,
        requestedBy: requesterId,
        requestedByName: requesterName ?? null,
        reason,
      },
      tx,
    );

    await this.outboxService.publishDataSync(
      {
        type: 'OfferLetterUploadRequested',
        candidateId,
        projectId,
        candidateProjectMapId,
        message: reason,
      },
      tx,
    );
  }

  async getOfferLetterUploadRequestsForCandidate(candidateId: string) {
    const nominations = await this.prisma.candidateProjects.findMany({
      where: { candidateId },
      select: {
        id: true,
        projectId: true,
        roleNeeded: {
          select: {
            roleCatalogId: true,
            roleCatalog: { select: { id: true } },
          },
        },
        documentVerifications: {
          where: {
            isDeleted: false,
            document: {
              docType: DOCUMENT_TYPE.OFFER_LETTER,
              isDeleted: false,
            },
          },
          take: 1,
        },
      },
    });

    const requests: Array<{
      candidateProjectMapId: string;
      projectId: string;
      roleCatalogId: string | null;
      reason: string;
      requestedAt: string;
      requestedBy: string;
    }> = [];

    for (const nomination of nominations) {
      if (nomination.documentVerifications.length > 0) {
        continue;
      }

      const latest = await this.getLatestUploadRequest(
        nomination.id,
        DOCUMENT_TYPE.OFFER_LETTER,
      );
      if (!latest) {
        continue;
      }

      requests.push({
        candidateProjectMapId: nomination.id,
        projectId: nomination.projectId,
        roleCatalogId:
          nomination.roleNeeded?.roleCatalogId ||
          nomination.roleNeeded?.roleCatalog?.id ||
          null,
        reason: latest.reason,
        requestedAt: latest.requestedAt,
        requestedBy: latest.requestedBy,
      });
    }

    return requests;
  }

  private async getLatestUploadRequest(
    candidateProjectMapId: string,
    docType: string,
  ): Promise<{
    reason: string;
    requestedAt: string;
    requestedBy: string;
  } | null> {
    const histories = await this.prisma.documentVerificationHistory.findMany({
      where: {
        action: DocumentsService.UPLOAD_REQUESTED_ACTION,
        notes: { contains: candidateProjectMapId },
      },
      orderBy: { performedAt: 'desc' },
    });

    for (const entry of histories) {
      if (!entry.notes || !entry.performedBy) continue;
      try {
        const parsed = JSON.parse(entry.notes) as {
          docType?: string;
          candidateProjectMapId?: string;
        };
        if (
          parsed.candidateProjectMapId !== candidateProjectMapId ||
          parsed.docType !== docType
        ) {
          continue;
        }
        return {
          reason: entry.reason || '',
          requestedAt: entry.performedAt.toISOString(),
          requestedBy: entry.performedBy,
        };
      } catch {
        continue;
      }
    }

    return null;
  }

  private async notifyDocumentationTeamOfMissingDocumentUpload(params: {
    candidateProjectMapId: string;
    candidateId: string;
    projectId: string;
    projectTitle: string;
    candidateFirstName: string;
    candidateLastName: string;
    docType: string;
    fileName: string;
    documentId: string;
    uploadedByUserId: string;
    recruiterId?: string | null;
  }): Promise<void> {
    if (
      params.recruiterId &&
      params.uploadedByUserId !== params.recruiterId
    ) {
      return;
    }

    const latestRequest = await this.getLatestUploadRequest(
      params.candidateProjectMapId,
      params.docType,
    );
    if (!latestRequest?.requestedBy) {
      return;
    }

    const docLabel =
      DOCUMENT_TYPE_META[params.docType as DocumentType]?.displayName ??
      this.formatDocTypeKey(params.docType);
    const candidateName =
      `${params.candidateFirstName} ${params.candidateLastName}`.trim();

    await this.outboxService.publishDocumentationNotification(
      latestRequest.requestedBy,
      `Recruiter uploaded the requested missing document "${docLabel}" (${params.fileName}) for ${candidateName} on project ${params.projectTitle}.`,
      'Missing Document Uploaded',
      `/candidates/${params.candidateId}/documents/${params.projectId}`,
      {
        type: 'document_missing_uploaded',
        docType: params.docType,
        documentId: params.documentId,
        candidateId: params.candidateId,
        projectId: params.projectId,
        candidateProjectMapId: params.candidateProjectMapId,
        uploadedBy: params.uploadedByUserId,
      },
    );
  }

  private async notifyRecruiterOfDocumentationMissingDocumentUpload(params: {
    candidateProjectMapId: string;
    candidateId: string;
    projectId: string;
    projectTitle: string;
    candidateFirstName: string;
    candidateLastName: string;
    docType: string;
    fileName: string;
    documentId: string;
    uploadedByUserId: string;
    recruiterId: string;
  }): Promise<void> {
    if (params.uploadedByUserId === params.recruiterId) {
      return;
    }

    const docLabel =
      DOCUMENT_TYPE_META[params.docType as DocumentType]?.displayName ??
      this.formatDocTypeKey(params.docType);
    const candidateName =
      `${params.candidateFirstName} ${params.candidateLastName}`.trim();

    await this.outboxService.publishRecruiterNotification(
      params.recruiterId,
      `Documentation team uploaded missing document "${docLabel}" (${params.fileName}) for ${candidateName} on project ${params.projectTitle}.`,
      'Missing Document Uploaded by Documentation Team',
      `/recruiter-docs/${params.projectId}/${params.candidateId}`,
      {
        type: 'document_uploaded_by_documentation',
        docType: params.docType,
        documentId: params.documentId,
        candidateId: params.candidateId,
        projectId: params.projectId,
        candidateProjectMapId: params.candidateProjectMapId,
        uploadedBy: params.uploadedByUserId,
      },
    );
  }

  private computeDocumentSummaryForCandidateProject(cp: {
    project?: {
      introductionVideoRequired?: boolean;
      documentRequirements?: Array<{ docType: string }>;
    };
    documentVerifications?: Array<{ document?: { docType?: string } }>;
  }) {
    const requirements = cp.project?.documentRequirements ?? [];
    const introRequired = cp.project?.introductionVideoRequired === true;
    const requiredDocTypes = requirements.map((r) => r.docType);
    if (introRequired) {
      requiredDocTypes.push(DOCUMENT_TYPE.INTRODUCTION_VIDEO);
    }

    const submittedDocTypes = new Set(
      (cp.documentVerifications ?? [])
        .map((v) => v.document?.docType)
        .filter((t): t is string => Boolean(t)),
    );

    const missingDocTypes = requiredDocTypes.filter(
      (type) => !submittedDocTypes.has(type),
    );

    const requiredCount = requiredDocTypes.length;
    const submittedCount = requiredDocTypes.filter((type) =>
      submittedDocTypes.has(type),
    ).length;

    return {
      requiredCount,
      submittedCount,
      missingCount: missingDocTypes.length,
      missingDocTypes,
    };
  }

  /**
   * Request document re-upload after a client has requested revisions
   */
  async requestClientReupload(
    dto: RequestClientReuploadDto,
    requesterId: string,
  ): Promise<any> {
    const { candidateProjectMapId, reason } = dto;

    // 1. Validate candidateProjectMap exists
    const cpm = (await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        project: {
          select: {
            id: true,
          },
        },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })) as any;

    if (!cpm) {
      throw new NotFoundException(`Candidate project mapping with ID ${candidateProjectMapId} not found`);
    }

    // Use recruiterId from CandidateProject mapping instead of candidate if it exists there
    const recruiterIdNotification = cpm.recruiterId;

    // 2. Locate statuses
    const mainStatus = await this.prisma.candidateProjectMainStatus.findFirst({
      where: { name: 'documents' },
    });
    const subStatus = await this.prisma.candidateProjectSubStatus.findFirst({
      where: { name: 'client_revision_requested' },
    });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException('Required statuses (documents/client_revision_requested) not found in database.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update CPM status
      const updatedCpm = await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
          updatedAt: new Date(),
        },
      });

      // Record History in CandidateProjectStatusHistory
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId,
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
          changedById: requesterId,
          reason: `Client revision requested: ${reason}`,
          notes: `Client revision requested: ${reason}`,
        },
      });

      // 4. Trigger Recruiter Notification (via Outbox)
      if (recruiterIdNotification) {
        await this.outboxService.publishRecruiterNotification(
          recruiterIdNotification,
          `Client requested document revision for ${cpm.candidate.firstName} ${cpm.candidate.lastName}: ${reason}`,
          'Client Revision Requested',
          `/recruiter-docs/${cpm.project.id}/${cpm.candidate.id}`,
          {
            candidateId: cpm.candidate.id,
            candidateProjectMapId: candidateProjectMapId,
            reason: reason,
          },
        );
      }

      // 5. Trigger Interview Coordinator Notification
      await this.outboxService.publishRoleNotification(
        ROLE_NAMES.INTERVIEW_COORDINATOR,
        `Candidate ${cpm.candidate.firstName} ${cpm.candidate.lastName} is waiting for client revision. Reason: ${reason}`,
        'Client Revision Requested',
        `/interviews/shortlist-pending`, // Link to the list where coordinator can see this candidate
        {
          candidateId: cpm.candidate.id,
          projectId: cpm.project.id,
          candidateProjectMapId: candidateProjectMapId,
          reason: reason,
          candidateName: `${cpm.candidate.firstName} ${cpm.candidate.lastName}`,
          syncTags: ['Interview'], // Specify which tags frontend should invalidate
        },
      );

      return updatedCpm;
    });
  }

  /**
   * Re-upload a document by a recruiter (notifies documentation team)
   */
  async reuploadRecruiter(
    documentId: string,
    reuploadDto: ReuploadDocumentDto,
    userId: string,
  ): Promise<any> {
    const result = await this.reupload(documentId, reuploadDto, userId, true);

    // Find the documentation team members or the person who requested resubmission
    const lastResubmissionHistory = await this.prisma.documentVerificationHistory.findFirst({
      where: {
        verification: {
          candidateProjectMapId: reuploadDto.candidateProjectMapId,
          document: {
            docType: result.updatedDocument.docType,
          },
        },
        action: 'resubmission_required',
      },
      orderBy: { performedAt: 'desc' },
      select: { performedBy: true },
    });

    const candidate = await this.prisma.candidate.findFirst({
      where: { documents: { some: { id: result.updatedDocument.id } } },
    });

    const project = await this.prisma.project.findFirst({
      where: { candidateProjects: { some: { id: reuploadDto.candidateProjectMapId } } },
    });

    if (lastResubmissionHistory?.performedBy) {
      if (result.updatedDocument.docType === DOCUMENT_TYPE.INTRODUCTION_VIDEO) {
        await this.outboxService.publishIntroductionVideoResubmitted(
          result.updatedDocument.id,
          userId,
          reuploadDto.candidateProjectMapId,
        );
      } else {
        await this.outboxService.publishDocumentationNotification(
          lastResubmissionHistory.performedBy,
          `Recruiter has re-uploaded document "${result.updatedDocument.fileName}" for candidate ${candidate?.firstName} ${candidate?.lastName} in project ${project?.title}.`,
          'Document Re-uploaded by Recruiter',
          `/candidates/${candidate?.id}/documents/${project?.id}`,
          {
            documentId: result.updatedDocument.id,
            candidateId: candidate?.id,
            projectId: project?.id,
            reuploadedBy: userId,
          },
        );
      }
    }

    return result;
  }

  /**
   * Re-upload a document by the documentation team (notifies recruiter)
   */
  async reuploadDocumentation(
    documentId: string,
    reuploadDto: ReuploadDocumentDto,
    userId: string,
  ): Promise<any> {
    const result = await this.reupload(documentId, reuploadDto, userId, true);

    const cpMap = await this.prisma.candidateProjects.findUnique({
      where: { id: reuploadDto.candidateProjectMapId },
      select: { recruiterId: true },
    });

    const candidate = await this.prisma.candidate.findFirst({
      where: { documents: { some: { id: result.updatedDocument.id } } },
    });

    const project = await this.prisma.project.findFirst({
      where: { candidateProjects: { some: { id: reuploadDto.candidateProjectMapId } } },
    });

    if (cpMap?.recruiterId) {
      await this.outboxService.publishRecruiterNotification(
        cpMap.recruiterId,
        `Documentation team has re-uploaded document "${result.updatedDocument.fileName}" for candidate ${candidate?.firstName} ${candidate?.lastName} in project ${project?.title}.`,
        'Document Re-uploaded by Documentation Team',
        `/recruiter-docs/${project?.id}/${candidate?.id}`,
        {
          documentId: result.updatedDocument.id,
          candidateId: candidate?.id,
          projectId: project?.id,
          reuploadedBy: userId,
        },
      );
    }

    return result;
  }

  /**
   * Re-upload a document after resubmission request
   */
  async reupload(
    documentId: string,
    reuploadDto: ReuploadDocumentDto,
    userId: string,
    skipEvent: boolean = false,
  ): Promise<any> {
    // Check document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check candidateProjectMap exists
    const candidateProjectMap =
      await this.prisma.candidateProjects.findUnique({
        where: { id: reuploadDto.candidateProjectMapId },
      });
    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${reuploadDto.candidateProjectMapId} not found`,
      );
    }

    if (candidateProjectMap.candidateId !== document.candidateId) {
      throw new BadRequestException(
        'This document does not belong to the candidate for the selected project.',
      );
    }

    const resolvedDocumentNumber =
      reuploadDto.documentNumber?.trim() || document.documentNumber;
    const resolvedExpiryDate = reuploadDto.expiryDate ?? document.expiryDate;
    const resolvedIssuedAt = reuploadDto.issuedAt ?? document.issuedAt;

    validatePassportDocumentFields(document.docType, {
      documentNumber: resolvedDocumentNumber,
      expiryDate: resolvedExpiryDate,
    });
    validateEligibilityDocumentFields(document.docType, {
      documentNumber: resolvedDocumentNumber,
      issuedAt: resolvedIssuedAt,
      expiryDate: resolvedExpiryDate,
    });

    // Get user details for history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Find the existing verification to get its metadata
    const oldVerification = await this.prisma.candidateProjectDocumentVerification.findUnique({
      where: {
        candidateProjectMapId_documentId: {
          candidateProjectMapId: reuploadDto.candidateProjectMapId,
          documentId: documentId,
        },
      },
    });

    // Update document and verification in a transaction
    // Instead of updating the shared document, we create a new one to preserve history
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create a NEW document record
      const newDocument = await tx.document.create({
        data: {
          candidateId: document.candidateId,
          docType: document.docType,
          docName:
            typeof reuploadDto.docName === 'string' && reuploadDto.docName.trim() !== ''
              ? reuploadDto.docName.trim()
              : document.docName,
          fileName: reuploadDto.fileName,
          fileUrl: reuploadDto.fileUrl,
          fileSize: reuploadDto.fileSize,
          mimeType: reuploadDto.mimeType,
          expiryDate:
            reuploadDto.expiryDate !== undefined
              ? (parseDocumentDate(reuploadDto.expiryDate) ??
                document.expiryDate ??
                undefined)
              : (document.expiryDate ?? undefined),
          issuedAt:
            reuploadDto.issuedAt !== undefined
              ? (parseDocumentDate(reuploadDto.issuedAt) ??
                document.issuedAt ??
                undefined)
              : (document.issuedAt ?? undefined),
          documentNumber: resolvedDocumentNumber,
          notes: reuploadDto.notes,
          status: DOCUMENT_STATUS.RESUBMITTED,
          roleCatalogId: document.roleCatalogId || oldVerification?.roleCatalogId || null,
          uploadedBy: userId,
        },
      });

      // 2. Mark the old verification as reuploaded/deleted and create a new one
      if (oldVerification) {
        await tx.candidateProjectDocumentVerification.update({
          where: { id: oldVerification.id },
          data: {
            isDeleted: true,
            isReuploaded: true,
            status: "superseded", // or keep original status
            updatedAt: new Date(),
          },
        });
      }

      // Soft-delete the superseded document so callers do not need manage:documents DELETE.
      await tx.document.update({
        where: { id: documentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        } as any,
      });

      // Create the new verification record
      const verification = await tx.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId: reuploadDto.candidateProjectMapId,
          documentId: newDocument.id,
          roleCatalogId: oldVerification?.roleCatalogId || document.roleCatalogId || null,
          status: DOCUMENT_STATUS.RESUBMITTED,
          resubmissionRequested: false,
          notes: reuploadDto.notes,
        },
      });

      // 3. Create history entry for the new verification house
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: verification.id,
          action: DOCUMENT_STATUS.RESUBMITTED,
          performedBy: userId,
          performedByName: user?.name || null,
          notes: `Document re-uploaded (replaced document ID ${documentId})`,
        },
      });

      return { updatedDocument: newDocument, verification };
    });

    await syncCandidatePassportNumberFromDocument(
      this.prisma,
      document.candidateId,
      document.docType,
      resolvedDocumentNumber,
    );
    await syncCandidateEligibilityNumberFromDocument(
      this.prisma,
      document.candidateId,
      document.docType,
      resolvedDocumentNumber,
    );

    // Update CandidateProjectMap status
    await this.updateCandidateProjectStatus(reuploadDto.candidateProjectMapId);

    // Publish event for notification if not skipped
    if (!skipEvent) {
      if (document.docType === DOCUMENT_TYPE.INTRODUCTION_VIDEO) {
        await this.outboxService.publishIntroductionVideoResubmitted(
          result.updatedDocument.id,
          userId,
          reuploadDto.candidateProjectMapId,
        );
      } else {
        await this.outboxService.publishDocumentResubmitted(
          result.updatedDocument.id,
          userId,
          reuploadDto.candidateProjectMapId,
        );
      }
    }

    await this.publishDocumentVerificationSync({
      candidateId: document.candidateId,
      projectId: candidateProjectMap.projectId,
      message: 'Document re-uploaded successfully',
    });

    return result;
  }

  /**
   * Get document verification summary for a candidate-project
   */
  async getDocumentSummary(
    candidateProjectMapId: string,
  ): Promise<CandidateProjectDocumentSummary> {
    const candidateProjectMap =
      await this.prisma.candidateProjects.findUnique({
        where: { id: candidateProjectMapId },
        include: {
          candidate: true,
          project: {
            include: {
              documentRequirements: {
                where: { isDeleted: false } as any,
              },
            },
          },
          documentVerifications: {
            where: { isDeleted: false } as any,
            include: {
              document: {
                include: {
                  roleCatalog: true,
                },
              },
              verificationHistory: {
                where: {
                  action: 'verified',
                },
                orderBy: {
                  performedAt: 'desc',
                },
                take: 1,
              },
            },
          },
        },
      });

    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${candidateProjectMapId} not found`,
      );
    }

    const latestVerificationsMap = new Map<string, (typeof candidateProjectMap.documentVerifications)[number]>();
    for (const v of candidateProjectMap.documentVerifications) {
      const type = v.document.docType;
      if (
        !latestVerificationsMap.has(type) ||
        new Date(v.document.createdAt) >
          new Date(latestVerificationsMap.get(type)!.document.createdAt)
      ) {
        latestVerificationsMap.set(type, v);
      }
    }
    const latestVerifications = Array.from(latestVerificationsMap.values());

    const summaryCounts = this.computeVerificationSummary(
      candidateProjectMap.project.documentRequirements.length,
      candidateProjectMap.project.introductionVideoRequired,
      latestVerifications,
    );
    const {
      totalRequired,
      totalSubmitted,
      totalVerified,
      totalRejected,
      totalPending,
      allDocumentsVerified,
    } = summaryCounts;

    return {
      candidateProjectMapId,
      candidateId: candidateProjectMap.candidateId,
      candidateName: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName}`,
      projectId: candidateProjectMap.projectId,
      projectTitle: candidateProjectMap.project.title,
      totalRequired,
      totalSubmitted,
      totalVerified,
      totalRejected,
      totalPending,
      allDocumentsVerified,
      canApproveCandidate: allDocumentsVerified,
      documents: candidateProjectMap.documentVerifications.map((v) => ({
        documentId: v.documentId,
        docType: v.document.docType,
        fileName: v.document.fileName,
        status: v.document.status,
        verificationStatus: v.status,
        roleCatalogId: v.document.roleCatalogId,
        roleCatalog: v.document.roleCatalog,
        uploadedAt: v.document.createdAt,
        verifiedAt: v.verificationHistory[0]?.performedAt ?? null,
      })),
    };
  }

  /**
   * Get document statistics
   */
  async getStats(): Promise<DocumentStats> {
    const [
      total,
      pending,
      verified,
      rejected,
      expired,
      documentsByType,
      avgVerificationTimeResult,
    ] = await Promise.all([
      this.prisma.document.count({ where: { isDeleted: false } as any }),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.PENDING, isDeleted: false } as any,
      }),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.VERIFIED, isDeleted: false } as any,
      }),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.REJECTED, isDeleted: false } as any,
      }),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.EXPIRED, isDeleted: false } as any,
      }),
      this.prisma.document.groupBy({
        where: { isDeleted: false } as any,
        by: ['docType'],
        _count: true,
      }),
      this.prisma.$queryRaw<
        Array<{ avg: number }>
      >`SELECT AVG(EXTRACT(EPOCH FROM ("verifiedAt" - "createdAt")) / 3600) as avg FROM "public"."documents" WHERE "verifiedAt" IS NOT NULL AND "isDeleted" = false`,
    ]);

    const documentsByTypeMap: Record<string, number> = {};
    documentsByType.forEach((item: any) => {
      documentsByTypeMap[item.docType] = item._count;
    });

    return {
      totalDocuments: total,
      pendingDocuments: pending,
      verifiedDocuments: verified,
      rejectedDocuments: rejected,
      expiredDocuments: expired,
      documentsByType: documentsByTypeMap,
      documentsByStatus: {
        pending,
        verified,
        rejected,
        expired,
        resubmission_required: await this.prisma.document.count({
          where: { status: DOCUMENT_STATUS.RESUBMISSION_REQUIRED },
        }),
      },
      averageVerificationTime: avgVerificationTimeResult[0]?.avg ?? 0,
    };
  }

  /**
   * Update CandidateProjectMap status based on document verification
   * Private helper method
   */
  private async updateCandidateProjectStatus(
    candidateProjectMapId: string,
  ): Promise<void> {
    const summary = await this.getDocumentSummary(candidateProjectMapId);

    const candidateProjectMap =
      await this.prisma.candidateProjects.findUnique({
        where: { id: candidateProjectMapId },
        include: {
          currentProjectStatus: true,
        },
      });

    if (!candidateProjectMap) return;

    // Determine new status name based on document verification
    let newStatusName = candidateProjectMap.currentProjectStatus.statusName;

    if (summary.totalSubmitted === 0) {
      newStatusName = 'pending_documents';
    } else if (
      summary.totalPending > 0 ||
      summary.totalSubmitted < summary.totalRequired
    ) {
      newStatusName = 'verification_in_progress';
    } else if (summary.totalRejected > 0) {
      newStatusName = 'rejected_documents';
    } else if (summary.allDocumentsVerified) {
      newStatusName = 'documents_verified';
    }

    // Only update if status changed
    if (newStatusName !== candidateProjectMap.currentProjectStatus.statusName) {
      const newStatus = await this.prisma.candidateProjectStatus.findFirst({
        where: { statusName: newStatusName },
      });

      if (newStatus) {
        await this.prisma.candidateProjects.update({
          where: { id: candidateProjectMapId },
          data: {
            currentProjectStatusId: newStatus.id,
          },
        });
      }
    }
  }

  /**
   * Upload an offer letter for a candidate and project
   */
  async uploadOfferLetter(
    uploadDto: UploadOfferLetterDto,
    userId: string,
  ): Promise<any> {
    const { candidateId, projectId } = uploadDto;
    const normalizedRoleCatalogId = uploadDto.roleCatalog || uploadDto.roleCatalogId || uploadDto.roleCatelogId;

    if (!normalizedRoleCatalogId) {
      throw new BadRequestException('Role Catalog ID is required');
    }

    // 1. Validate candidate and project exist
    const [candidate, project] = await Promise.all([
      this.prisma.candidate.findUnique({ where: { id: candidateId } }),
      this.prisma.project.findUnique({ where: { id: projectId } }),
    ]);

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 2. Find the CandidateProjects record
    // We need to find the RoleNeeded for this project and roleCatalogId first
    const roleNeeded = await this.prisma.roleNeeded.findFirst({
      where: {
        projectId: projectId,
        roleCatalogId: normalizedRoleCatalogId,
      },
    });

    if (!roleNeeded) {
      throw new NotFoundException(
        `No role matching catalog ID ${normalizedRoleCatalogId} found for project ${projectId}`,
      );
    }

    const candidateProjectMap = await this.prisma.candidateProjects.findUnique({
      where: {
        candidateId_projectId_roleNeededId: {
          candidateId,
          projectId,
          roleNeededId: roleNeeded.id,
        },
      },
      include: {
        subStatus: {
          select: { name: true },
        },
      },
    });

    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate is not nominated for this role in the specified project`,
      );
    }

    const offerLetterUploadEligibleSubStatuses = [
      CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED,
      'transfered_to_processing',
      'processing_in_progress',
      'processing_completed',
      'processing_cancelled',
      'ready_for_final',
    ];
    const nominationSubStatus = candidateProjectMap.subStatus?.name;
    const hasEligibleSubStatus =
      !!nominationSubStatus &&
      offerLetterUploadEligibleSubStatuses.includes(nominationSubStatus);
    const hasPassedInterview = hasEligibleSubStatus
      ? false
      : !!(await this.prisma.interview.findFirst({
          where: {
            candidateProjectMapId: candidateProjectMap.id,
            outcome: 'passed',
          },
          select: { id: true },
        }));

    if (!hasEligibleSubStatus && !hasPassedInterview) {
      throw new BadRequestException(
        'Offer letter can only be uploaded after the candidate has passed the interview',
      );
    }

    // Check if an offer letter already exists for this candidate in this project and role
    const existingOfferLetters = await this.prisma.candidateProjectDocumentVerification.findMany({
      where: {
        candidateProjectMapId: candidateProjectMap.id,
        isDeleted: false,
        document: {
          docType: DOCUMENT_TYPE.OFFER_LETTER,
          isDeleted: false,
        },
      } as any,
      include: { document: true },
    });

    if (existingOfferLetters && existingOfferLetters.length > 0) {
      // Soft-delete existing offer letters and their verification records so the new upload replaces them
      const verificationIds = existingOfferLetters.map((v) => v.id);
      const documentIds = existingOfferLetters.map((v) => v.documentId);

      // Record user name for history
      const userForHistory = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.candidateProjectDocumentVerification.updateMany({
          where: { id: { in: verificationIds } } as any,
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          } as any,
        });

        await tx.document.updateMany({
          where: { id: { in: documentIds }, isDeleted: false } as any,
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          } as any,
        });

        // Add history entries indicating the old offer letter was replaced
        const historyEntries = verificationIds.map((id) => ({
          verificationId: id,
          action: 'resubmission_requested',
          performedBy: userId,
          performedByName: userForHistory?.name || 'System',
          notes: 'Offer letter replaced by a new upload (soft-deleted old record)',
        }));

        if (historyEntries.length > 0) {
          await tx.documentVerificationHistory.createMany({ data: historyEntries });
        }
      });
    }

    // 3. Create document, verification and history in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the document
      const document = await tx.document.create({
        data: {
          candidateId,
          docType: DOCUMENT_TYPE.OFFER_LETTER,
          fileName: uploadDto.fileName,
          fileUrl: uploadDto.fileUrl,
          fileSize: uploadDto.fileSize,
          mimeType: uploadDto.mimeType,
          roleCatalogId: normalizedRoleCatalogId,
          uploadedBy: userId,
          status: DOCUMENT_STATUS.PENDING,
          notes: uploadDto.notes,
        },
      });

      // Get user details for history
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      // Create the verification record
      const verification = await tx.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId: candidateProjectMap.id,
          documentId: document.id,
          roleCatalogId: normalizedRoleCatalogId,
          status: DOCUMENT_STATUS.PENDING,
          notes: uploadDto.notes,
          offerLetterReceivedAt: uploadDto.offerLetterReceivedAt ? new Date(uploadDto.offerLetterReceivedAt) : null,
        },
      });

      // Create history record
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: verification.id,
          action: 'pending',
          performedBy: userId,
          performedByName: user?.name || 'System',
          notes: 'Offer letter uploaded',
        },
      });

      return { document, verification };
    });

    // Update candidate project status
    await this.updateCandidateProjectStatus(candidateProjectMap.id);

    const uploader = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    await this.outboxService.publishOfferLetterUploaded({
      candidateId,
      projectId,
      candidateProjectMapId: candidateProjectMap.id,
      documentId: result.document.id,
      recruiterId: candidateProjectMap.recruiterId,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      projectTitle: project.title,
      roleDesignation: roleNeeded.designation,
      uploadedBy: userId,
      uploadedByName: uploader?.name ?? null,
    });

    return {
      document: {
        ...result.document,
        uploadedByUser: uploader,
      },
      verification: result.verification,
    };
  }

  /**
   * Update offer letter received date on an existing verification
   */
  async updateOfferLetterReceivedDate(
    verificationId: string,
    offerLetterReceivedAt: string,
    userId: string,
  ): Promise<any> {
    const existingVerification = await this.prisma.candidateProjectDocumentVerification.findUnique({
      where: { id: verificationId },
      include: { document: true, candidateProjectMap: true },
    });

    if (!existingVerification) {
      throw new NotFoundException(`Offer letter verification with ID ${verificationId} not found`);
    }

    const updatedVerification = await this.prisma.candidateProjectDocumentVerification.update({
      where: { id: verificationId },
      data: {
        offerLetterReceivedAt: new Date(offerLetterReceivedAt),
        updatedAt: new Date(),
      },
      include: { document: true },
    });

    // Add history entry for this update
    await this.prisma.documentVerificationHistory.create({
      data: {
        verificationId,
        action: 'offer_letter_received_date_updated',
        performedBy: userId,
        performedByName: (await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || 'System',
        notes: `Offer letter received date updated to ${offerLetterReceivedAt}`,
      },
    });

    return updatedVerification;
  }

  /**
   * Verify an offer letter and move candidate to processing stage
   */
  async verifyOfferLetter(
    verifyDto: VerifyOfferLetterDto,
    userId: string,
  ): Promise<any> {
    const { documentId, candidateProjectMapId, notes } = verifyDto;

    // 1. Validate document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // 2. Validate candidateProjectMap exists
    const candidateProjectMap = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        candidate: true,
        project: true,
      },
    });
    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${candidateProjectMapId} not found`,
      );
    }

    // 3. Verify document belongs to candidate
    if (document.candidateId !== candidateProjectMap.candidateId) {
      throw new BadRequestException(
        'Document does not belong to this candidate',
      );
    }

    // 3.1. Verify document is an offer letter
    if (document.docType !== DOCUMENT_TYPE.OFFER_LETTER) {
      throw new BadRequestException('Document is not an offer letter');
    }

    // 4. Get statuses for update
    const [processingMain, processingInProgressSub] = await Promise.all([
      this.prisma.candidateProjectMainStatus.findUnique({
        where: { name: 'processing' },
      }),
      this.prisma.candidateProjectSubStatus.findUnique({
        where: { name: 'processing_in_progress' },
      }),
    ]);

    if (!processingMain || !processingInProgressSub) {
      throw new BadRequestException(
        'Processing status not found. Please seed the DB.',
      );
    }

    // 5. Get user details for history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // 6. Check if verification record exists
    const verification =
      await this.prisma.candidateProjectDocumentVerification.findUnique({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId,
            documentId,
          },
        },
      });

    // 7. Transaction to update everything
    const result = await this.prisma.$transaction(async (tx) => {
      // a. Update Document status
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: DOCUMENT_STATUS.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: userId,
        },
      });

      // b. Update/Create CandidateProjectDocumentVerification status
      let updatedVerification;
      if (verification) {
        updatedVerification =
          await tx.candidateProjectDocumentVerification.update({
            where: { id: verification.id },
            data: {
              status: DOCUMENT_STATUS.VERIFIED,
              notes: notes || 'Offer letter verified by processing user',
              isDeleted: false,
              deletedAt: null,
            } as any,
          });
      } else {
        updatedVerification =
          await tx.candidateProjectDocumentVerification.create({
            data: {
              candidateProjectMapId,
              documentId,
              status: DOCUMENT_STATUS.VERIFIED,
              notes: notes || 'Offer letter verified by processing user',
            },
          });
      }

      // c. Create DocumentVerificationHistory
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: updatedVerification.id,
          action: DOCUMENT_STATUS.VERIFIED,
          performedBy: userId,
          performedByName: user?.name || null,
          notes: notes || 'Offer letter verified',
        },
      });

      // d. Update CandidateProject status
      await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          mainStatusId: processingMain.id,
          subStatusId: processingInProgressSub.id,
        },
      });

      // e. Create CandidateProjectStatusHistory
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId,
          changedById: userId,
          changedByName: user?.name || null,
          mainStatusId: processingMain.id,
          subStatusId: processingInProgressSub.id,
          mainStatusSnapshot: processingMain.label,
          subStatusSnapshot: processingInProgressSub.label,
          reason: 'Offer letter verified, moved to processing',
          notes: `Offer letter verified. Candidate moved to processing stage. Step set to offer_letter.`,
        },
      });

      // f. Update ProcessingCandidate steps (mark offer_letter completed, advance HRD)
      const processingCandidate = await tx.processingCandidate.findFirst({
        where: {
          candidateId: candidateProjectMap.candidateId,
          projectId: candidateProjectMap.projectId,
          roleNeededId: candidateProjectMap.roleNeededId || undefined,
        },
      });

      if (processingCandidate) {
        // Mark offer_letter step as completed
        const offerStep = await tx.processingStep.findFirst({
          where: {
            processingCandidateId: processingCandidate.id,
            template: { key: 'offer_letter' },
          },
          include: { template: true },
        });

        if (offerStep) {
          await tx.processingStep.update({
            where: { id: offerStep.id },
            data: { status: 'completed', completedAt: new Date() },
          });

          // Create ProcessingStepDocument for the offer letter
          await tx.processingStepDocument.create({
            data: {
              processingStepId: offerStep.id,
              candidateProjectDocumentVerificationId: updatedVerification.id,
              uploadedBy: document.uploadedBy,
              status: 'verified',
              notes: 'Successfully verified offer letter.',
            },
          });

          await tx.processingHistory.create({
            data: {
              processingCandidateId: processingCandidate.id,
              status: 'completed',
              step: 'offer_letter_verified',
              changedById: userId,
              recruiterId: candidateProjectMap.recruiterId,
              notes: 'Offer letter verified and step completed.',
            },
          });

          // g. Mark processing candidate as in_progress (processing has officially started)
          await tx.processingCandidate.update({
            where: { id: processingCandidate.id },
            data: {
              processingStatus: 'in_progress',
              step: 'offer_letter_verified',
            },
          });
        }

        // Do NOT auto-start HRD step here. A step should only be set to `in_progress`
        // when a document that belongs to *that* step is verified. Offer letter
        // verification completes the 'offer_letter' step but should not start HRD.

        // (Note: other flows that verify HRD documents will set the HRD step to in_progress.)
      }

      return {
        success: true,
        message: 'Offer letter verified (processing step updated). HRD will only start when an HRD document is verified.',
        documentId,
        candidateProjectMapId,
      };
    });

    return result;
  }

  /**
   * Verification-history where clause for verified/rejected dashboard tiles.
   * Primary signal: candidate-project ever reached documents_verified / rejected_documents
   * in status history (set when documentation completes or rejects verification).
   * Fallback: current tile sub-status + matching document verifications (legacy rows).
   */
  private buildVerifiedRejectedListWhere(
    status: 'verified' | 'rejected' | 'both',
    countBase: Record<string, any>,
  ): Record<string, unknown> {
    const verificationStatuses =
      status === 'verified'
        ? ['verified']
        : status === 'rejected'
          ? ['rejected']
          : ['verified', 'rejected'];

    const historySubStatusNames =
      status === 'verified'
        ? ['documents_verified']
        : status === 'rejected'
          ? ['rejected_documents']
          : ['documents_verified', 'rejected_documents'];

    const currentSubStatusNames =
      status === 'verified'
        ? ['documents_verified', 'submitted_to_client']
        : status === 'rejected'
          ? ['rejected_documents']
          : ['documents_verified', 'submitted_to_client', 'rejected_documents'];

    return {
      ...countBase,
      OR: [
        {
          projectStatusHistory: {
            some: {
              subStatus: { name: { in: historySubStatusNames } },
            },
          },
        },
        {
          AND: [
            { subStatus: { name: { in: currentSubStatusNames } } },
            {
              documentVerifications: {
                some: {
                  status: { in: verificationStatuses },
                  isDeleted: false,
                },
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * Include clause for document verifications on verified/rejected history lists.
   * Surfaces current verified/rejected rows and replaced rows that were verified before.
   */
  private buildVerifiedRejectedVerificationIncludeWhere(
    statuses: string[],
  ): Record<string, unknown> {
    return {
      OR: [
        { status: { in: statuses }, isDeleted: false },
        {
          verificationHistory: {
            some: { action: { in: statuses } },
          },
        },
      ],
    };
  }

  /**
   * Dashboard tile counts for the documentation verification page.
   * Pending/client-revision use subStatus; verified/rejected use verification history.
   */
  private async getDocumentVerificationTileCounts(countBase: Record<string, any>) {
    const tileStatusNames = [
      'verification_in_progress_document',
      'screening_passed',
      'client_revision_requested',
    ];

    const statusRecords = await this.prisma.candidateProjectSubStatus.findMany({
      where: { name: { in: tileStatusNames } },
      select: { id: true, name: true },
    });

    const idByName = Object.fromEntries(statusRecords.map((record) => [record.name, record.id]));

    const countForStatusNames = (names: string[]) => {
      const ids = names.map((name) => idByName[name]).filter(Boolean);
      if (ids.length === 0) {
        return Promise.resolve(0);
      }
      return this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          subStatusId: { in: ids },
        },
      });
    };

    const [pending, verified, rejected, clientRevisionRequested] = await Promise.all([
      countForStatusNames(['verification_in_progress_document', 'screening_passed']),
      this.prisma.candidateProjects.count({
        where: this.buildVerifiedRejectedListWhere('verified', countBase) as any,
      }),
      this.prisma.candidateProjects.count({
        where: this.buildVerifiedRejectedListWhere('rejected', countBase) as any,
      }),
      countForStatusNames(['client_revision_requested']),
    ]);

    return {
      pending,
      verified,
      rejected,
      client_revision_requested: clientRevisionRequested,
      verification_in_progress_document: pending,
    };
  }

  /**
   * Candidate-project IDs that entered client revision at least once (status history).
   */
  private async getClientRevisionHistorySet(
    candidateProjectMapIds: string[],
  ): Promise<Set<string>> {
    if (!candidateProjectMapIds.length) {
      return new Set();
    }

    const rows = await this.prisma.candidateProjectStatusHistory.findMany({
      where: {
        candidateProjectMapId: { in: candidateProjectMapIds },
        subStatus: { name: 'client_revision_requested' },
      },
      select: { candidateProjectMapId: true },
      distinct: ['candidateProjectMapId'],
    });

    return new Set(rows.map((row) => row.candidateProjectMapId));
  }

  /**
   * Get candidates for document verification
   * Returns candidates who are in document verification stages
   */
  async getVerificationCandidates(query: any) {
    const {
      page = 1,
      limit = 20,
      search,
      recruiterId,
      projectId,
      roleCatalogId,
      screening,
      status,
    } = query;
    const skip = (page - 1) * limit;

    // ------------------------------------------------------
    // 🔥 1. Allowed statuses for this endpoint
    // ------------------------------------------------------
    const allowedStatuses = [
      'verification_in_progress_document',
      'screening_passed',
      'client_revision_requested',
    ];

    // Base inclusion: document verification progress plus screening passed
    const defaultStatuses = ['verification_in_progress_document', 'screening_passed'];
    const statusParam = status ? String(status).trim() : '';

    // When viewing the client-revision tile, query only that sub-status
    const selectedStatusNames =
      statusParam === 'client_revision_requested'
        ? ['client_revision_requested']
        : Array.from(
            new Set([
              ...defaultStatuses,
              ...statusParam
                .split(',')
                .map((s) => s.trim())
                .filter((s) => allowedStatuses.includes(s)),
            ]),
          );

    const subStatuses = await this.prisma.candidateProjectSubStatus.findMany({
      where: { name: { in: selectedStatusNames } },
    });

    if (!subStatuses || subStatuses.length === 0) {
      throw new Error(
        `Missing candidate project sub-status for: ${selectedStatusNames.join(', ')}`,
      );
    }

    const subStatusIds = subStatuses.map((statusRecord) => statusRecord.id);

    const where: any = {
      subStatusId: { in: subStatusIds },
      // Optional filter to restrict results to a specific recruiter
      ...(recruiterId ? { recruiterId } : {}),
    };


    // Optional project and role (project role catalog) filters
    if (projectId) {
      where.projectId = projectId;
    }
    if (roleCatalogId) {
      // roleCatalog is linked via roleNeeded on candidateProjects
      where.roleNeeded = { roleCatalogId };
    }

    // Filter by screening (only show candidates with screening data)
    if (screening === 'true' || screening === true) {
      where.screenings = { some: { decision: 'approved' } };
    }

    // 🔍 Search support
    if (search) {
      where.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { candidate: { candidateCode: { contains: search, mode: 'insensitive' } } },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // ------------------------------------------------------
    // 🔥 3. Fetch list + total
    // ------------------------------------------------------
    const [candidateProjects, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              candidateCode: true,
              email: true,
              mobileNumber: true,
              countryCode: true,
              profileImage: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              introductionVideoRequired: true,
              client: { select: { name: true } },
              documentRequirements: {
                where: { isDeleted: false } as any,
                select: { docType: true },
              },
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              roleCatalog: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                },
              },
            },
          },
          recruiter: { select: { id: true, name: true, email: true } },
          mainStatus: { select: { label: true } },
          subStatus: { select: { name: true, label: true } },
          screenings: {
            select: {
              id: true,
              status: true,
              decision: true,
              overallRating: true,
              scheduledTime: true,
              conductedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },

          documentVerifications: {
            include: {
              document: {
                select: {
                  id: true,
                  docType: true,
                  fileName: true,
                  status: true,
                  uploadedBy: true,
                  createdAt: true,
                  roleCatalog: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: Number(limit),
      }),

      this.prisma.candidateProjects.count({ where }),
    ]);

    // ------------------------------------------------------
    // 🔥 4. ADD THE 3 COUNTS (no change to structure)
    // ------------------------------------------------------

    // Make counts respect the optional recruiter/project/role filters so that
    // results reflect the scope requested by the client. Also apply the
    // `screening` filter to the counts when requested so counts match items.
    const countBase: any = {};
    if (recruiterId) countBase.recruiterId = recruiterId;
    if (projectId) countBase.projectId = projectId;
    if (roleCatalogId) countBase.roleNeeded = { roleCatalogId };

    // Apply screening filter to counts when requested
    if (screening === 'true' || screening === true) {
      countBase.screenings = { some: { decision: 'approved' } };
    }

    const tileCounts = await this.getDocumentVerificationTileCounts(countBase);

    // ------------------------------------------------------
    // 🔥 5. Return SAME old structure + counts added (screenings -> latest screening object)
    // ------------------------------------------------------
    const candidateProjectsWithLatestScreening = candidateProjects.map((cp: any) => {
      const latest = Array.isArray(cp.screenings) && cp.screenings.length > 0 ? cp.screenings[0] : null;
      const { screenings, ...rest } = cp as any;
      return {
        ...rest,
        screening: latest,
      };
    });

    // Attach latest `sendToClient` (DocumentForwardHistory) per candidate-project-role
    const itemsWithSendToClient = await Promise.all(
      candidateProjectsWithLatestScreening.map(async (cp: any) => {
        const candidateId = cp.candidate?.id;
        const projectId = cp.project?.id;
        const roleCatalogId = cp.roleNeeded?.roleCatalog?.id || null;

        const latestForward = await this.prisma.documentForwardHistory.findFirst({
          where: {
            candidateId,
            projectId,
            roleCatalogId: roleCatalogId || null,
          },
          orderBy: { sentAt: 'desc' },
        });

        return {
          ...cp,
          sendToClient: latestForward ?? null,
          documentSummary: this.computeDocumentSummaryForCandidateProject(cp),
        };
      }),
    );

    return {
      items: itemsWithSendToClient,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: tileCounts,
    };
  }



  // ==================== ENHANCED DOCUMENT VERIFICATION ====================

  /**
   * Get all projects where a candidate is nominated for document verification
   */
  async getCandidateProjects(candidateId: string): Promise<any[]> {
    const candidateProjects = await this.prisma.candidateProjects.findMany({
      where: {
        candidateId,
        // 🔥 New status filtering using main/sub status instead of old statusName
        mainStatus: {
          name: "documents" // Main stage: DOCUMENTS
        },
        subStatus: {
          name: {
            in: [
              "verification_in_progress_document",
              "documents_verified",
              "submitted_to_client",
              "rejected_documents",
              "pending_documents",
              "client_revision_requested",
            ],
          },
        },
      },

      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            highestEducation: true,
          },
        },

        project: {
          select: {
            id: true,
            title: true,
            deadline: true,
            createdAt: true,
            countryCode: true,
          },
        },

        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        roleNeeded: {
          select: {
            id: true,
            designation: true,
            roleCatalog: {
              select: {
                id: true,
                name: true,
                label: true,
              },
            },
          },
        },

        // 🔥 NEW: include main + sub status (non-breaking)
        mainStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
            icon: true,
            order: true,
          },
        },
        subStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
            icon: true,
            order: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return candidateProjects;
  }

  /**
   * Get project document requirements and verification status for a candidate
   */

  async getCandidateProjectRequirements(
    candidateId: string,
    projectId: string,
    options?: { includeFileUrls?: boolean },
  ): Promise<CandidateProjectRequirementsResult> {
    const includeFileUrls = options?.includeFileUrls ?? false;
    const candidateProject = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
      },
      select: {
        id: true,
        project: {
          select: {
            introductionVideoRequired: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        roleNeeded: {
          select: {
            id: true,
            designation: true,
            roleCatalogId: true,
            roleCatalog: {
              select: {
                id: true,
                name: true,
                label: true,
              },
            },
          },
        },
        mainStatus: { select: { name: true, label: true } },
        subStatus: { select: { name: true, label: true } },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate project mapping not found');
    }

    const introductionVideoRequired =
      candidateProject.project.introductionVideoRequired;

    const [
      requirements,
      allVerifications,
      uploadRequests,
      isSendedForDocumentVerification,
      documentationReview,
    ] = await Promise.all([
      this.prisma.documentRequirement.findMany({
        where: { projectId, isDeleted: false } as any,
        select: {
          id: true,
          docType: true,
          mandatory: true,
          description: true,
          isAutomatic: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.candidateProjectDocumentVerification.findMany({
        where: {
          candidateProjectMapId: candidateProject.id,
          isDeleted: false,
          isUploadedByProcessingTeam: false,
        } as any,
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          candidateProjectMapId: true,
          resubmissionRequested: true,
          document: {
            select: {
              id: true,
              docType: true,
              docName: true,
              fileName: true,
              fileUrl: true,
              mimeType: true,
              documentNumber: true,
              issuedAt: true,
              expiryDate: true,
              createdAt: true,
            },
          },
        },
      }),
      this.getUploadRequestsForCandidateProject(candidateProject.id),
      this.hasBeenSentForDocumentVerification(candidateProject.id),
      this.resolveDocumentationReviewState(candidateProject),
    ]);

    const enrichedVerifications = this.selectLatestVerificationsPerDocType(
      allVerifications,
    ).map((v) => ({
      ...v,
      document: this.mapRequirementsVerificationDocument(
        v.document as Record<string, unknown>,
        includeFileUrls,
      ),
    })) as CandidateProjectRequirementsResult['verifications'];

    const summaryCounts = this.computeVerificationSummary(
      requirements.length,
      introductionVideoRequired,
      enrichedVerifications,
    );
    const {
      totalRequired,
      totalSubmitted,
      totalVerified,
      totalRejected,
      totalPending,
      allDocumentsVerified,
      introductionVideo,
    } = summaryCounts;

    const verifications = enrichedVerifications.filter(
      (v) => v.document.docType !== DOCUMENT_TYPE.INTRODUCTION_VIDEO,
    );

    const introductionVideoRow = introductionVideo
      ? ({
          ...introductionVideo,
          document: this.mapRequirementsVerificationDocument(
            introductionVideo.document as unknown as Record<string, unknown>,
            includeFileUrls,
          ),
        } as CandidateProjectRequirementsResult['introductionVideo'])
      : null;

    const {
      isDocumentationReviewed,
      documentationStatus,
      documentationStatusCode,
    } = documentationReview;

    const submittedDocTypes = new Set(
      verifications.map((v) => v.document.docType as string),
    );

    return {
      candidateProject,
      introductionVideoRequired,
      introductionVideo: introductionVideoRow,
      requirements: requirements.map((r) => {
        const enriched = this.enrichProjectRequirementRow(
          r as Record<string, unknown> & { docType: string },
        );
        if (submittedDocTypes.has(r.docType)) {
          return enriched;
        }
        const pendingRequest = uploadRequests.get(r.docType);
        if (!pendingRequest) {
          return enriched;
        }
        return {
          ...enriched,
          uploadRequested: true,
          uploadRequestReason: pendingRequest.reason,
          uploadRequestedAt: pendingRequest.requestedAt,
        };
      }) as CandidateProjectRequirementsResult['requirements'],
      verifications,
      summary: {
        candidateProjectMapId: candidateProject.id,
        totalRequired,
        totalSubmitted,
        totalVerified,
        totalRejected,
        totalPending,
        allDocumentsVerified,
        canApproveCandidate: allDocumentsVerified,
        isSendedForDocumentVerification,
        isDocumentationReviewed,
        documentationStatus,
        documentationStatusCode,
      },
    };
  }

  /**
   * Get document verifications and documents for a candidate-project-role
   */
  async getCandidateProjectVerificationsByRole(
    candidateId: string,
    projectId: string,
    roleCatalogId: string,
    options?: { page?: number; limit?: number; search?: string; status?: string },
  ): Promise<any> {
    const { page = 1, limit = 20, search, status = 'all' } = options || {};
    const skip = (page - 1) * limit;

    // Find the roleNeeded entry for this project and roleCatalog
    const roleNeeded = await this.prisma.roleNeeded.findFirst({
      where: {
        projectId,
        roleCatalogId,
      },
      include: {
        roleCatalog: true,
      },
    });

    if (!roleNeeded) {
      throw new NotFoundException(
        `No role matching catalog ID ${roleCatalogId} found for project ${projectId}`,
      );
    }

    const candidateProjectInclude = {
      project: true,
      candidate: true,
      roleNeeded: { include: { roleCatalog: true } },
    } as const;

    // Find the candidate-project mapping for this roleNeeded
    let candidateProject = await this.prisma.candidateProjects.findUnique({
      where: {
        candidateId_projectId_roleNeededId: {
          candidateId,
          projectId,
          roleNeededId: roleNeeded.id,
        },
      },
      include: candidateProjectInclude,
    });

    if (!candidateProject) {
      candidateProject = await this.prisma.candidateProjects.findFirst({
        where: { candidateId, projectId },
        include: candidateProjectInclude,
      });

      if (candidateProject) {
        this.logger.warn(
          `Verifications lookup: role-specific nomination not found for candidate=${candidateId} project=${projectId} roleCatalog=${roleCatalogId}; using project-level nomination ${candidateProject.id}`,
        );
      }
    }

    if (!candidateProject) {
      throw new NotFoundException(
        'Candidate is not nominated for this role in the specified project',
      );
    }

    // Build where clause for verifications (fetch all, dedupe latest per docType, then paginate)
    const where: any = {
      candidateProjectMapId: candidateProject.id,
      isDeleted: false,
      isReuploaded: false,
      isUploadedByProcessingTeam: false,
    };

    if (search) {
      where.AND = [
        {
          document: {
            OR: [
              { fileName: { contains: search, mode: 'insensitive' } },
              { docType: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const allVerifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: where as any,
        include: {
          document: {
            include: {
              roleCatalog: true,
            },
          },
          roleCatalog: true,
        },
        orderBy: { createdAt: 'desc' },
      });

    let verifications = this.selectLatestVerificationsPerDocType(allVerifications).filter(
      (verification) => verification.document.candidateId === candidateProject.candidateId,
    );

    if (status && status !== 'all') {
      verifications = verifications.filter((verification) => verification.status === status);
    }

    const total = verifications.length;
    const paginatedVerifications = verifications.slice(skip, skip + Number(limit));

    const totalSubmitted = verifications.length;
    const totalVerified = verifications.filter((v) => v.status === DOCUMENT_STATUS.VERIFIED).length;
    const totalRejected = verifications.filter((v) => v.status === DOCUMENT_STATUS.REJECTED).length;
    const totalPending = verifications.filter((v) => v.status === DOCUMENT_STATUS.PENDING).length;

    return {
      candidateProject,
      verifications: paginatedVerifications,
      pagination: {
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalSubmitted,
        totalVerified,
        totalRejected,
        totalPending,
      },
    };
  }


  /**
   * Reuse an existing document for a new project
   */
  async reuseDocument(
    documentId: string,
    projectId: string,
    roleCatalogId: string | undefined,
    userId: string,
  ): Promise<any> {
    // Check if document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get candidate project mapping
    const candidateProject = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId: document.candidateId,
        projectId,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate not found in project');
    }

    // Check if document is already linked to this project
    const existingVerification =
      await this.prisma.candidateProjectDocumentVerification.findFirst({
        where: {
          candidateProjectMapId: candidateProject.id,
          documentId,
          roleCatalogId,
        },
      });

    if (existingVerification) {
      throw new BadRequestException('Document already linked to this project and role');
    }

    // Create document verification record
    const verification =
      await this.prisma.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId: candidateProject.id,
          documentId,
          roleCatalogId,
          status: 'pending',
        },
      });

    await this.publishDocumentVerificationSync({
      candidateId: document.candidateId,
      projectId,
      message: 'Document linked successfully',
    });

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: document.candidateId },
      select: { firstName: true, lastName: true },
    });

    await this.notifyDocumentationTeamOfMissingDocumentUpload({
      candidateProjectMapId: candidateProject.id,
      candidateId: document.candidateId,
      projectId,
      projectTitle: project.title,
      candidateFirstName: candidate?.firstName ?? '',
      candidateLastName: candidate?.lastName ?? '',
      docType: document.docType,
      fileName: document.fileName,
      documentId: document.id,
      uploadedByUserId: userId,
      recruiterId: candidateProject.recruiterId,
    });

    if (candidateProject.recruiterId) {
      await this.notifyRecruiterOfDocumentationMissingDocumentUpload({
        candidateProjectMapId: candidateProject.id,
        candidateId: document.candidateId,
        projectId,
        projectTitle: project.title,
        candidateFirstName: candidate?.firstName ?? '',
        candidateLastName: candidate?.lastName ?? '',
        docType: document.docType,
        fileName: document.fileName,
        documentId: document.id,
        uploadedByUserId: userId,
        recruiterId: candidateProject.recruiterId,
      });
    }

    return verification;
  }

  /**
   * Complete document verification for a candidate-project
   */

  async completeVerification(
    candidateProjectMapId: string,
    userId: string,
  ): Promise<any> {
    // 1. Find candidate project mapping
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: { project: true },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate project mapping not found');
    }

    // 2. Get required documents
    const requirements = await this.prisma.documentRequirement.findMany({
      where: {
        projectId: candidateProject.projectId,
        isDeleted: false,
      } as any,
    });

    // 3. Get verification records
    const allVerifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: { candidateProjectMapId, isDeleted: false } as any,
        include: { document: true },
      });

    const latestVerificationsMap = new Map<string, (typeof allVerifications)[number]>();
    for (const v of allVerifications) {
      const type = v.document.docType;
      if (
        !latestVerificationsMap.has(type) ||
        new Date(v.document.createdAt) >
          new Date(latestVerificationsMap.get(type)!.document.createdAt)
      ) {
        latestVerificationsMap.set(type, v);
      }
    }
    const verifications = Array.from(latestVerificationsMap.values());

    const { totalRequired, totalVerified } = this.computeVerificationSummary(
      requirements.length,
      candidateProject.project.introductionVideoRequired,
      verifications,
    );

    if (totalVerified < totalRequired) {
      throw new BadRequestException('Not all required documents are verified');
    }

    // 4. Fetch NEW MAIN STATUS: "documents"
    const mainStatus = await this.prisma.candidateProjectMainStatus.findFirst({
      where: { name: 'documents' },
    });

    if (!mainStatus) {
      throw new NotFoundException('Main status "documents" not found');
    }

    // 5. Fetch NEW SUB STATUS: "documents_verified"
    const subStatus = await this.prisma.candidateProjectSubStatus.findFirst({
      where: { name: 'documents_verified' },
    });

    if (!subStatus) {
      throw new NotFoundException('Sub status "documents_verified" not found');
    }

    // 6. Update main + sub statuses
    const updated = await this.prisma.candidateProjects.update({
      where: { id: candidateProjectMapId },
      data: {
        mainStatusId: mainStatus.id,
        subStatusId: subStatus.id,
        updatedAt: new Date(),
      },
    });

    // 7. Add history entry
    await this.prisma.candidateProjectStatusHistory.create({
      data: {
        candidateProjectMapId,
        changedById: userId,
        mainStatusId: mainStatus.id,
        subStatusId: subStatus.id,
        mainStatusSnapshot: mainStatus.label,
        subStatusSnapshot: subStatus.label,
        reason: 'Document verification completed',
      },
    });

    if (!updated.recruiterId) {
      throw new BadRequestException('Recruiter ID is missing for this candidate project');
    }
    // 8. Publish event to notify recruiter
    await this.outboxService.publishCandidateDocumentsVerified(
      candidateProjectMapId,
      updated.recruiterId,
    );

    // 9. Notify for real-time update
    try {
      await this.outboxService.publishDataSync({
        userId: updated.recruiterId,
        type: 'RecruiterDocuments',
        id: 'LIST',
        message: 'Document verification completed',
      });
    } catch (err) {
      this.logger.error(`Failed to publish data sync event for verification completion: ${err.message}`);
    }

    return updated;
  }


  /**
 * Reject document verification for a candidate-project
 */
  async rejectVerification(
    candidateProjectMapId: string,
    userId: string,
    reason?: string,
  ): Promise<any> {
    // 1. Ensure candidateProject exists
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate project mapping not found');
    }

    // 2. Fetch MAIN STATUS: documents
    const mainStatus = await this.prisma.candidateProjectMainStatus.findFirst({
      where: { name: 'documents' },
    });

    if (!mainStatus) {
      throw new NotFoundException('Main status "documents" not found');
    }

    // 3. Fetch SUB STATUS: rejected_documents
    const subStatus = await this.prisma.candidateProjectSubStatus.findFirst({
      where: { name: 'rejected_documents' },
    });

    if (!subStatus) {
      throw new NotFoundException('Sub status "rejected_documents" not found');
    }

    // 4. Update candidate project with new status
    const updated = await this.prisma.candidateProjects.update({
      where: { id: candidateProjectMapId },
      data: {
        mainStatusId: mainStatus.id,
        subStatusId: subStatus.id,
        updatedAt: new Date(),
      },
    });

    // 5. Add status history entry
    await this.prisma.candidateProjectStatusHistory.create({
      data: {
        candidateProjectMapId,
        changedById: userId,
        mainStatusId: mainStatus.id,
        subStatusId: subStatus.id,
        mainStatusSnapshot: mainStatus.label,
        subStatusSnapshot: subStatus.label,
        reason: reason || 'Document verification rejected',
      },
    });

    if (!updated.recruiterId) {
      throw new BadRequestException('Recruiter ID is missing for this candidate project');
    }
    // 8. Publish event to notify recruiter
    await this.outboxService.publishCandidateDocumentsRejected(
      candidateProjectMapId,
      updated.recruiterId,
    );

    // 9. Notify for real-time update
    try {
      await this.outboxService.publishDataSync({
        userId: updated.recruiterId,
        type: 'RecruiterDocuments',
        id: 'LIST',
        message: 'Document verification rejected',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to publish data sync event for verification rejection: ${message}`);
    }

    return updated;
  }


  // Verified and Rejected list API
  async getVerifiedOrRejectedList() {
    return this.prisma.candidateProjects.findMany({
      where: {
        documentVerifications: {
          some: {
            status: { in: ['verified', 'rejected'] }, // include both statuses
            isDeleted: false,
          } as any,
        },
      },
      orderBy: { createdAt: 'desc' },

      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            title: true,
          },
        },
        recruiter: {
          select: {
            name: true,
          },
        },
        documentVerifications: {
          where: {
            status: { in: ['verified', 'rejected'] }, // include both statuses here also
            isDeleted: false,
          } as any,
          include: {
            document: {
              select: {
                fileName: true,
                fileUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get paginated list of document verifications filtered by verified/rejected
   * Supports search, optional recruiterId filter, pagination and returns counts
   */
  async getVerifiedRejectedDocuments(query: any) {
    // Default changed to 'verified' (previously 'both') — pass status='both' to include both
    const { page = 1, limit = 20, search, status = 'verified', recruiterId, projectId, roleCatalogId, screening } = query as any;
    const skip = (page - 1) * limit;

    const listStatus: 'verified' | 'rejected' | 'both' =
      status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'both';

    const statuses =
      listStatus === 'verified'
        ? ['verified']
        : listStatus === 'rejected'
          ? ['rejected']
          : ['verified', 'rejected'];

    const countBase: any = {};
    if (recruiterId) countBase.recruiterId = recruiterId;
    if (projectId) countBase.projectId = projectId;
    if (roleCatalogId) countBase.roleNeeded = { roleCatalogId };

    // Apply screening filter to counts when requested so counts align with the
    // paginated `candidateProjects` result (screening === 'true').
    if (screening === 'true' || screening === true) {
      countBase.screenings = { some: { decision: 'approved' } };
    }

    const cpWhere: any = this.buildVerifiedRejectedListWhere(listStatus, countBase);

    // Search across candidate name, project title and document file name
    if (search) {
      cpWhere.AND = [
        {
          OR: [
            { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
            { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
            { candidate: { candidateCode: { contains: search, mode: 'insensitive' } } },
            { project: { title: { contains: search, mode: 'insensitive' } } },
            { documentVerifications: { some: { document: { fileName: { contains: search, mode: 'insensitive' } } } } },
          ],
        },
      ];
    }

    const tileCounts = await this.getDocumentVerificationTileCounts(countBase);

    const [candidateProjects, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where: cpWhere,
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, candidateCode: true, email: true, mobileNumber: true, profileImage: true },
          },
          project: {
            select: {
              id: true,
              title: true,
              client: { select: { name: true, email: true, phone: true } },
              documentRequirements: { where: { isDeleted: false } as any },
            },
          },
          recruiter: { select: { id: true, name: true } },
          mainStatus: { select: { label: true } },
          subStatus: { select: { name: true, label: true } },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              roleCatalog: { select: { id: true, name: true, label: true } },
            },
          },
          screenings: {
            select: {
              id: true,
              status: true,
              decision: true,
              overallRating: true,
              scheduledTime: true,
              conductedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          documentVerifications: {
            where: this.buildVerifiedRejectedVerificationIncludeWhere(statuses) as any,
            include: {
              document: {
                select: {
                  id: true,
                  docType: true,
                  fileName: true,
                  fileUrl: true,
                  status: true,
                  createdAt: true,
                  roleCatalog: true,
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit),
      }),

      this.prisma.candidateProjects.count({ where: cpWhere }),
    ] as any);

    // Map to response items (one per candidate-project) — return latest screening as `screening`
    const items = candidateProjects.map((cp: any) => {
      const totalDocsToUpload = cp.project?.documentRequirements?.length || 0;
      const docsUploaded = cp.documentVerifications?.length || 0;
      const docsPercentage = totalDocsToUpload > 0 ? Math.round((docsUploaded / totalDocsToUpload) * 100) : 0;

      const latestScreening = Array.isArray(cp.screenings) && cp.screenings.length > 0 ? cp.screenings[0] : null;

      return {
        candidateProjectMapId: cp.id,
        createdAt: cp.createdAt,
        candidate: cp.candidate,
        project: cp.project,
        roleNeeded: cp.roleNeeded,
        recruiter: cp.recruiter,
        mainStatus: cp.mainStatus,
        subStatus: cp.subStatus,
        documentVerifications: cp.documentVerifications,
        screening: latestScreening,
        progress: {
          docsUploaded,
          totalDocsToUpload,
          docsPercentage,
        },
      };
    });

    // Determine `isInInterview` for candidate-projects by checking status history (batched)
    const cpIds = items.map((it: any) => it.candidateProjectMapId).filter(Boolean);
    const interviewSubStatuses = [
      'interview_assigned',
      'interview_scheduled',
      'interview_rescheduled',
      'interview_completed',
      'interview_passed',
      'interview_failed',
    ];

    const interviewHistories = cpIds.length
      ? await this.prisma.candidateProjectStatusHistory.findMany({
          where: {
            candidateProjectMapId: { in: cpIds },
            subStatus: { name: { in: interviewSubStatuses } },
          },
          select: { candidateProjectMapId: true },
        })
      : [];

    const inInterviewSet = new Set(interviewHistories.map((h) => h.candidateProjectMapId));
    const clientRevisionSet = await this.getClientRevisionHistorySet(cpIds);

    // Attach latest `sendToClient` (DocumentForwardHistory) per candidate-project-role and the `isInInterview` flag
    const itemsWithSendToClient = await Promise.all(
      items.map(async (it) => {
        const candidateId = it.candidate?.id;
        const projectId = it.project?.id;
        const roleCatalogId = it.roleNeeded?.roleCatalog?.id || null;

        const latestForward = await this.prisma.documentForwardHistory.findFirst({
          where: {
            candidateId,
            projectId,
            roleCatalogId: roleCatalogId || null,
          },
          orderBy: { sentAt: 'desc' },
        });

        const awaitingResubmitToClient =
          clientRevisionSet.has(it.candidateProjectMapId) &&
          it.subStatus?.name === 'documents_verified';

        return {
          ...it,
          sendToClient: latestForward ?? null,
          isInInterview: Boolean(inInterviewSet.has(it.candidateProjectMapId)),
          awaitingResubmitToClient,
        };
      }),
    );

    return {
      items: itemsWithSendToClient,
      pagination: {
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: tileCounts,
    };
  }

  /**
   * Get pending documents for candidates assigned to a specific recruiter
   * Includes project details and document upload progress
   */
  async getRecruiterPendingDocuments(query: any) {
    const {
      page = 1,
      limit = 20,
      search,
      recruiterId,
      status,
      projectId,
      roleCatalogId,
    } = query;

    if (!recruiterId) {
      throw new BadRequestException('Recruiter ID is required');
    }

    if (status === 'mandatory_documents') {
      return this.getRecruiterMandatoryDocuments({
        page,
        limit,
        search,
        recruiterId,
        projectId,
        roleCatalogId,
      });
    }

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const { nominatedWhereBase, pendingDocumentsWhereBase, inScreeningWhereBase } =
      this.buildRecruiterPendingWhereBases(recruiterId, projectId, roleCatalogId);

    let statusCondition: any = pendingDocumentsWhereBase;
    if (status === 'InScreening') {
      statusCondition = inScreeningWhereBase;
    } else if (status === 'nominated') {
      statusCondition = nominatedWhereBase;
    } else if (status === 'pending_documents') {
      statusCondition = pendingDocumentsWhereBase;
    }

    const where: any = { ...statusCondition };

    if (search) {
      const searchOR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { candidate: { candidateCode: { contains: search, mode: 'insensitive' } } },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        const statusOR = where.OR;
        delete where.OR;
        where.AND = [{ OR: statusOR }, { OR: searchOR }];
      } else {
        where.AND = [{ ...statusCondition }, { OR: searchOR }];
      }
    }

    // Fetch candidate projects with requirements and verifications
    const [candidateProjects, total, dashboardCounts] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              candidateCode: true,
              email: true,
              mobileNumber: true,
              countryCode: true,
              profileImage: true,
            },
          },
          project: {
            include: {
              documentRequirements: {
                where: { isDeleted: false } as any,
              },
              client: { select: { name: true } },
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              roleCatalog: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                },
              },
            },
          },
          documentVerifications: {
            where: { isDeleted: false } as any,
            include: {
              document: {
                select: {
                  id: true,
                  docType: true,
                  fileName: true,
                  fileUrl: true,
                  status: true,
                  createdAt: true,
                },
              },
              verificationHistory: {
                orderBy: { performedAt: 'desc' },
                take: 1,
              },
            },
          },
          projectStatusHistory: {
            orderBy: { statusChangedAt: 'desc' },
            take: 1,
            include: {
              changedBy: {
                select: { name: true },
              },
            },
          },
          subStatus: true,
          mainStatus: true,
          recruiter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      this.prisma.candidateProjects.count({ where }),
      this.getRecruiterDocumentDashboardCounts(recruiterId, projectId, roleCatalogId),
    ]);

    // Calculate progress for each candidate project
    const items = candidateProjects.map((cp) => {
      const totalDocsToUpload = cp.project.documentRequirements.length;

      // Count unique required docTypes that have at least one upload
      const requiredDocTypes = cp.project.documentRequirements.map(r => r.docType);
      const uploadedDocTypes = new Set(cp.documentVerifications.map(dv => dv.document.docType));
      const docsUploaded = requiredDocTypes.filter(type => uploadedDocTypes.has(type)).length;

      const docsPercentage =
        totalDocsToUpload > 0
          ? Math.min(100, Math.round((docsUploaded / totalDocsToUpload) * 100))
          : 0;

      const introVideoRequired = cp.project.introductionVideoRequired === true;
      const checklistRequiredCount =
        totalDocsToUpload + (introVideoRequired ? 1 : 0);
      const documentChecklist = this.buildRecruiterProjectDocumentChecklist(cp);
      const checklistUploadedCount = documentChecklist.rows.filter(
        (r) => r.isUploaded,
      ).length;

      return {
        candidateProjectMapId: cp.id,
        candidate: cp.candidate,
        project: {
          id: cp.project.id,
          title: cp.project.title,
          countryCode: cp.project.countryCode,
          client: cp.project.client,
          role: cp.roleNeeded
            ? {
              id: cp.roleNeeded.id,
              designation: cp.roleNeeded.designation,
              roleCatalog: cp.roleNeeded.roleCatalog,
            }
            : null,
        },
        recruiter: cp.recruiter,
        documentDetails: cp.documentVerifications.map((dv) => ({
          id: dv.id,
          documentId: dv.documentId,
          docType: dv.document.docType,
          status: dv.status,
          fileName: dv.document.fileName,
          fileUrl: dv.document.fileUrl,
          uploadedAt: dv.document.createdAt,
          lastHistory: dv.verificationHistory[0] || null,
        })),
        progress: {
          docsUploaded: checklistUploadedCount || docsUploaded,
          totalDocsToUpload: checklistRequiredCount || totalDocsToUpload,
          docsPercentage:
            checklistRequiredCount > 0
              ? Math.min(
                  100,
                  Math.round(
                    (checklistUploadedCount / checklistRequiredCount) * 100,
                  ),
                )
              : docsPercentage,
        },
        documentChecklist,
        lastAction: cp.projectStatusHistory[0]
          ? {
            status: cp.projectStatusHistory[0].subStatusSnapshot,
            performedBy: cp.projectStatusHistory[0].changedBy?.name,
            at: cp.projectStatusHistory[0].statusChangedAt,
            reason: cp.projectStatusHistory[0].reason,
          }
          : null,
        status: {
          main: cp.mainStatus?.name || null,
          mainLabel: cp.mainStatus?.label || null,
          sub: cp.subStatus?.name || null,
          subLabel: cp.subStatus?.label || null,
        },
      };
    });

    return {
      items,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: limitNumber > 0 ? Math.ceil(total / limitNumber) : 1,
      },
      counts: dashboardCounts,
    };
  }

  private async countRecruiterMandatoryDocuments(
    recruiterId: string,
    projectId?: string,
    roleCatalogId?: string,
  ): Promise<number> {
    const candidateIds = await this.getRecruiterMandatoryCandidateIds(
      recruiterId,
      projectId,
      roleCatalogId,
    );
    return candidateIds.length;
  }

  /** All active recruiter assignments (not limited to nominated project rows). */
  private async getMandatoryCandidateIdsFromRecruiterAssignments(
    recruiterId: string,
    search?: string,
  ): Promise<string[]> {
    const assignmentWhere: Record<string, unknown> = {
      recruiterId,
      isActive: true,
    };

    if (search) {
      assignmentWhere.candidate = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { candidateCode: { contains: search, mode: 'insensitive' } },
          {
            projects: {
              some: {
                recruiterId,
                project: { title: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        ],
      };
    }

    const assignments = await this.prisma.candidateRecruiterAssignment.findMany({
      where: assignmentWhere as any,
      select: { candidateId: true, assignedAt: true },
      orderBy: { assignedAt: 'desc' },
    });

    const latestByCandidate = new Map<string, Date>();
    for (const row of assignments) {
      if (!latestByCandidate.has(row.candidateId)) {
        latestByCandidate.set(row.candidateId, row.assignedAt);
      }
    }

    return [...latestByCandidate.keys()];
  }

  /** Project-scoped mandatory list (when project / role filters are applied). */
  private async getMandatoryCandidateIdsFromProjects(
    recruiterId: string,
    projectId?: string,
    roleCatalogId?: string,
    search?: string,
  ): Promise<string[]> {
    const where: Record<string, unknown> = { recruiterId };
    if (projectId) where.projectId = projectId;
    if (roleCatalogId) {
      where.roleNeeded = { roleCatalogId };
    }
    if (search) {
      where.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { candidate: { candidateCode: { contains: search, mode: 'insensitive' } } },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const assignments = await this.prisma.candidateProjects.findMany({
      where: where as any,
      select: { candidateId: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    const latestByCandidate = new Map<string, Date>();
    for (const row of assignments) {
      if (!latestByCandidate.has(row.candidateId)) {
        latestByCandidate.set(row.candidateId, row.updatedAt);
      }
    }

    return [...latestByCandidate.keys()];
  }

  private async filterCandidatesMissingMandatoryDocuments(
    candidateIds: string[],
  ): Promise<string[]> {
    if (candidateIds.length === 0) return [];

    const documents = await this.prisma.document.findMany({
      where: { candidateId: { in: candidateIds }, isDeleted: false } as any,
      select: { candidateId: true, docType: true },
    });

    const docsByCandidate = new Map<string, Array<{ docType: string }>>();
    for (const doc of documents) {
      const list = docsByCandidate.get(doc.candidateId) ?? [];
      list.push({ docType: doc.docType });
      docsByCandidate.set(doc.candidateId, list);
    }

    return candidateIds.filter((candidateId) => {
      const completion = computeDocumentRepositoryCompletion(
        docsByCandidate.get(candidateId) ?? [],
      );
      return completion.typeMissingCount > 0;
    });
  }

  private async getRecruiterMandatoryCandidateIds(
    recruiterId: string,
    projectId?: string,
    roleCatalogId?: string,
    search?: string,
  ): Promise<string[]> {
    let poolCandidateIds: string[];

    if (projectId || roleCatalogId) {
      poolCandidateIds = await this.getMandatoryCandidateIdsFromProjects(
        recruiterId,
        projectId,
        roleCatalogId,
        search,
      );
    } else {
      const [fromAssignments, fromProjects] = await Promise.all([
        this.getMandatoryCandidateIdsFromRecruiterAssignments(recruiterId, search),
        this.getMandatoryCandidateIdsFromProjects(recruiterId, undefined, undefined, search),
      ]);
      const ordered = new Map<string, true>();
      for (const id of fromAssignments) ordered.set(id, true);
      for (const id of fromProjects) ordered.set(id, true);
      poolCandidateIds = [...ordered.keys()];
    }

    return this.filterCandidatesMissingMandatoryDocuments(poolCandidateIds);
  }

  private async getRecruiterMandatoryDocuments(query: {
    page?: number;
    limit?: number;
    search?: string;
    recruiterId: string;
    projectId?: string;
    roleCatalogId?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      recruiterId,
      projectId,
      roleCatalogId,
    } = query;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const mandatoryCandidateIds = await this.getRecruiterMandatoryCandidateIds(
      recruiterId,
      projectId,
      roleCatalogId,
      search,
    );

    const total = mandatoryCandidateIds.length;
    const pageCandidateIds = mandatoryCandidateIds.slice(skip, skip + limitNumber);

    if (pageCandidateIds.length === 0) {
      const dashboardCounts = await this.getRecruiterDocumentDashboardCounts(
        recruiterId,
        projectId,
        roleCatalogId,
      );

      return {
        items: [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: limitNumber > 0 ? Math.ceil(total / limitNumber) : 1,
        },
        counts: {
          ...dashboardCounts,
          mandatoryDocuments: total,
        },
      };
    }

    const recruiterUser = await this.prisma.user.findUnique({
      where: { id: recruiterId },
      select: { id: true, name: true },
    });

    const candidates = await this.prisma.candidate.findMany({
      where: { id: { in: pageCandidateIds } },
      include: {
        documents: {
          where: { isDeleted: false } as any,
          select: { docType: true },
        },
        currentStatus: {
          select: { statusName: true },
        },
        projects: {
          where: {
            recruiterId,
            ...(projectId ? { projectId } : {}),
            ...(roleCatalogId ? { roleNeeded: { roleCatalogId } } : {}),
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            project: {
              include: {
                documentRequirements: {
                  where: { isDeleted: false } as any,
                },
                client: { select: { name: true } },
              },
            },
            roleNeeded: {
              select: {
                id: true,
                designation: true,
                roleCatalog: {
                  select: { id: true, name: true, label: true },
                },
              },
            },
            documentVerifications: {
              where: { isDeleted: false } as any,
              include: {
                document: {
                  select: {
                    id: true,
                    docType: true,
                    fileName: true,
                    fileUrl: true,
                    status: true,
                    createdAt: true,
                  },
                },
                verificationHistory: {
                  orderBy: { performedAt: 'desc' },
                  take: 1,
                },
              },
            },
            projectStatusHistory: {
              orderBy: { statusChangedAt: 'desc' },
              take: 1,
              include: {
                changedBy: { select: { name: true } },
              },
            },
            subStatus: true,
            mainStatus: true,
            recruiter: { select: { id: true, name: true } },
          },
        },
      },
    });

    const candidateById = new Map(candidates.map((c) => [c.id, c]));

    const items = pageCandidateIds
      .map((candidateId) => {
        const candidate = candidateById.get(candidateId);
        if (!candidate) return null;

        const candidateDocs = candidate.documents ?? [];
        const mandatoryCompletion =
          computeDocumentRepositoryCompletion(candidateDocs);
        const mandatorySlots = getDocumentRepositorySlots(candidateDocs);
        const cp = candidate.projects[0];

        const candidatePayload = {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          candidateCode: candidate.candidateCode,
          email: candidate.email,
          mobileNumber: candidate.mobileNumber,
          countryCode: candidate.countryCode,
          profileImage: candidate.profileImage,
        };

        const mandatoryDocumentsPayload = {
          percent: mandatoryCompletion.percent,
          uploaded: mandatoryCompletion.completedCount,
          required: mandatoryCompletion.requiredCount,
          missingCount: mandatoryCompletion.typeMissingCount,
          slots: mandatorySlots,
        };

        if (!cp) {
          return {
            candidateProjectMapId: `mandatory-${candidate.id}`,
            candidate: candidatePayload,
            project: {
              id: '',
              title: '—',
              countryCode: null,
              client: null,
              role: null,
            },
            recruiter: recruiterUser ?? { id: recruiterId, name: 'Recruiter' },
            documentDetails: [],
            progress: {
              docsUploaded: 0,
              totalDocsToUpload: 0,
              docsPercentage: 0,
            },
            mandatoryDocuments: mandatoryDocumentsPayload,
            lastAction: null,
            status: {
              main: candidate.currentStatus?.statusName ?? null,
              mainLabel: candidate.currentStatus?.statusName ?? null,
              sub: candidate.currentStatus?.statusName ?? null,
              subLabel: candidate.currentStatus?.statusName ?? null,
            },
          };
        }

        const totalDocsToUpload = cp.project.documentRequirements.length;
        const requiredDocTypes = cp.project.documentRequirements.map(
          (r) => r.docType,
        );
        const uploadedDocTypes = new Set(
          cp.documentVerifications.map((dv) => dv.document.docType),
        );
        const docsUploaded = requiredDocTypes.filter((type) =>
          uploadedDocTypes.has(type),
        ).length;
        const docsPercentage =
          totalDocsToUpload > 0
            ? Math.min(100, Math.round((docsUploaded / totalDocsToUpload) * 100))
            : 0;

        return {
          candidateProjectMapId: cp.id,
          candidate: candidatePayload,
          project: {
            id: cp.project.id,
            title: cp.project.title,
            countryCode: cp.project.countryCode,
            client: cp.project.client,
            role: cp.roleNeeded
              ? {
                  id: cp.roleNeeded.id,
                  designation: cp.roleNeeded.designation,
                  roleCatalog: cp.roleNeeded.roleCatalog,
                }
              : null,
          },
          recruiter: cp.recruiter ?? recruiterUser ?? { id: recruiterId, name: 'Recruiter' },
          documentDetails: cp.documentVerifications.map((dv) => ({
            id: dv.id,
            documentId: dv.documentId,
            docType: dv.document.docType,
            status: dv.status,
            fileName: dv.document.fileName,
            fileUrl: dv.document.fileUrl,
            uploadedAt: dv.document.createdAt,
          })),
          progress: {
            docsUploaded,
            totalDocsToUpload,
            docsPercentage,
          },
          mandatoryDocuments: mandatoryDocumentsPayload,
          lastAction: cp.projectStatusHistory[0]
            ? {
                status: cp.projectStatusHistory[0].subStatusSnapshot,
                performedBy: cp.projectStatusHistory[0].changedBy?.name,
                at: cp.projectStatusHistory[0].statusChangedAt,
                reason: cp.projectStatusHistory[0].reason,
              }
            : null,
          status: {
            main: cp.mainStatus?.name || null,
            mainLabel: cp.mainStatus?.label || null,
            sub: cp.subStatus?.name || null,
            subLabel: cp.subStatus?.label || null,
          },
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const dashboardCounts = await this.getRecruiterDocumentDashboardCounts(
      recruiterId,
      projectId,
      roleCatalogId,
    );

    return {
      items,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: limitNumber > 0 ? Math.ceil(total / limitNumber) : 1,
      },
      counts: {
        ...dashboardCounts,
        mandatoryDocuments: total,
      },
    };
  }

  /**
   * Get verified or rejected documents for candidates assigned to a specific recruiter
   * Includes project details, document upload progress and counts
   */
  async getRecruiterVerifiedRejectedDocuments(query: any) {
    const {
      page = 1,
      limit = 20,
      search,
      recruiterId,
      status = 'verified',
      projectId,
      roleCatalogId,
    } = query;

    if (!recruiterId) {
      throw new BadRequestException('Recruiter ID is required');
    }

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const { nominatedWhereBase, pendingDocumentsWhereBase, inScreeningWhereBase } =
      this.buildRecruiterPendingWhereBases(recruiterId, projectId, roleCatalogId);

    const pendingWhereBase = pendingDocumentsWhereBase;

    const { verifiedWhereBase, rejectedWhereBase } =
      this.buildRecruiterVerifiedRejectedWhereBases(
        recruiterId,
        projectId,
        roleCatalogId,
      );

    // 2. Determine the active where clause for the list based on status
    let activeWhere: any;
    if (status === 'verified') {
      activeWhere = { ...verifiedWhereBase };
    } else if (status === 'rejected') {
      activeWhere = { ...rejectedWhereBase };
    } else if (status === 'nominated') {
      activeWhere = { ...nominatedWhereBase };
    } else if (status === 'pending_documents') {
      activeWhere = { ...pendingWhereBase };
    } else if (status === 'InScreening') {
      activeWhere = { ...inScreeningWhereBase };
    } else {
      // Default to verified or both if needed
      activeWhere = {
        recruiterId,
        documentVerifications: {
          some: {
            status: { in: ['verified', 'rejected'] },
            isDeleted: false,
          },
        },
      };
    }

    // 3. Apply search to activeWhere for the paginated list
    if (search) {
      const searchOR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { candidate: { candidateCode: { contains: search, mode: 'insensitive' } } },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];

      if (activeWhere.OR) {
        const statusOR = activeWhere.OR;
        delete activeWhere.OR;
        activeWhere.AND = [{ OR: statusOR }, { OR: searchOR }];
      } else {
        activeWhere.OR = searchOR;
      }
    }

    // 4. Fetch data and counts in parallel
    const [candidateProjects, total, dashboardCounts] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where: activeWhere,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              candidateCode: true,
              email: true,
              mobileNumber: true,
              countryCode: true,
              profileImage: true,
            },
          },
          project: {
            include: {
              documentRequirements: {
                where: { isDeleted: false } as any,
              },
              client: { select: { name: true } },
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              roleCatalog: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                },
              },
            },
          },
          documentVerifications: {
            where: { isDeleted: false } as any,
            include: {
              document: {
                select: {
                  id: true,
                  docType: true,
                  fileName: true,
                  fileUrl: true,
                  status: true,
                  createdAt: true,
                },
              },
              verificationHistory: {
                orderBy: { performedAt: 'desc' },
                take: 1,
              },
            },
          },
          projectStatusHistory: {
            orderBy: { statusChangedAt: 'desc' },
            take: 1,
            include: {
              changedBy: {
                select: { name: true },
              },
            },
          },
          subStatus: true,
          mainStatus: true,
          recruiter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      this.prisma.candidateProjects.count({ where: activeWhere }),
      this.getRecruiterDocumentDashboardCounts(recruiterId, projectId, roleCatalogId),
    ]);

    // 5. Format items (same structure as getRecruiterPendingDocuments)
    const items = candidateProjects.map((cp) => {
      const totalDocsToUpload = cp.project.documentRequirements.length;

      // Count unique required docTypes that have at least one upload
      const requiredDocTypes = cp.project.documentRequirements.map(r => r.docType);
      const uploadedDocTypes = new Set(cp.documentVerifications.map(dv => dv.document.docType));
      const docsUploaded = requiredDocTypes.filter(type => uploadedDocTypes.has(type)).length;

      const docsPercentage =
        totalDocsToUpload > 0
          ? Math.min(100, Math.round((docsUploaded / totalDocsToUpload) * 100))
          : 0;

      const introVideoRequired = cp.project.introductionVideoRequired === true;
      const checklistRequiredCount =
        totalDocsToUpload + (introVideoRequired ? 1 : 0);
      const documentChecklist = this.buildRecruiterProjectDocumentChecklist(cp);
      const checklistUploadedCount = documentChecklist.rows.filter(
        (r) => r.isUploaded,
      ).length;

      return {
        candidateProjectMapId: cp.id,
        candidate: cp.candidate,
        project: {
          id: cp.project.id,
          title: cp.project.title,
          countryCode: cp.project.countryCode,
          client: cp.project.client,
          role: cp.roleNeeded
            ? {
              id: cp.roleNeeded.id,
              designation: cp.roleNeeded.designation,
              roleCatalog: cp.roleNeeded.roleCatalog,
            }
            : null,
        },
        recruiter: cp.recruiter,
        documentDetails: cp.documentVerifications.map((dv) => ({
          id: dv.id,
          documentId: dv.documentId,
          docType: dv.document.docType,
          status: dv.status,
          fileName: dv.document.fileName,
          fileUrl: dv.document.fileUrl,
          uploadedAt: dv.document.createdAt,
          lastHistory: dv.verificationHistory[0] || null,
        })),
        progress: {
          docsUploaded: checklistUploadedCount || docsUploaded,
          totalDocsToUpload: checklistRequiredCount || totalDocsToUpload,
          docsPercentage:
            checklistRequiredCount > 0
              ? Math.min(
                  100,
                  Math.round(
                    (checklistUploadedCount / checklistRequiredCount) * 100,
                  ),
                )
              : docsPercentage,
        },
        documentChecklist,
        lastAction: cp.projectStatusHistory[0]
          ? {
            status: cp.projectStatusHistory[0].subStatusSnapshot,
            performedBy: cp.projectStatusHistory[0].changedBy?.name,
            at: cp.projectStatusHistory[0].statusChangedAt,
            reason: cp.projectStatusHistory[0].reason,
          }
          : null,
        status: {
          main: cp.mainStatus?.name || null,
          mainLabel: cp.mainStatus?.label || null,
          sub: cp.subStatus?.name || null,
          subLabel: cp.subStatus?.label || null,
        },
      };
    });

    return {
      items,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: limitNumber > 0 ? Math.ceil(total / limitNumber) : 1,
      },
      counts: dashboardCounts,
    };
  }

  private buildRecruiterVerifiedRejectedWhereBases(
    recruiterId: string,
    projectId?: string,
    roleCatalogId?: string,
  ) {
    const verifiedWhereBase: Record<string, unknown> = {
      recruiterId,
      documentVerifications: {
        some: { status: 'verified', isDeleted: false },
      },
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    const rejectedWhereBase: Record<string, unknown> = {
      recruiterId,
      documentVerifications: {
        some: { status: 'rejected', isDeleted: false },
      },
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    if (projectId) {
      verifiedWhereBase.projectId = projectId;
      rejectedWhereBase.projectId = projectId;
    }
    if (roleCatalogId) {
      verifiedWhereBase.roleNeeded = { roleCatalogId };
      rejectedWhereBase.roleNeeded = { roleCatalogId };
    }

    return { verifiedWhereBase, rejectedWhereBase };
  }

  private buildRecruiterPendingWhereBases(
    recruiterId: string,
    projectId?: string,
    roleCatalogId?: string,
  ) {
    const base: Record<string, unknown> = {
      recruiterId,
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    if (projectId) {
      base.projectId = projectId;
    }
    if (roleCatalogId) {
      base.roleNeeded = { roleCatalogId };
    }

    const nominatedWhereBase = {
      ...base,
      mainStatus: { name: 'nominated' },
    };

    const pendingDocumentsWhereBase = {
      ...base,
      OR: [
        {
          mainStatus: { name: 'documents' },
          subStatus: {
            name: { notIn: ['documents_verified', 'rejected_documents'] },
          },
        },
        {
          mainStatus: { name: { in: ['interview', 'processing', 'final'] } },
          subStatus: {
            name: { notIn: ['documents_verified', 'rejected_documents'] },
          },
          projectStatusHistory: {
            none: {
              subStatus: { name: 'documents_verified' },
            },
          },
        },
      ],
    };

    const inScreeningWhereBase = {
      ...base,
      subStatus: {
        name: {
          in: [
            'screening_assigned',
            'screening_scheduled',
            'screening_completed',
            'screening_passed',
            'screening_failed',
          ],
        },
      },
      projectStatusHistory: {
        none: {
          subStatus: { name: 'documents_verified' },
        },
      },
    };

    return { nominatedWhereBase, pendingDocumentsWhereBase, inScreeningWhereBase };
  }

  /** Stable dashboard tile counts — independent of active list status filter. */
  private async getRecruiterDocumentDashboardCounts(
    recruiterId: string,
    projectId?: string,
    roleCatalogId?: string,
  ): Promise<{
    nominated: number;
    pending: number;
    pendingUpload: number;
    verified: number;
    rejected: number;
    inScreening: number;
    mandatoryDocuments: number;
  }> {
    const { nominatedWhereBase, pendingDocumentsWhereBase, inScreeningWhereBase } =
      this.buildRecruiterPendingWhereBases(recruiterId, projectId, roleCatalogId);
    const { verifiedWhereBase, rejectedWhereBase } =
      this.buildRecruiterVerifiedRejectedWhereBases(
        recruiterId,
        projectId,
        roleCatalogId,
      );

    const [
      nominatedCount,
      pendingDocumentsCount,
      verifiedCount,
      rejectedCount,
      pendingUploadCount,
      inScreeningCount,
      mandatoryDocumentsCount,
    ] = await Promise.all([
      this.prisma.candidateProjects.count({ where: nominatedWhereBase }),
      this.prisma.candidateProjects.count({ where: pendingDocumentsWhereBase }),
      this.prisma.candidateProjects.count({ where: verifiedWhereBase }),
      this.prisma.candidateProjects.count({ where: rejectedWhereBase }),
      this.prisma.candidateProjects.count({
        where: {
          ...pendingDocumentsWhereBase,
          documentVerifications: {
            none: { isDeleted: false } as any,
          },
        },
      }),
      this.prisma.candidateProjects.count({ where: inScreeningWhereBase }),
      this.countRecruiterMandatoryDocuments(recruiterId, projectId, roleCatalogId),
    ]);

    return {
      nominated: nominatedCount,
      pending: pendingDocumentsCount,
      pendingUpload: pendingUploadCount,
      verified: verifiedCount,
      rejected: rejectedCount,
      inScreening: inScreeningCount,
      mandatoryDocuments: mandatoryDocumentsCount,
    };
  }

  /**
   * Get professional documentation analytics data
   * Returns all document verifications with candidate and verifier information
   * Used for analytics dashboard
   */
  async getProfessionalAnalytics(): Promise<
    Array<{
      id: string;
      candidateName: string;
      status: 'verified' | 'pending' | 'rejected';
      docType: string;
      rejectionReason: string | null;
      verifiedBy: string | null;
      createdAt: string;
    }>
  > {
    const verifications = await this.prisma.candidateProjectDocumentVerification.findMany({
      include: {
        document: {
          select: {
            id: true,
            docType: true,
            createdAt: true,
            rejectionReason: true,
          },
        },
        candidateProjectMap: {
          include: {
            candidate: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        verificationHistory: {
          where: {
            action: { in: ['verified', 'rejected'] },
          },
          orderBy: { performedAt: 'desc' },
          take: 1,
          include: {
            performer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return verifications.map((verification) => {
      const candidate = verification.candidateProjectMap.candidate;
      const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
      const latestHistory = verification.verificationHistory[0];
      const verifiedByName = latestHistory?.performer?.name || null;

      // Map verification status to analytics status
      let status: 'verified' | 'pending' | 'rejected';
      if (verification.status === 'verified') {
        status = 'verified';
      } else if (verification.status === 'rejected') {
        status = 'rejected';
      } else {
        status = 'pending';
      }

      return {
        id: verification.id,
        candidateName,
        status,
        docType: verification.document.docType,
        rejectionReason: verification.rejectionReason || null,
        verifiedBy: verifiedByName,
        createdAt: verification.document.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
      };
    });
  }

  /**
   * Merge all verified documents for a candidate in a specific project and role into a single PDF
   */
  async mergeVerifiedDocuments(
    candidateId: string,
    projectId: string,
    roleCatalogId?: string,
    candidateProjectMapId?: string,
    orderedDocumentIds?: string[],
  ): Promise<Buffer> {
    // 1. Find the candidate project mapping first to ensure it's valid
    const cpMap = await this.prisma.candidateProjects.findFirst({
      where: {
        id: candidateProjectMapId,
        candidateId,
        projectId,
        roleNeeded: (roleCatalogId && !candidateProjectMapId) ? { roleCatalogId } : undefined,
      },
    });

    if (!cpMap) {
      throw new NotFoundException(
        'Candidate project nomination not found for the specified candidate, project, and role.',
      );
    }

    const mergeableVerifications = await this.getVerifiedDocumentsForMerge(
      cpMap,
      roleCatalogId,
    );

    if (mergeableVerifications.length === 0) {
      throw new NotFoundException(
        'No verified PDF-mergeable documents found for this candidate nomination.',
      );
    }

    let docsToMerge: typeof mergeableVerifications;

    if (orderedDocumentIds && orderedDocumentIds.length > 0) {
      const allowedByDocumentId = new Map(
        mergeableVerifications.map((verification) => [
          verification.documentId,
          verification,
        ]),
      );

      const invalidIds = orderedDocumentIds.filter(
        (documentId) => !allowedByDocumentId.has(documentId),
      );

      if (invalidIds.length > 0) {
        throw new BadRequestException(
          'One or more selected documents are not verified for this project/role and cannot be merged.',
        );
      }

      docsToMerge = orderedDocumentIds
        .map((documentId) => allowedByDocumentId.get(documentId))
        .filter((verification): verification is NonNullable<typeof verification> =>
          Boolean(verification),
        );
    } else {
      docsToMerge = mergeableVerifications;
    }

    if (docsToMerge.length === 0) {
      throw new NotFoundException(
        'No verified documents selected for merge.',
      );
    }

    const mergedPdf = await PDFDocument.create();

    for (const v of docsToMerge) {
      const doc = v.document;
      try {
        const response = await axios.get(doc.fileUrl, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type']?.toLowerCase();
        const fileBuffer = response.data as any;

        if (contentType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf')) {
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (
          contentType === 'image/jpeg' ||
          contentType === 'image/jpg' ||
          doc.fileName.toLowerCase().endsWith('.jpg') ||
          doc.fileName.toLowerCase().endsWith('.jpeg')
        ) {
          const image = await mergedPdf.embedJpg(fileBuffer);
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        } else if (contentType === 'image/png' || doc.fileName.toLowerCase().endsWith('.png')) {
          const image = await mergedPdf.embedPng(fileBuffer);
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
      } catch (error) {
        this.logger.error(`Failed to fetch or process document ${doc.id}: ${error.message}`);
      }
    }

    const pdfBytes = await mergedPdf.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Save or update merged document record
   */
  async saveMergedDocument(data: {
    candidateId: string;
    projectId: string;
    roleCatalogId?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }) {
    // We use findFirst instead of upsert directly because of how nulls are handled in unique constraints
    const existing = await this.prisma.mergedDocument.findFirst({
      where: {
        candidateId: data.candidateId,
        projectId: data.projectId,
        roleCatalogId: data.roleCatalogId || null,
      },
    });

    if (existing) {
      return this.prisma.mergedDocument.update({
        where: { id: existing.id },
        data: {
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.mergedDocument.create({
      data: {
        candidateId: data.candidateId,
        projectId: data.projectId,
        roleCatalogId: data.roleCatalogId || null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });
  }

  /**
   * Get merged documents for a candidate or project
   */
  async getMergedDocuments(filters: {
    candidateId?: string;
    projectId?: string;
    roleCatalogId?: string;
  }) {
    const { candidateId, projectId, roleCatalogId } = filters;

    // Build where clause
    const where: any = {};
    if (candidateId) where.candidateId = candidateId;
    if (projectId) where.projectId = projectId;

    if (roleCatalogId) {
      // If roleSpecific is requested, try to find exact match first
      const exactMatch = await this.prisma.mergedDocument.findFirst({
        where: {
          ...where,
          roleCatalogId,
        },
        include: {
          candidate: { select: { firstName: true, lastName: true } },
          project: { select: { title: true } },
          roleCatalog: { select: { name: true, label: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (exactMatch) return exactMatch;

      // If not found, look for a generic one (roleCatalogId is null)
      const genericMatch = await this.prisma.mergedDocument.findFirst({
        where: {
          ...where,
          roleCatalogId: null,
        },
        include: {
          candidate: { select: { firstName: true, lastName: true } },
          project: { select: { title: true } },
          roleCatalog: { select: { name: true, label: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (genericMatch) return genericMatch;

      // If still not found, just return the latest merged document for this candidate/project
      // regardless of the roleCatalogId
    }

    return this.prisma.mergedDocument.findFirst({
      where,
      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            title: true,
          },
        },
        roleCatalog: {
          select: {
            name: true,
            label: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Forward documents to client via email
   */
  async forwardToClient(forwardDto: ForwardToClientDto, senderId: string) {
    const { 
      candidateId, 
      projectId, 
      recipientEmail, 
      cc,
      bcc,
      sendType, 
      documentIds, 
      notes, 
      roleCatalogId,
      csvUrl,
      csvName,
    } = forwardDto;

    return this.processForwarding({
      candidateId,
      projectId,
      recipientEmail,
      cc,
      bcc,
      sendType, 
      documentIds, 
      notes, 
      roleCatalogId,
      senderId,
      deliveryMethod: DeliveryMethod.EMAIL_INDIVIDUAL,
      csvUrl,
      csvName,
    });
  }

  /**
   * Bulk forward documents for multiple candidates to client
   */
  async bulkForwardToClient(bulkForwardDto: BulkForwardToClientDto, senderId: string) {
    const { 
      recipientEmail, 
      cc,
      bcc,
      projectId, 
      notes, 
      selections, 
      deliveryMethod = DeliveryMethod.EMAIL_INDIVIDUAL,
      csvUrl,
      csvName,
    } = bulkForwardDto;

    // Validate project once
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // If using individual emails, keep existing behavior
    if (!deliveryMethod || deliveryMethod === DeliveryMethod.EMAIL_INDIVIDUAL) {
      const results: Array<{ candidateId: string; success: boolean }> = [];
      const errors: Array<{ candidateId: string; error: string }> = [];

      for (const selection of selections) {
        try {
          await this.processForwarding({
            candidateId: selection.candidateId,
            projectId: selection.projectId || projectId,
            recipientEmail,
            cc,
            bcc,
            sendType: selection.sendType,
            documentIds: selection.documentIds,
            notes,
            roleCatalogId: selection.roleCatalogId,
            senderId,
            isBulk: true,
            deliveryMethod: deliveryMethod || DeliveryMethod.EMAIL_INDIVIDUAL,
            csvUrl,
            csvName,
          });
          results.push({ candidateId: selection.candidateId, success: true });
        } catch (error) {
          this.logger.error(`Failed to forward documents for candidate ${selection.candidateId}: ${error.message}`);
          errors.push({ candidateId: selection.candidateId, error: error.message });
        }
      }

      if (results.length === 0 && errors.length > 0) {
        throw new BadRequestException(`Bulk forwarding failed: ${errors[0].error}`);
      }

      return {
        success: true,
        message: `Successfully queued documents for ${results.length} candidates. ${errors.length > 0 ? `${errors.length} failed.` : ''}`,
        details: {
          processed: results,
          failed: errors
        }
      };
    }

    // New delivery methods: EMAIL_COMBINED or GOOGLE_DRIVE
    // For these, we queue a single bulk job instead of multiple individual ones
    await this.documentForwardQueue.add('bulk-send-documents', {
      bulkForwardDto,
      senderId,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    });

    return {
      success: true,
      message: `Bulk document delivery (${deliveryMethod}) queued for ${selections.length} candidates. This may take a few minutes.`,
    };
  }

  /**
   * Internal helper to process document forwarding logic
   */
  private async processForwarding(params: {
    candidateId: string;
    projectId: string;
    recipientEmail: string;
    cc?: string[];
    bcc?: string[];
    sendType: SendType;
    documentIds?: string[];
    notes?: string;
    roleCatalogId?: string;
    senderId: string;
    isBulk?: boolean;
    deliveryMethod?: string;
    csvUrl?: string;
    csvName?: string;
    gdriveLink?: string;
  }) {
    const { 
      candidateId, 
      projectId, 
      recipientEmail, 
      cc = [],
      bcc = [],
      sendType, 
      documentIds, 
      notes, 
      roleCatalogId,
      senderId,
      isBulk = false,
      deliveryMethod,
      csvUrl,
      csvName,
      gdriveLink,
    } = params;

    // 1. Validate candidate
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    // (Project validation is shared in bulk, but for single it's done here indirectly if we call it from forwardToClient)
    // To be safe, we can still validate project here or assume it's validated. 
    // The existing forwardToClient validated it.

    let attachments: any[] = [];

    // Add optional CSV attachment if provided
    if (csvUrl) {
      attachments.push({
        id: `csv-${Date.now()}`,
        fileName: csvName || 'summary.csv',
        fileUrl: csvUrl,
        mimeType: 'text/csv',
      });
    }

    if (sendType === SendType.MERGED) {
      // 2. Locate latest merged PDF
      // Try exact role match first, fallback to generic (null role), then latest overall
      let mergedDoc: any = null;
      const effectiveRoleCatalogId = roleCatalogId && roleCatalogId !== "" ? roleCatalogId : null;

      if (effectiveRoleCatalogId) {
        mergedDoc = await this.prisma.mergedDocument.findFirst({
          where: { candidateId, projectId, roleCatalogId: effectiveRoleCatalogId },
          orderBy: { updatedAt: 'desc' },
        });
      }

      if (!mergedDoc) {
        mergedDoc = await this.prisma.mergedDocument.findFirst({
          where: { candidateId, projectId, roleCatalogId: null },
          orderBy: { updatedAt: 'desc' },
        });
      }

      // Final fallback: any merged document for this candidate and project
      if (!mergedDoc) {
        mergedDoc = await this.prisma.mergedDocument.findFirst({
          where: { candidateId, projectId },
          orderBy: { updatedAt: 'desc' },
        });
      }

      if (!mergedDoc) {
        throw new BadRequestException(`No merged document found for candidate ${candidateId}. Please generate it first.`);
      }
      
      attachments.push({
        id: mergedDoc.id,
        fileName: mergedDoc.fileName,
        fileUrl: mergedDoc.fileUrl,
        mimeType: mergedDoc.mimeType,
      });
    } else {
      // 3. Individual Documents
      if (!documentIds || documentIds.length === 0) {
        throw new BadRequestException(`No document IDs provided for individual sending (Candidate: ${candidateId}).`);
      }

      const docs = await this.prisma.document.findMany({
        where: {
          id: { in: documentIds },
          candidateId,
          status: 'verified',
        },
      });

      if (docs.length === 0) {
        throw new BadRequestException(`No valid verified documents found for candidate ${candidateId}.`);
      }

      const individualDocs = docs.map(d => ({
        id: d.id,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        mimeType: d.mimeType,
      }));

      attachments.push(...individualDocs);
    }

    // 4. Create Audit Trail Entry (History)
    const history = await this.prisma.documentForwardHistory.create({
      // cast `data` to any to allow `isBulk` until Prisma client types are regenerated
      data: ({
        senderId,
        recipientEmail,
        ccEmails: cc,
        bccEmails: bcc,
        candidateId,
        projectId,
        roleCatalogId: roleCatalogId || null,
        sendType: sendType,
        deliveryMethod: deliveryMethod || null,
        documentDetails: attachments as any,
        csvUrl: csvUrl || null,
        gdriveLink: gdriveLink || null,
        isBulk: Boolean(isBulk),
        notes,
        status: 'pending',
      } as any),
    });

    // 5. Queue the job
    await this.documentForwardQueue.add('send-documents', {
      historyId: history.id,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    });

    // 6. Update CandidateProject status -> submitted_to_client + create history (best-effort)
    try {
      // Find candidateProjectMap (prefer role-specific mapping when roleCatalogId provided)
      let candidateProjectMap: any = null;

      if (roleCatalogId) {
        const roleNeeded = await this.prisma.roleNeeded.findFirst({ where: { projectId, roleCatalogId } });
        if (roleNeeded) {
          candidateProjectMap = await this.prisma.candidateProjects.findUnique({
            where: {
              candidateId_projectId_roleNeededId: {
                candidateId,
                projectId,
                roleNeededId: roleNeeded.id,
              },
            },
          });
        }
      }

      if (!candidateProjectMap) {
        candidateProjectMap = await this.prisma.candidateProjects.findFirst({
          where: { candidateId, projectId },
        });
      }

      if (candidateProjectMap) {
        const mainStatus = await this.prisma.candidateProjectMainStatus.findFirst({ where: { name: 'documents' } });
        const subStatus = await this.prisma.candidateProjectSubStatus.findFirst({ where: { name: 'submitted_to_client' } });

        if (mainStatus && subStatus) {
          await this.prisma.candidateProjects.update({
            where: { id: candidateProjectMap.id },
            data: {
              mainStatusId: mainStatus.id,
              subStatusId: subStatus.id,
              updatedAt: new Date(),
            },
          });

          const user = await this.prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });

          await this.prisma.candidateProjectStatusHistory.create({
            data: {
              candidateProjectMapId: candidateProjectMap.id,
              changedById: senderId,
              changedByName: user?.name || null,
              mainStatusId: mainStatus.id,
              subStatusId: subStatus.id,
              mainStatusSnapshot: mainStatus.label,
              subStatusSnapshot: subStatus.label,
              reason: 'Documents submitted to client',
              notes: `Forwarded via ${deliveryMethod || 'email'} to ${recipientEmail}${notes ? ` — ${notes}` : ''}`,
            },
          });
        }
      }

      // 7. Notify Interview Coordinators about forwarding
      await this.outboxService.publishDocumentsForwardedToClient(
        candidateId,
        projectId,
        senderId,
        recipientEmail,
      );

    } catch (e) {
      // best-effort: do not fail the forwarding if status update/history creation fails
      this.logger.warn(`Failed to update candidate project status after forwarding: ${e?.message || e}`);
    }

    return {
      success: true,
      message: `Documents successfully queued for delivery to ${recipientEmail}`,
      historyId: history.id,
    };
  }

  /**
   * Get the latest document forward request for a specific candidate, project, and role
   */
  async getLatestDocumentForward(query: {
    candidateId: string;
    projectId: string;
    roleCatalogId?: string;
  }) {
    const { candidateId, projectId, roleCatalogId } = query;

    const latest = await this.prisma.documentForwardHistory.findFirst({
      where: {
        candidateId,
        projectId,
        ...(roleCatalogId && { roleCatalogId }),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    return latest;
  }

  /**
   * Get project-level history of document forwardings (search + pagination)
   */
  async getProjectForwardHistory(query: {
    projectId: string;
    roleCatalogId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { projectId, roleCatalogId, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Fetch project once (returned at top-level)
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    const where: any = {
      projectId,
      ...(roleCatalogId && { roleCatalogId }),
    };

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.documentForwardHistory.count({ where }),
      this.prisma.documentForwardHistory.findMany({
        where,
        include: {
          sender: { select: { id: true, name: true, email: true } },
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              countryCode: true,
              mobileNumber: true,
              profileImage: true,
            },
          },
          roleCatalog: { select: { id: true, label: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    return {
      project,
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get history of document forwardings with search and pagination
   */
  async getDocumentForwardHistory(query: {
    candidateId: string;
    projectId: string;
    roleCatalogId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { candidateId, projectId, roleCatalogId, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      candidateId,
      projectId,
      ...(roleCatalogId && { roleCatalogId }),
    };

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.documentForwardHistory.count({ where }),
      this.prisma.documentForwardHistory.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              countryCode: true,
              mobileNumber: true,
              profileImage: true,
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
                  email: true,
                  phone: true,
                },
              },
            },
          },
          roleCatalog: {
            select: {
              id: true,
              label: true,
            },
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch rich candidate profile rows for bulk-send CSV generation.
   */
  async getBulkSendCsvProfiles(dto: BulkSendCsvProfilesDto) {
    const uniqueIds = [...new Set(dto.candidateProjectMapIds)];
    const candidateProjects = await this.prisma.candidateProjects.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        recruiter: { select: { id: true, name: true } },
        roleNeeded: {
          select: {
            roleCatalog: {
              select: {
                roleDepartment: { select: { label: true, name: true } },
              },
            },
          },
        },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            passportNumber: true,
            gender: true,
            dateOfBirth: true,
            height: true,
            weight: true,
            dataFlow: true,
            licensingExam: true,
            totalExperience: true,
            experience: true,
            graduationYear: true,
            email: true,
            mobileNumber: true,
            countryCode: true,
            address: true,
            addressCountryCode: true,
            eligibilityNumber: true,
            addressState: { select: { name: true } },
            addressCountry: { select: { name: true } },
            religion: { select: { id: true, name: true } },
            qualifications: {
              include: {
                qualification: { select: { name: true, shortName: true } },
              },
            },
            workExperiences: {
              select: {
                startDate: true,
                endDate: true,
                isCurrent: true,
                countryCode: true,
              },
            },
            documents: {
              where: { isDeleted: false },
              select: {
                docType: true,
                documentNumber: true,
                issuedAt: true,
                expiryDate: true,
                verifiedAt: true,
                createdAt: true,
                status: true,
                isDeleted: true,
              },
            },
            processingTasks: {
              select: {
                projectId: true,
                processingSteps: {
                  select: {
                    status: true,
                    eligibilityNumber: true,
                    eligibilityIssuedAt: true,
                    eligibilityValidAt: true,
                    prometricPassedAt: true,
                    prometricValidAt: true,
                    councilIssuedAt: true,
                    councilValidAt: true,
                    template: { select: { key: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (candidateProjects.length !== uniqueIds.length) {
      const foundIds = new Set(candidateProjects.map((cp) => cp.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Candidate project map(s) not found: ${missing.join(', ')}`,
      );
    }

    const orderMap = new Map(uniqueIds.map((id, index) => [id, index]));
    const sorted = [...candidateProjects].sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
    );

    return sorted.map((cp) =>
      mapCandidateProjectToBulkSendCsvProfile({
        id: cp.id,
        projectId: cp.projectId,
        candidate: cp.candidate as any,
        recruiter: cp.recruiter,
        roleNeeded: cp.roleNeeded,
      }),
    );
  }
}
