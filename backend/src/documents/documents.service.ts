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
import {
  DocumentWithRelations,
  PaginatedDocuments,
  DocumentStats,
  CandidateProjectDocumentSummary,
} from './types';
import {
  DOCUMENT_STATUS,
  DOCUMENT_TYPE_META,
  CANDIDATE_PROJECT_STATUS,
  canTransitionStatus,
} from '../common/constants';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

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
        uploadedBy: userId,
        status: DOCUMENT_STATUS.PENDING,
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
          },
        },
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
    const where: any = {};

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

    if (filters.verifiedBy) {
      where.verifiedBy = filters.verifiedBy;
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
              name: true,
              contact: true,
              email: true,
            },
          },
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
            name: true,
            contact: true,
            email: true,
          },
        },
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

    if (!document) {
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
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
          },
        },
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
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    await this.prisma.document.delete({
      where: { id },
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
      await this.prisma.candidateProjectMap.findUnique({
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

    // Create or update verification
    if (!verification) {
      verification =
        await this.prisma.candidateProjectDocumentVerification.create({
          data: {
            candidateProjectMapId: verifyDto.candidateProjectMapId,
            documentId: documentId,
            status: verifyDto.status,
            verifiedBy:
              verifyDto.status === DOCUMENT_STATUS.VERIFIED ? verifierId : null,
            verifiedAt:
              verifyDto.status === DOCUMENT_STATUS.VERIFIED ? new Date() : null,
            rejectedBy:
              verifyDto.status === DOCUMENT_STATUS.REJECTED ? verifierId : null,
            rejectedAt:
              verifyDto.status === DOCUMENT_STATUS.REJECTED ? new Date() : null,
            notes: verifyDto.notes,
            rejectionReason: verifyDto.rejectionReason,
          },
        });
    } else {
      verification =
        await this.prisma.candidateProjectDocumentVerification.update({
          where: { id: verification.id },
          data: {
            status: verifyDto.status,
            verifiedBy:
              verifyDto.status === DOCUMENT_STATUS.VERIFIED
                ? verifierId
                : verification.verifiedBy,
            verifiedAt:
              verifyDto.status === DOCUMENT_STATUS.VERIFIED
                ? new Date()
                : verification.verifiedAt,
            rejectedBy:
              verifyDto.status === DOCUMENT_STATUS.REJECTED
                ? verifierId
                : verification.rejectedBy,
            rejectedAt:
              verifyDto.status === DOCUMENT_STATUS.REJECTED
                ? new Date()
                : verification.rejectedAt,
            notes: verifyDto.notes,
            rejectionReason: verifyDto.rejectionReason,
          },
        });
    }

    // Update CandidateProjectMap status based on verification
    await this.updateCandidateProjectStatus(verifyDto.candidateProjectMapId);

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
      await this.prisma.candidateProjectMap.findUnique({
        where: { id: requestDto.candidateProjectMapId },
      });
    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${requestDto.candidateProjectMapId} not found`,
      );
    }

    // Get or create verification record
    let verification =
      await this.prisma.candidateProjectDocumentVerification.findUnique({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId: requestDto.candidateProjectMapId,
            documentId: documentId,
          },
        },
      });

    if (!verification) {
      verification =
        await this.prisma.candidateProjectDocumentVerification.create({
          data: {
            candidateProjectMapId: requestDto.candidateProjectMapId,
            documentId: documentId,
            status: DOCUMENT_STATUS.RESUBMISSION_REQUIRED,
            resubmissionRequested: true,
            resubmissionRequestedAt: new Date(),
            resubmissionRequestedBy: requesterId,
            rejectionReason: requestDto.reason,
          },
        });
    } else {
      verification =
        await this.prisma.candidateProjectDocumentVerification.update({
          where: { id: verification.id },
          data: {
            status: DOCUMENT_STATUS.RESUBMISSION_REQUIRED,
            resubmissionRequested: true,
            resubmissionRequestedAt: new Date(),
            resubmissionRequestedBy: requesterId,
            rejectionReason: requestDto.reason,
          },
        });
    }

    // Update candidateProjectMap status to pending_documents
    await this.prisma.candidateProjectMap.update({
      where: { id: requestDto.candidateProjectMapId },
      data: {
        status: CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS,
      },
    });

    return verification;
  }

  /**
   * Get document verification summary for a candidate-project
   */
  async getDocumentSummary(
    candidateProjectMapId: string,
  ): Promise<CandidateProjectDocumentSummary> {
    const candidateProjectMap =
      await this.prisma.candidateProjectMap.findUnique({
        where: { id: candidateProjectMapId },
        include: {
          candidate: true,
          project: {
            include: {
              documentRequirements: true,
            },
          },
          documentVerifications: {
            include: {
              document: true,
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
      candidateName: candidateProjectMap.candidate.name,
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
        uploadedAt: v.document.createdAt,
        verifiedAt: v.verifiedAt,
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
      this.prisma.document.count(),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.PENDING },
      }),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.VERIFIED },
      }),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.REJECTED },
      }),
      this.prisma.document.count({
        where: { status: DOCUMENT_STATUS.EXPIRED },
      }),
      this.prisma.document.groupBy({
        by: ['docType'],
        _count: true,
      }),
      this.prisma.$queryRaw<
        Array<{ avg: number }>
      >`SELECT AVG(EXTRACT(EPOCH FROM ("verifiedAt" - "createdAt")) / 3600) as avg FROM "public"."documents" WHERE "verifiedAt" IS NOT NULL`,
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
      await this.prisma.candidateProjectMap.findUnique({
        where: { id: candidateProjectMapId },
      });

    if (!candidateProjectMap) return;

    // Determine new status based on document verification
    let newStatus = candidateProjectMap.status;

    if (summary.totalSubmitted === 0) {
      newStatus = CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS;
    } else if (
      summary.totalPending > 0 ||
      summary.totalSubmitted < summary.totalRequired
    ) {
      newStatus = CANDIDATE_PROJECT_STATUS.VERIFICATION_IN_PROGRESS;
    } else if (summary.totalRejected > 0) {
      newStatus = CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS;
    } else if (summary.allDocumentsVerified) {
      newStatus = CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED;
    }

    // Only update if status changed and transition is valid
    if (
      newStatus !== candidateProjectMap.status &&
      canTransitionStatus(candidateProjectMap.status as any, newStatus as any)
    ) {
      await this.prisma.candidateProjectMap.update({
        where: { id: candidateProjectMapId },
        data: {
          status: newStatus,
          documentsVerifiedDate:
            newStatus === CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED
              ? new Date()
              : undefined,
        },
      });
    }
  }
}
