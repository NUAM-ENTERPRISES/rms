import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { DocumentsService } from '../documents/documents.service';
import { OutboxService } from '../notifications/outbox.service';
import { DOCUMENT_TYPE } from '../common/constants/document-types';
import { DOCUMENT_STATUS } from '../common/constants/statuses';

@Injectable()
export class IntroductionVideosService {
  private readonly logger = new Logger(IntroductionVideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly documentsService: DocumentsService,
    private readonly outboxService: OutboxService,
  ) {}

  private async resolveAssignment(candidateId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        introductionVideoRequired: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!project.introductionVideoRequired) {
      throw new BadRequestException(
        'This project does not require an introduction video',
      );
    }

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const candidateProject = await this.prisma.candidateProjects.findFirst({
      where: { candidateId, projectId },
      include: {
        roleNeeded: {
          select: {
            roleCatalogId: true,
            roleCatalog: {
              select: { id: true, label: true, name: true },
            },
          },
        },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        'Candidate is not assigned to this project',
      );
    }

    return { project, candidateProject };
  }

  private enrichVerification(verification: any) {
    if (!verification) return null;

    return {
      id: verification.id,
      status: verification.status,
      rejectionReason: verification.rejectionReason,
      resubmissionRequested: verification.resubmissionRequested,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
      document: verification.document
        ? {
            id: verification.document.id,
            docType: verification.document.docType,
            fileName: verification.document.fileName,
            fileUrl: verification.document.fileUrl,
            mimeType: verification.document.mimeType,
            fileSize: verification.document.fileSize,
            status: verification.document.status,
            uploadedBy: verification.document.uploadedBy,
            createdAt: verification.document.createdAt,
          }
        : null,
    };
  }

  private async findLatestIntroductionVideoVerification(
    candidateProjectMapId: string,
  ) {
    const verifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: {
          candidateProjectMapId,
          isDeleted: false,
          document: {
            docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
            isDeleted: false,
          },
        },
        include: {
          document: true,
        },
        orderBy: { createdAt: 'desc' },
      });

    return verifications[0] ?? null;
  }

  async getProjectIntroductionVideo(candidateId: string, projectId: string) {
    const { project, candidateProject } = await this.resolveAssignment(
      candidateId,
      projectId,
    );

    const verification = await this.findLatestIntroductionVideoVerification(
      candidateProject.id,
    );

    return {
      introductionVideoRequired: project.introductionVideoRequired,
      candidateProjectMapId: candidateProject.id,
      introductionVideo: this.enrichVerification(verification),
    };
  }

  async listCandidateIntroductionVideos(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const assignments = await this.prisma.candidateProjects.findMany({
      where: { candidateId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            introductionVideoRequired: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(
      assignments.map(async (assignment) => {
        const verification = await this.findLatestIntroductionVideoVerification(
          assignment.id,
        );

        return {
          projectId: assignment.project.id,
          projectTitle: assignment.project.title,
          introductionVideoRequired:
            assignment.project.introductionVideoRequired,
          candidateProjectMapId: assignment.id,
          video: verification
            ? {
                verificationId: verification.id,
                documentId: verification.document.id,
                fileUrl: verification.document.fileUrl,
                fileName: verification.document.fileName,
                mimeType: verification.document.mimeType,
                status: verification.status,
                rejectionReason: verification.rejectionReason,
                uploadedAt: verification.document.createdAt,
              }
            : null,
        };
      }),
    );

    return items.filter(
      (item) => item.introductionVideoRequired || item.video !== null,
    );
  }

  async uploadIntroductionVideo(
    candidateId: string,
    projectId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { candidateProject } = await this.resolveAssignment(
      candidateId,
      projectId,
    );

    const existing = await this.findLatestIntroductionVideoVerification(
      candidateProject.id,
    );

    if (existing && !existing.isDeleted) {
      throw new BadRequestException(
        'An introduction video is already linked to this project. Use reupload to replace it.',
      );
    }

    const uploadResult = await this.uploadService.uploadIntroductionVideo(
      file,
      candidateId,
    );

    const roleCatalogId =
      candidateProject.roleNeeded?.roleCatalogId ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          candidateId,
          docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          roleCatalogId,
          uploadedBy: userId,
          status: DOCUMENT_STATUS.PENDING,
        },
      });

      const verification = await tx.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId: candidateProject.id,
          documentId: document.id,
          roleCatalogId,
          status: DOCUMENT_STATUS.PENDING,
        },
      });

      await tx.documentVerificationHistory.create({
        data: {
          verificationId: verification.id,
          action: DOCUMENT_STATUS.PENDING,
          performedBy: userId,
          notes: 'Introduction video uploaded',
        },
      });

      return { document, verification };
    });

    await this.publishSync(userId);

    return {
      introductionVideo: this.enrichVerification({
        ...result.verification,
        document: result.document,
      }),
    };
  }

  async reuseIntroductionVideo(
    candidateId: string,
    projectId: string,
    documentId: string,
    userId: string,
  ) {
    const { candidateProject } = await this.resolveAssignment(
      candidateId,
      projectId,
    );

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.candidateId !== candidateId) {
      throw new BadRequestException(
        'Document does not belong to this candidate',
      );
    }

    if (document.docType !== DOCUMENT_TYPE.INTRODUCTION_VIDEO) {
      throw new BadRequestException(
        'Only introduction video documents can be reused here',
      );
    }

    const existing = await this.findLatestIntroductionVideoVerification(
      candidateProject.id,
    );

    if (existing && !existing.isDeleted) {
      throw new BadRequestException(
        'An introduction video is already linked to this project',
      );
    }

    const roleCatalogId =
      candidateProject.roleNeeded?.roleCatalogId ?? null;

    const verification =
      await this.prisma.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId: candidateProject.id,
          documentId,
          roleCatalogId,
          status: DOCUMENT_STATUS.PENDING,
        },
      });

    await this.prisma.documentVerificationHistory.create({
      data: {
        verificationId: verification.id,
        action: DOCUMENT_STATUS.PENDING,
        performedBy: userId,
        notes: 'Introduction video linked from existing upload',
      },
    });

    await this.publishSync(userId);

    const enriched = await this.findLatestIntroductionVideoVerification(
      candidateProject.id,
    );

    return {
      introductionVideo: this.enrichVerification(enriched),
    };
  }

  async reuploadIntroductionVideo(
    candidateId: string,
    projectId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { candidateProject } = await this.resolveAssignment(
      candidateId,
      projectId,
    );

    const existing = await this.findLatestIntroductionVideoVerification(
      candidateProject.id,
    );

    if (!existing?.document) {
      throw new BadRequestException(
        'No introduction video found for this project. Upload one first.',
      );
    }

    const uploadResult = await this.uploadService.uploadIntroductionVideo(
      file,
      candidateId,
    );

    const result = await this.documentsService.reuploadRecruiter(
      existing.document.id,
      {
        candidateProjectMapId: candidateProject.id,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      },
      userId,
    );

    await this.publishSync(userId);

    const enriched = await this.findLatestIntroductionVideoVerification(
      candidateProject.id,
    );

    return {
      introductionVideo: this.enrichVerification(enriched),
      reupload: result,
    };
  }

  private async publishSync(userId: string) {
    try {
      await this.outboxService.publishDataSync({
        userId,
        type: 'RecruiterDocuments',
        id: 'LIST',
        message: 'Introduction video updated',
      });
    } catch (err) {
      this.logger.error(
        `Failed to publish data sync for introduction video: ${err.message}`,
      );
    }
  }
}
