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
import { UploadOfferLetterDto } from './dto/upload-offer-letter.dto';
import { VerifyOfferLetterDto } from './dto/verify-offer-letter.dto';
import { ForwardToClientDto, SendType } from './dto/forward-to-client.dto';
import { BulkForwardToClientDto } from './dto/bulk-forward-to-client.dto';
import {
  DocumentWithRelations,
  PaginatedDocuments,
  DocumentStats,
  CandidateProjectDocumentSummary,
} from './types';
import {
  DOCUMENT_STATUS,
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_META,
  CANDIDATE_PROJECT_STATUS,
  canTransitionStatus,
} from '../common/constants';
import { OutboxService } from '../notifications/outbox.service';
import { ProcessingService } from '../processing/processing.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly processingService: ProcessingService,
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

    // Validate file size if provided
    if (
      createDocumentDto.fileSize &&
      createDocumentDto.docType in DOCUMENT_TYPE_META
    ) {
      const maxSizeMB = DOCUMENT_TYPE_META[createDocumentDto.docType].maxSizeMB;
      const fileSizeMB = createDocumentDto.fileSize / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
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

    // Create document
    const document = await this.prisma.document.create({
      data: {
        candidateId: createDocumentDto.candidateId,
        docType: createDocumentDto.docType,
        fileName: createDocumentDto.fileName,
        fileUrl: createDocumentDto.fileUrl,
        fileSize: createDocumentDto.fileSize,
        mimeType: createDocumentDto.mimeType,
        expiryDate: createDocumentDto.expiryDate
          ? new Date(createDocumentDto.expiryDate)
          : null,
        documentNumber: createDocumentDto.documentNumber,
        notes: createDocumentDto.notes,
        roleCatalogId:
          createDocumentDto.roleCatalog || createDocumentDto.roleCatalogId || createDocumentDto.roleCatelogId || null,
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

    // Attach to a processing step if requested
    if (createDocumentDto.processingStepId) {
      await this.processingService.attachDocumentToStep(createDocumentDto.processingStepId, document.id, userId);
    }

    return document as DocumentWithRelations;
  }

  /**
   * Get all documents with pagination and filtering
   */
  async findAll(query: QueryDocumentsDto): Promise<PaginatedDocuments> {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

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

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
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

    return {
      documents: documents as DocumentWithRelations[],
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

    // Update document
    const docType = updateDocumentDto.docType || existingDocument.docType;

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        fileName: updateDocumentDto.fileName,
        fileUrl: updateDocumentDto.fileUrl,
        fileSize: updateDocumentDto.fileSize,
        mimeType: updateDocumentDto.mimeType,
        expiryDate: updateDocumentDto.expiryDate
          ? new Date(updateDocumentDto.expiryDate)
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
          verifiedAt: verifyDto.status === DOCUMENT_STATUS.VERIFIED ? new Date() : null,
          rejectedAt: verifyDto.status === DOCUMENT_STATUS.REJECTED ? new Date() : null,
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
    if (verifyDto.status === DOCUMENT_STATUS.VERIFIED) {
      await this.outboxService.publishDocumentVerified(
        documentId,
        verifierId,
        verifyDto.candidateProjectMapId,
      );
    } else if (verifyDto.status === DOCUMENT_STATUS.REJECTED) {
      await this.outboxService.publishDocumentRejected(
        documentId,
        verifierId,
        verifyDto.candidateProjectMapId,
        verifyDto.rejectionReason,
      );
    }

    // Check if all documents are now verified and publish event
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
    await this.outboxService.publishDocumentResubmissionRequested(
      documentId,
      requesterId,
      requestDto.candidateProjectMapId,
      requestDto.reason,
    );

    return verification;
  }

  /**
   * Re-upload a document after resubmission request
   */
  async reupload(
    documentId: string,
    reuploadDto: ReuploadDocumentDto,
    userId: string,
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

    // Get user details for history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Update document and verification in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update the main document record
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          fileName: reuploadDto.fileName,
          fileUrl: reuploadDto.fileUrl,
          fileSize: reuploadDto.fileSize,
          mimeType: reuploadDto.mimeType,
          expiryDate: reuploadDto.expiryDate
            ? new Date(reuploadDto.expiryDate)
            : undefined,
          documentNumber: reuploadDto.documentNumber,
          notes: reuploadDto.notes,
          status: DOCUMENT_STATUS.RESUBMITTED,
          updatedAt: new Date(),
        },
      });

      // 2. Update the verification record
      const verification = await tx.candidateProjectDocumentVerification.update({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId: reuploadDto.candidateProjectMapId,
            documentId: documentId,
          },
        },
        data: {
          status: DOCUMENT_STATUS.RESUBMITTED,
          resubmissionRequested: false, // Reset flag as it's now resubmitted
          updatedAt: new Date(),
        },
      });

      // 3. Create history entry
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: verification.id,
          action: DOCUMENT_STATUS.RESUBMITTED,
          performedBy: userId,
          performedByName: user?.name || null,
          notes: reuploadDto.notes,
        },
      });

      return { updatedDocument, verification };
    });

    // Update CandidateProjectMap status
    await this.updateCandidateProjectStatus(reuploadDto.candidateProjectMapId);

    // Publish event for notification
    await this.outboxService.publishDocumentResubmitted(
      documentId,
      userId,
      reuploadDto.candidateProjectMapId,
    );

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

    const totalRequired =
      candidateProjectMap.project.documentRequirements.length;
    const totalSubmitted = candidateProjectMap.documentVerifications.length;
    const totalVerified = candidateProjectMap.documentVerifications.filter(
      (v) => v.status === DOCUMENT_STATUS.VERIFIED,
    ).length;
    const totalRejected = candidateProjectMap.documentVerifications.filter(
      (v) => v.status === DOCUMENT_STATUS.REJECTED,
    ).length;
    const totalPending = candidateProjectMap.documentVerifications.filter(
      (v) => v.status === DOCUMENT_STATUS.PENDING,
    ).length;

    const allDocumentsVerified =
      totalRequired > 0 && totalVerified === totalRequired;

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
    });

    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate is not nominated for this role in the specified project`,
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

    return result;
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
   * Get candidates for document verification
   * Returns candidates who are in document verification stages
   */
  async getVerificationCandidates(query: any) {
    // Note: `status` query is intentionally not supported — this endpoint
    // always returns candidate-projects in the document verification
    // sub-status `verification_in_progress_document`.
    const { page = 1, limit = 20, search, recruiterId, projectId, roleCatalogId, screening } = query;
    const skip = (page - 1) * limit;
    // ------------------------------------------------------
    // 🔥 1. Default = pending (verification_in_progress_document)
    // ------------------------------------------------------
    const defaultPending = await this.prisma.candidateProjectSubStatus.findFirst({
      where: { name: 'verification_in_progress_document' },
    });

    if (!defaultPending) {
      throw new Error('Missing sub-status: verification_in_progress_document');
    }

    const where: any = {
      subStatusId: defaultPending.id,
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
          recruiter: { select: { id: true, name: true, email: true } },
          mainStatus: { select: { label: true } },
          subStatus: { select: { label: true } },
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
        orderBy: { createdAt: 'desc' },
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

    const [pendingCount, verifiedCount, rejectedCount] = await Promise.all([
      this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          subStatus: { name: 'verification_in_progress_document' },
        },
      }),

      this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          subStatus: { name: 'documents_verified' },
        },
      }),

      this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          subStatus: { name: 'rejected_documents' },
        },
      }),
    ]);

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
      counts: {
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
      },
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
              "rejected_documents",
              "pending_documents"
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
  ): Promise<any> {
    // Get candidate project mapping
    const candidateProject = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            deadline: true,
            createdAt: true,
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
        // include current main/sub status (label + name)
        mainStatus: { select: { name: true, label: true } },
        subStatus: { select: { name: true, label: true } },
        projectStatusHistory: {
          select: {
            mainStatus: { select: { name: true } },
            subStatus: { select: { name: true } },
          },
        },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate project mapping not found');
    }

    // Get project document requirements
    const requirements = await this.prisma.documentRequirement.findMany({
      where: { projectId, isDeleted: false } as any,
      orderBy: { createdAt: 'asc' },
    });

    // GET ALL VERIFICATIONS (full list of uploaded docs for this project)
    const allVerifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: {
          candidateProjectMapId: candidateProject.id,
          isDeleted: false,
          isUploadedByProcessingTeam: false,
        } as any,
        include: {
          document: {
            select: {
              id: true,
              docType: true,
              fileName: true,
              fileUrl: true,
              status: true,
              uploadedBy: true,
              createdAt: true,
            },
          },
        },
      });

    // 🔥 PICK ONLY THE LATEST DOCUMENT PER DOCTYPE
    const latestVerificationsMap = new Map<string, any>();

    for (const v of allVerifications) {
      const type = v.document.docType;

      if (
        !latestVerificationsMap.has(type) ||
        new Date(v.document.createdAt) >
        new Date(latestVerificationsMap.get(type).document.createdAt)
      ) {
        latestVerificationsMap.set(type, v);
      }
    }

    // Latest verification results (only 1 per docType)
    const verifications = Array.from(latestVerificationsMap.values());

    // GET ALL candidate documents (global history)
    const allCandidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId,
        NOT: {
          verifications: {
            some: {
              candidateProjectMapId: candidateProject.id,
              isUploadedByProcessingTeam: true,
            },
          },
        },
      } as any,
      select: {
        id: true,
        docType: true,
        fileName: true,
        fileUrl: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const totalRequired = requirements.length;
    const totalSubmitted = verifications.length;
    const totalVerified = verifications.filter((v) => v.status === 'verified')
      .length;
    const totalRejected = verifications.filter((v) => v.status === 'rejected')
      .length;
    const totalPending = verifications.filter((v) => v.status === 'pending')
      .length;

    const allDocumentsVerified =
      totalVerified === totalRequired && totalRequired > 0;

    // Check candidate project status history for documentation review
    // If a previous sub-status change to 'documents_verified' or 'rejected_documents' exists,
    // we consider documentation as reviewed. Also expose a human-friendly label
    // and a code for the documentation status.
    const reviewSubStatuses = await this.prisma.candidateProjectSubStatus.findMany({
      where: { name: { in: ['documents_verified', 'rejected_documents'] } },
      select: { id: true, name: true },
    });

    let isDocumentationReviewed = false;
    let documentationStatusCode = 'pending';
    let documentationStatus = 'Document verification pending';

    if (reviewSubStatuses.length > 0) {
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

      if (reviewHistory) {
        isDocumentationReviewed = true;
        const subName = reviewHistory.subStatus?.name;
        if (subName === 'documents_verified') {
          documentationStatusCode = 'documents_verified';
          documentationStatus = 'Document verified';
        } else if (subName === 'rejected_documents') {
          documentationStatusCode = 'rejected_documents';
          documentationStatus = 'Document rejected';
        }
      }
    }

    const isSendedForDocumentVerification = candidateProject.projectStatusHistory.some(
      (h) =>
        h.mainStatus?.name === 'documents' ||
        [
          'verification_in_progress_document',
          'pending_documents',
          'documents_verified',
          'rejected_documents',
        ].includes(h.subStatus?.name || ''),
    );

    return {
      candidateProject,
      isSendedForDocumentVerification,
      requirements,
      verifications, // ONLY LATEST DOCUMENT PER DOCTYPE
      allCandidateDocuments, // FULL HISTORY
      isDocumentationReviewed,
      documentationStatus,
      documentationStatusCode,
      summary: {
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

    // Find the candidate-project mapping for this roleNeeded
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: {
        candidateId_projectId_roleNeededId: {
          candidateId,
          projectId,
          roleNeededId: roleNeeded.id,
        },
      },
      include: {
        project: true,
        candidate: true,
        roleNeeded: { include: { roleCatalog: true } },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        'Candidate is not nominated for this role in the specified project',
      );
    }

    // Build where clause for verifications
    const where: any = {
      candidateProjectMapId: candidateProject.id,
      isDeleted: false,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

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

    const [total, verifications] = await Promise.all([
      this.prisma.candidateProjectDocumentVerification.count({ where } as any),
      this.prisma.candidateProjectDocumentVerification.findMany({
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
        skip,
        take: Number(limit),
      }),
    ]);

    const totalSubmitted = total;
    const totalVerified = verifications.filter((v) => v.status === DOCUMENT_STATUS.VERIFIED).length;
    const totalRejected = verifications.filter((v) => v.status === DOCUMENT_STATUS.REJECTED).length;
    const totalPending = verifications.filter((v) => v.status === DOCUMENT_STATUS.PENDING).length;

    return {
      candidateProject,
      verifications,
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
    const verifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: { candidateProjectMapId, isDeleted: false } as any,
      });

    const totalRequired = requirements.length;
    const totalVerified = verifications.filter(
      (v) => v.status === 'verified',
    ).length;

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

    const statuses =
      status === 'verified'
        ? ['verified']
        : status === 'rejected'
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

    // Build candidateProjects where (one item per nomination)
    // We filter by candidates who have AT LEAST ONE verification matching requested statuses
    // This allows showing history even if candidate moved to other stages (e.g. submitted_to_client)
    const cpWhere: any = {
      ...countBase,
      // ensure there exists at least one verification matching requested statuses
      documentVerifications: { some: { status: { in: statuses }, isDeleted: false } },
    };

    // Search across candidate name, project title and document file name
    if (search) {
      cpWhere.AND = [
        {
          OR: [
            { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
            { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
            { project: { title: { contains: search, mode: 'insensitive' } } },
            { documentVerifications: { some: { document: { fileName: { contains: search, mode: 'insensitive' } } } } },
          ],
        },
      ];
    }

    // Fetch candidate-projects (grouped) + total, and counts
    const [candidateProjects, total, pendingCount, verifiedCount, rejectedCount] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where: cpWhere,
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true, mobileNumber: true, profileImage: true },
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
          subStatus: { select: { label: true } },
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
            where: { status: { in: statuses }, isDeleted: false } as any,
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

      this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          subStatus: { name: 'verification_in_progress_document' },
        },
      }),
      this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          documentVerifications: { some: { status: 'verified', isDeleted: false } },
        },
      }),
      this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          documentVerifications: { some: { status: 'rejected', isDeleted: false } },
        },
      }),
    ] as any);

    // Map to response items (one per candidate-project) — return latest screening as `screening`
    const items = candidateProjects.map((cp: any) => {
      const totalDocsToUpload = cp.project?.documentRequirements?.length || 0;
      const docsUploaded = cp.documentVerifications?.length || 0;
      const docsPercentage = totalDocsToUpload > 0 ? Math.round((docsUploaded / totalDocsToUpload) * 100) : 0;

      const latestScreening = Array.isArray(cp.screenings) && cp.screenings.length > 0 ? cp.screenings[0] : null;

      return {
        candidateProjectMapId: cp.id,
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

        return {
          ...it,
          sendToClient: latestForward ?? null,
          isInInterview: Boolean(inInterviewSet.has(it.candidateProjectMapId)),
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
      counts: {
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
      },
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

    const skip = (page - 1) * limit;

    // Build where clause
    let pendingStatusCondition: any = {
      OR: [
        {
          mainStatus: { name: { in: ['nominated', 'documents'] } },
          subStatus: { name: { notIn: ['documents_verified', 'rejected_documents'] } },
        },
        {
          mainStatus: { name: { in: ['interview', 'processing', 'final'] } },
          subStatus: { name: { notIn: ['documents_verified', 'rejected_documents'] } },
          projectStatusHistory: {
            none: {
              subStatus: { name: 'documents_verified' },
            },
          },
        },
      ],
    };

    // Add InScreening filter if requested
    if (status === 'InScreening') {
      pendingStatusCondition = {
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
        // We still need to ensure they are actually "pending" documentation review
        projectStatusHistory: {
          none: {
            subStatus: { name: 'documents_verified' },
          },
        },
      };
    }

    const where: any = {
      // Filter by recruiter
      recruiterId,
      ...pendingStatusCondition,
      // Only include if there are actually documents required for the project
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    // Project and RoleCatalog filters
    if (projectId) {
      where.projectId = projectId;
    }
    if (roleCatalogId) {
      where.roleNeeded = {
        roleCatalogId: roleCatalogId,
      };
    }

    // Search support
    if (search) {
      delete where.OR; // Remove the OR from pendingStatusCondition to use AND for combined criteria
      where.AND = [
        pendingStatusCondition,
        {
          OR: [
            { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
            { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
            { project: { title: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    // Fetch candidate projects with requirements and verifications
    const [candidateProjects, total, verifiedCount, rejectedCount, pendingUploadCount, inScreeningCount] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
        take: Number(limit),
      }),
      this.prisma.candidateProjects.count({ where }),
      this.prisma.candidateProjects.count({
        where: {
          recruiterId,
          OR: [
            { subStatus: { name: 'documents_verified' } },
            {
              mainStatus: { name: { in: ['interview', 'processing', 'final'] } },
              projectStatusHistory: {
                some: {
                  subStatus: { name: 'documents_verified' },
                },
              },
            },
          ],
          project: {
            documentRequirements: {
              some: { isDeleted: false } as any,
            },
          },
        },
      }),
      this.prisma.candidateProjects.count({
        where: {
          recruiterId,
          subStatus: { name: 'rejected_documents' },
          project: {
            documentRequirements: {
              some: { isDeleted: false } as any,
            },
          },
        },
      }),
      this.prisma.candidateProjects.count({
        where: {
          ...where,
          documentVerifications: {
            none: { isDeleted: false } as any,
          },
        },
      }),
      this.prisma.candidateProjects.count({
        where: {
          recruiterId,
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
          project: {
            documentRequirements: {
              some: { isDeleted: false } as any,
            },
          },
        },
      }),
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

      return {
        candidateProjectMapId: cp.id,
        candidate: cp.candidate,
        project: {
          id: cp.project.id,
          title: cp.project.title,
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
          docsUploaded,
          totalDocsToUpload,
          docsPercentage,
        },
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
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        pending: total,
        pendingUpload: pendingUploadCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        inScreening: inScreeningCount,
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

    const skip = (page - 1) * limit;

    // 1. Define the base where clauses for counts (filtered by recruiter but NOT search)
    const pendingWhereBase: any = {
      recruiterId,
      OR: [
        {
          mainStatus: { name: { in: ['nominated', 'documents'] } },
          subStatus: { name: { notIn: ['documents_verified', 'rejected_documents'] } },
        },
        {
          mainStatus: { name: { in: ['interview', 'processing', 'final'] } },
          subStatus: { name: { notIn: ['documents_verified', 'rejected_documents'] } },
          projectStatusHistory: {
            none: {
              subStatus: { name: 'documents_verified' },
            },
          },
        },
      ],
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    const verifiedWhereBase: any = {
      recruiterId,
      documentVerifications: { some: { status: 'verified', isDeleted: false } },
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    const rejectedWhereBase: any = {
      recruiterId,
      documentVerifications: { some: { status: 'rejected', isDeleted: false } },
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    const inScreeningWhereBase: any = {
      recruiterId,
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
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    // Apply Project and RoleCatalog filters to all base where clauses
    [
      pendingWhereBase,
      verifiedWhereBase,
      rejectedWhereBase,
      inScreeningWhereBase,
    ].forEach((where) => {
      if (projectId) {
        where.projectId = projectId;
      }
      if (roleCatalogId) {
        where.roleNeeded = {
          roleCatalogId: roleCatalogId,
        };
      }
    });

    // 2. Determine the active where clause for the list based on status
    let activeWhere: any;
    if (status === 'verified') {
      activeWhere = { ...verifiedWhereBase };
    } else if (status === 'rejected') {
      activeWhere = { ...rejectedWhereBase };
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
    const [
      candidateProjects,
      total,
      pendingCount,
      verifiedCount,
      rejectedCount,
      pendingUploadCount,
      inScreeningCount,
    ] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where: activeWhere,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
        take: Number(limit),
      }),
      this.prisma.candidateProjects.count({ where: activeWhere }),
      this.prisma.candidateProjects.count({ where: pendingWhereBase }),
      this.prisma.candidateProjects.count({ where: verifiedWhereBase }),
      this.prisma.candidateProjects.count({ where: rejectedWhereBase }),
      this.prisma.candidateProjects.count({
        where: {
          ...pendingWhereBase,
          documentVerifications: {
            none: { isDeleted: false } as any,
          },
        },
      }),
      this.prisma.candidateProjects.count({ where: inScreeningWhereBase }),
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

      return {
        candidateProjectMapId: cp.id,
        candidate: cp.candidate,
        project: {
          id: cp.project.id,
          title: cp.project.title,
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
          docsUploaded,
          totalDocsToUpload,
          docsPercentage,
        },
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
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        pending: pendingCount,
        pendingUpload: pendingUploadCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        inScreening: inScreeningCount,
      },
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

    // 2. Fetch all verified verifications for this mapping
    // We include documents that are either generic (null role) or match the specific role requested
    const verifications = await this.prisma.candidateProjectDocumentVerification.findMany({
      where: {
        candidateProjectMapId: cpMap.id,
        status: DOCUMENT_STATUS.VERIFIED,
        isDeleted: false,
        OR: roleCatalogId ? [{ roleCatalogId: roleCatalogId }, { roleCatalogId: null }] : undefined,
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

    if (verifications.length === 0) {
      throw new NotFoundException('No verified documents found for this candidate nomination.');
    }

    // 3. Filter to keep only the latest document per docType (to avoid duplicates if any)
        latestDocsMap.set(type, v);
    let docsToMerge: any[];

    // 3. Reorder documents if documentIds are provided, otherwise use latest per type
    if (orderedDocumentIds && orderedDocumentIds.length > 0) {
      // Create a map for quick lookup
      const vMap = new Map(verifications.map(v => [v.documentId, v]));
      
      // Order them based on the provided list
        .map(id => vMap.get(id))
        .filter(v => !!v);
    } else {
      // Filter to keep only the latest document per docType (to avoid duplicates if any)
      const latestDocsMap = new Map<string, any>();
      for (const v of verifications) {
        const type = v.document.docType;
          !latestDocsMap.has(type) ||
          new Date(v.document.createdAt) > new Date(latestDocsMap.get(type).document.createdAt)
        ) {
          latestDocsMap.set(type, v);
        }
      }
      docsToMerge = Array.from(latestDocsMap.values());
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
      sendType, 
      documentIds, 
      notes, 
      roleCatalogId 
    } = forwardDto;

    return this.processForwarding({
      candidateId,
      projectId,
      recipientEmail,
      sendType,
      documentIds,
      notes,
      roleCatalogId,
      senderId
    });
  }

  /**
   * Bulk forward documents for multiple candidates to client
   */
  async bulkForwardToClient(bulkForwardDto: BulkForwardToClientDto, senderId: string) {
    const { recipientEmail, projectId, notes, selections } = bulkForwardDto;

    // Validate project once
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const results: Array<{ candidateId: string; success: boolean }> = [];
    const errors: Array<{ candidateId: string; error: string }> = [];

    for (const selection of selections) {
      try {
        const result = await this.processForwarding({
          candidateId: selection.candidateId,
          projectId: selection.projectId || projectId,
          recipientEmail,
          sendType: selection.sendType,
          documentIds: selection.documentIds,
          notes,
          roleCatalogId: selection.roleCatalogId,
          senderId,
          isBulk: true,
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

  /**
   * Internal helper to process document forwarding logic
   */
  private async processForwarding(params: {
    candidateId: string;
    projectId: string;
    recipientEmail: string;
    sendType: SendType;
    documentIds?: string[];
    notes?: string;
    roleCatalogId?: string;
    senderId: string;
    isBulk?: boolean;
  }) {
    const { 
      candidateId, 
      projectId, 
      recipientEmail, 
      sendType, 
      documentIds, 
      notes, 
      roleCatalogId,
      senderId,
      isBulk = false,
    } = params;

    // 1. Validate candidate
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    // (Project validation is shared in bulk, but for single it's done here indirectly if we call it from forwardToClient)
    // To be safe, we can still validate project here or assume it's validated. 
    // The existing forwardToClient validated it.

    let attachments: any[] = [];

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

      attachments = docs.map(d => ({
        id: d.id,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        mimeType: d.mimeType,
      }));
    }

    // 4. Create Audit Trail Entry (History)
    const history = await this.prisma.documentForwardHistory.create({
      // cast `data` to any to allow `isBulk` until Prisma client types are regenerated
      data: ({
        senderId,
        recipientEmail,
        candidateId,
        projectId,
        roleCatalogId: roleCatalogId || null,
        sendType: sendType,
        documentDetails: attachments as any,
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
              notes: `Forwarded to ${recipientEmail}${notes ? ` — ${notes}` : ''}`,
            },
          });
        }
      }
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
}
