import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { RequestResubmissionDto } from './dto/request-resubmission.dto';
import { ReuploadDocumentDto } from './dto/reupload-document.dto';
import { UploadOfferLetterDto } from './dto/upload-offer-letter.dto';
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

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
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
      throw new BadRequestException(
        `Expiry date is required for ${createDocumentDto.docType}`,
      );
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
          createDocumentDto.docType === DOCUMENT_TYPE.RESUME
            ? createDocumentDto.roleCatalogId
            : null,
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
          docType === DOCUMENT_TYPE.RESUME
            ? updateDocumentDto.roleCatalogId
            : null,
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
            roleCatalogId: verifyDto.roleCatalogId,
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
            roleCatalogId: requestDto.roleCatalogId,
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
            roleCatalogId: requestDto.roleCatalogId,
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
    const { candidateId, projectId, roleCatalogId } = uploadDto;

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
        roleCatalogId: roleCatalogId,
      },
    });

    if (!roleNeeded) {
      throw new NotFoundException(
        `No role matching catalog ID ${roleCatalogId} found for project ${projectId}`,
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
          roleCatalogId: uploadDto.roleCatalogId,
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
          roleCatalogId: uploadDto.roleCatalogId,
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
   * Get candidates for document verification
   * Returns candidates who are in document verification stages
   */
  async getVerificationCandidates(query: any) {
    // Note: `status` query is intentionally not supported — this endpoint
    // always returns candidate-projects in the document verification
    // sub-status `verification_in_progress_document`.
    const { page = 1, limit = 20, search, recruiterId } = query;
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
          mainStatus: true,
          subStatus: true,

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

    // Make counts respect the optional recruiter filter so that a recruiter
    // sees counts only for their candidates when `recruiterId` is provided.
    const countBase: any = {};
    if (recruiterId) countBase.recruiterId = recruiterId;

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
    // 🔥 5. Return SAME old structure + counts added
    // ------------------------------------------------------
    return {
      candidateProjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      // NEW SECTION ADDED (frontend won’t break)
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
        where: { candidateProjectMapId: candidateProject.id, isDeleted: false } as any,
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
      where: { candidateId },
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
    const { page = 1, limit = 20, search, status = 'verified', recruiterId } = query as any;
    const skip = (page - 1) * limit;

    const statuses =
      status === 'verified'
        ? ['verified']
        : status === 'rejected'
          ? ['rejected']
          : ['verified', 'rejected'];

    // Base where clause applied to counts and list
    const baseWhere: any = {
      status: { in: statuses },
      isDeleted: false,
    };

    if (recruiterId) {
      // recruiter is stored on candidateProjects as recruiterId
      baseWhere.candidateProjectMap = { is: { recruiterId } };
    }

    // Search across candidate name, project title and document file name
    if (search) {
      baseWhere.OR = [
        { candidateProjectMap: { is: { candidate: { firstName: { contains: search, mode: 'insensitive' } } } } },
        { candidateProjectMap: { is: { candidate: { lastName: { contains: search, mode: 'insensitive' } } } } },
        { candidateProjectMap: { is: { project: { title: { contains: search, mode: 'insensitive' } } } } },
        { document: { fileName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const countBase: any = {};
    if (recruiterId) countBase.recruiterId = recruiterId;

    const [items, total, verifiedDistinctRows, rejectedDistinctRows, pendingCount] = await Promise.all([
      this.prisma.candidateProjectDocumentVerification.findMany({
        where: baseWhere,
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
          candidateProjectMap: {
            include: {
              candidate: {
                select: { id: true, firstName: true, lastName: true, email: true, mobileNumber: true },
              },
              project: {
                select: {
                  id: true,
                  title: true,
                  client: { select: { name: true } },
                  documentRequirements: {
                    where: { isDeleted: false } as any,
                  },
                },
              },
              documentVerifications: {
                where: { isDeleted: false } as any,
              },
              recruiter: {
                select: {
                  id: true,
                  name: true,
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
            },
          },
          verificationHistory: {
            where: { action: { in: statuses } },
            orderBy: { performedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.candidateProjectDocumentVerification.count({ where: baseWhere }),
      // Use distinct candidateProjectMapId so counts represent unique candidate-projects
      this.prisma.candidateProjectDocumentVerification.findMany({
        where: { ...baseWhere, status: 'verified' },
        select: { candidateProjectMapId: true },
        distinct: ['candidateProjectMapId'],
      }),
      this.prisma.candidateProjectDocumentVerification.findMany({
        where: { ...baseWhere, status: 'rejected' },
        select: { candidateProjectMapId: true },
        distinct: ['candidateProjectMapId'],
      }),
      this.prisma.candidateProjects.count({
        where: {
          ...countBase,
          subStatus: { name: 'verification_in_progress_document' },
        },
      }),
    ]);

    const verifiedCount = verifiedDistinctRows.length;
    const rejectedCount = rejectedDistinctRows.length;

    const itemsWithProgress = items.map((item) => {
      const cp = item.candidateProjectMap;
      const totalDocsToUpload = cp?.project?.documentRequirements?.length || 0;
      const docsUploaded = cp?.documentVerifications?.length || 0;
      const docsPercentage =
        totalDocsToUpload > 0
          ? Math.round((docsUploaded / totalDocsToUpload) * 100)
          : 0;

      return {
        ...item,
        progress: {
          docsUploaded,
          totalDocsToUpload,
          docsPercentage,
        },
      };
    });

    return {
      items: itemsWithProgress,
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
    const { page = 1, limit = 20, search, recruiterId } = query;

    if (!recruiterId) {
      throw new BadRequestException('Recruiter ID is required');
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // Filter by recruiter
      recruiterId,
      // Filter for candidates who are in recruitment phases and not yet verified/rejected
      mainStatus: {
        name: { in: ['nominated', 'documents'] },
      },
      // Exclude candidates who have already completed document verification or are rejected
      subStatus: {
        name: { notIn: ['documents_verified', 'rejected_documents'] },
      },
      // Only include if there are actually documents required for the project
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    // Search support
    if (search) {
      where.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch candidate projects with requirements and verifications
    const [candidateProjects, total, verifiedCount, rejectedCount, pendingUploadCount] = await Promise.all([
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
            { mainStatus: { name: { in: ['interview', 'processing', 'final'] } } },
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
    } = query;

    if (!recruiterId) {
      throw new BadRequestException('Recruiter ID is required');
    }

    const skip = (page - 1) * limit;

    // 1. Define the base where clauses for counts (filtered by recruiter but NOT search)
    const pendingWhereBase: any = {
      recruiterId,
      mainStatus: {
        name: { in: ['nominated', 'documents'] },
      },
      subStatus: {
        name: { notIn: ['documents_verified', 'rejected_documents'] },
      },
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    const verifiedWhereBase: any = {
      recruiterId,
      OR: [
        { subStatus: { name: 'documents_verified' } },
        { mainStatus: { name: { in: ['interview', 'processing', 'final'] } } },
      ],
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    const rejectedWhereBase: any = {
      recruiterId,
      subStatus: { name: 'rejected_documents' },
      project: {
        documentRequirements: {
          some: { isDeleted: false } as any,
        },
      },
    };

    // 2. Determine the active where clause for the list based on status
    let activeWhere: any;
    if (status === 'verified') {
      activeWhere = { ...verifiedWhereBase };
    } else if (status === 'rejected') {
      activeWhere = { ...rejectedWhereBase };
    } else if (status === 'pending_documents') {
      activeWhere = { ...pendingWhereBase };
    } else {
      // Default to verified or both if needed, but user asked for verified/rejected
      activeWhere = {
        recruiterId,
        subStatus: {
          name: { in: ['documents_verified', 'rejected_documents'] },
        },
      };
    }

    // 3. Apply search to activeWhere for the paginated list
    if (search) {
      activeWhere.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 4. Fetch data and counts in parallel
    const [
      candidateProjects,
      total,
      pendingCount,
      verifiedCount,
      rejectedCount,
      pendingUploadCount,
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
      },
    };
  }
}
