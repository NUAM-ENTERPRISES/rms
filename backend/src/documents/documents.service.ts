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
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
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
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
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
            status: verifyDto.status,
            notes: verifyDto.notes,
            rejectionReason: verifyDto.rejectionReason,
          },
        });
      } else {
        // Update existing verification
        updatedVerification = await tx.candidateProjectDocumentVerification.update({
          where: { id: verification.id },
          data: {
            status: verifyDto.status,
            notes: verifyDto.notes,
            rejectionReason: verifyDto.rejectionReason,
          },
        });
      }

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

    // Check if all documents are now verified and publish event
    // if (verifyDto.status === DOCUMENT_STATUS.VERIFIED) {
    //   const summary = await this.getDocumentSummary(
    //     verifyDto.candidateProjectMapId,
    //   );

    //   if (summary.allDocumentsVerified) {
    //     // Publish event to notify recruiter that all documents are verified
    //     await this.outboxService.publishCandidateDocumentsVerified(
    //       verifyDto.candidateProjectMapId,
    //       verifierId,
    //     );
    //   }
    // }

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
            status: DOCUMENT_STATUS.RESUBMISSION_REQUIRED,
            resubmissionRequested: true,
            rejectionReason: requestDto.reason,
          },
        });
      } else {
        updatedVerification = await tx.candidateProjectDocumentVerification.update({
          where: { id: updatedVerification.id },
          data: {
            status: DOCUMENT_STATUS.RESUBMISSION_REQUIRED,
            resubmissionRequested: true,
            rejectionReason: requestDto.reason,
          },
        });
      }

      // Create history entry
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: updatedVerification.id,
          action: 'resubmission_requested',
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

    return verification;
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
              documentRequirements: true,
            },
          },
          documentVerifications: {
            include: {
              document: true,
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
        uploadedAt: v.document.createdAt,
        verifiedAt: v.verificationHistory[0]?.performedAt || null,
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
   * Get candidates for document verification
   * Returns candidates who are in document verification stages
   */
async getVerificationCandidates(query: any) {
  const { page = 1, limit = 20, search, status } = query;
  const skip = (page - 1) * limit;

  // ------------------------------------------------------
  // 🔥 1. Resolve sub-status based on ?status=
  // ------------------------------------------------------
  let subStatusFilter: string | undefined = undefined;

  if (status) {
    const sub = await this.prisma.candidateProjectSubStatus.findFirst({
      where: { name: status },
    });

    if (!sub) {
      throw new BadRequestException(`Invalid status filter: ${status}`);
    }

    subStatusFilter = sub.id;
  }

  // ------------------------------------------------------
  // 🔥 2. Default = pending (verification_in_progress_document)
  // ------------------------------------------------------
  const defaultPending = await this.prisma.candidateProjectSubStatus.findFirst({
    where: { name: 'verification_in_progress_document' },
  });

  if (!defaultPending) {
    throw new Error('Missing sub-status: verification_in_progress_document');
  }

  const where: any = {
    subStatusId: subStatusFilter ?? defaultPending.id,
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
        roleNeeded: { select: { id: true, designation: true } },
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

  const [
    pendingCount,
    verifiedCount,
    rejectedCount,
  ] = await Promise.all([
    this.prisma.candidateProjects.count({
      where: {
        subStatus: { name: 'verification_in_progress_document' },
      },
    }),

    this.prisma.candidateProjects.count({
      where: {
        subStatus: { name: 'documents_verified' },
      },
    }),

    this.prisma.candidateProjects.count({
      where: {
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
    },
  });

  if (!candidateProject) {
    throw new NotFoundException('Candidate project mapping not found');
  }

  // Get project document requirements
  const requirements = await this.prisma.documentRequirement.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });

  // GET ALL VERIFICATIONS (full list of uploaded docs for this project)
  const allVerifications =
    await this.prisma.candidateProjectDocumentVerification.findMany({
      where: { candidateProjectMapId: candidateProject.id },
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

  return {
    candidateProject,
    requirements,
    verifications, // ONLY LATEST DOCUMENT PER DOCTYPE
    allCandidateDocuments, // FULL HISTORY
    summary: {
      totalRequired,
      totalSubmitted,
      totalVerified,
      totalRejected,
      totalPending,
      allDocumentsVerified,
      canApproveCandidate: allDocumentsVerified,
    },
  };
}


  /**
   * Reuse an existing document for a new project
   */
  async reuseDocument(
    documentId: string,
    projectId: string,
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
        },
      });

    if (existingVerification) {
      throw new BadRequestException('Document already linked to this project');
    }

    // Create document verification record
    const verification =
      await this.prisma.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId: candidateProject.id,
          documentId,
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
      where: { projectId: candidateProject.projectId },
    });

    // 3. Get verification records
    const verifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: { candidateProjectMapId },
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

  return updated;
}


}
