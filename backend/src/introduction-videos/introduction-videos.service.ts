import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { DocumentsService } from '../documents/documents.service';
import { OutboxService } from '../notifications/outbox.service';
import { DOCUMENT_TYPE } from '../common/constants/document-types';
import { DOCUMENT_STATUS } from '../common/constants/statuses';
import { ListCandidateIntroductionVideosDto } from './dto/list-candidate-introduction-videos.dto';
import { ListReusableIntroductionVideosDto } from './dto/list-reusable-introduction-videos.dto';
import { InitiateIntroductionVideoUploadDto } from './dto/initiate-introduction-video-upload.dto';
import { ConfirmIntroductionVideoUploadDto } from './dto/confirm-introduction-video-upload.dto';

const INTRODUCTION_VIDEO_MAX_SIZE_MB = 100;
const INTRODUCTION_VIDEO_ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
];

@Injectable()
export class IntroductionVideosService {
  private readonly logger = new Logger(IntroductionVideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly documentsService: DocumentsService,
    private readonly outboxService: OutboxService,
  ) {}

  private slugifyForFileName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private buildIntroductionVideoFileName(
    candidate: { firstName: string },
    project: { title: string },
    originalExtension: string,
  ): string {
    const firstName = this.slugifyForFileName(candidate.firstName || 'candidate');
    const projectSlug = this.slugifyForFileName(project.title || 'project');
    const ext = (originalExtension || 'mp4').replace(/^\./, '').toLowerCase();
    return `${firstName}_${projectSlug}_intro_video.${ext}`;
  }

  private buildCandidateLibraryIntroductionVideoFileName(
    candidate: { firstName: string },
    originalExtension: string,
  ): string {
    const firstName = this.slugifyForFileName(candidate.firstName || 'candidate');
    const ext = (originalExtension || 'mp4').replace(/^\./, '').toLowerCase();
    return `${firstName}_intro_video.${ext}`;
  }

  private buildUniqueStorageFileName(friendlyBase: string, ext: string): string {
    const hash = crypto.randomBytes(4).toString('hex');
    return `${friendlyBase}_${Date.now()}_${hash}.${ext}`;
  }

  private buildIntroductionVideoNames(
    candidate: { firstName: string },
    originalExtension: string,
    project?: { title: string },
  ) {
    const ext = (originalExtension || 'mp4').replace(/^\./, '').toLowerCase();
    const friendlyFileName = project
      ? this.buildIntroductionVideoFileName(candidate, project, ext)
      : this.buildCandidateLibraryIntroductionVideoFileName(candidate, ext);
    const friendlyBase = friendlyFileName.replace(`.${ext}`, '');
    const storageFileName = this.buildUniqueStorageFileName(friendlyBase, ext);

    return { friendlyFileName, storageFileName, ext };
  }

  private validateIntroductionVideoMetadata(mimeType: string, fileSize: number) {
    if (!INTRODUCTION_VIDEO_ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${INTRODUCTION_VIDEO_ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const maxSizeBytes = INTRODUCTION_VIDEO_MAX_SIZE_MB * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum of ${INTRODUCTION_VIDEO_MAX_SIZE_MB}MB`,
      );
    }
  }

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
      select: { id: true, firstName: true },
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

    return { project, candidateProject, candidate };
  }

  private normalizeRemarks(remarks?: string): string | undefined {
    const trimmed = remarks?.trim();
    return trimmed ? trimmed : undefined;
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
            remarks: verification.document.notes ?? null,
          }
        : null,
    };
  }

  private async findLatestIntroductionVideoVerification(
    candidateProjectMapId: string,
  ) {
    return this.prisma.candidateProjectDocumentVerification.findFirst({
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

  async listCandidateIntroductionVideos(
    candidateId: string,
    query: ListCandidateIntroductionVideosDto = {},
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const libraryPage = query.libraryPage ?? 1;
    const libraryLimit = query.libraryLimit ?? 10;
    const { projectId, roleCatalogId } = query;

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const verificationWhere: Record<string, unknown> = {
      isDeleted: false,
      document: {
        docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
        isDeleted: false,
      },
      candidateProjectMap: {
        candidateId,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
        ...(roleCatalogId && roleCatalogId !== 'all'
          ? { roleNeeded: { roleCatalogId } }
          : {}),
      },
    };

    const allVerifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: verificationWhere as any,
        include: {
          document: true,
          candidateProjectMap: {
            include: {
              project: {
                select: {
                  id: true,
                  title: true,
                  introductionVideoRequired: true,
                },
              },
              roleNeeded: {
                select: {
                  roleCatalogId: true,
                  roleCatalog: {
                    select: { id: true, label: true, name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

    const latestByAssignment = new Map<string, (typeof allVerifications)[number]>();
    for (const verification of allVerifications) {
      if (!latestByAssignment.has(verification.candidateProjectMapId)) {
        latestByAssignment.set(verification.candidateProjectMapId, verification);
      }
    }

    const allItems = Array.from(latestByAssignment.values()).map(
      (verification) => {
        const assignment = verification.candidateProjectMap;

        return {
          projectId: assignment.project.id,
          projectTitle: assignment.project.title,
          roleCatalogId: assignment.roleNeeded?.roleCatalogId ?? null,
          roleLabel:
            assignment.roleNeeded?.roleCatalog?.label ??
            assignment.roleNeeded?.roleCatalog?.name ??
            null,
          introductionVideoRequired:
            assignment.project.introductionVideoRequired,
          candidateProjectMapId: assignment.id,
          video: {
            verificationId: verification.id,
            documentId: verification.document.id,
            fileUrl: verification.document.fileUrl,
            fileName: verification.document.fileName,
            mimeType: verification.document.mimeType,
            status: verification.status,
            rejectionReason: verification.rejectionReason,
            uploadedAt: verification.document.createdAt,
            remarks: verification.document.notes ?? null,
          },
        };
      },
    );

    const total = allItems.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const items = allItems.slice(skip, skip + limit);
    const libraryResult = await this.listLibraryIntroductionVideos(
      candidateId,
      libraryPage,
      libraryLimit,
    );

    return {
      items,
      library: libraryResult.items,
      libraryPagination: libraryResult.pagination,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async listReusableIntroductionVideos(
    candidateId: string,
    query: ListReusableIntroductionVideosDto = {},
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const where: Record<string, unknown> = {
      candidateId,
      docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
      isDeleted: false,
    };

    if (query.excludeProjectId) {
      where.NOT = {
        verifications: {
          some: {
            isDeleted: false,
            candidateProjectMap: {
              projectId: query.excludeProjectId,
            },
          },
        },
      };
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { fileName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          fileSize: true,
          status: true,
          notes: true,
          createdAt: true,
          verifications: {
            where: { isDeleted: false },
            select: {
              candidateProjectMap: {
                select: {
                  project: {
                    select: { id: true, title: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.document.count({ where: where as any }),
    ]);

    const items = documents.map((document) => {
      const linkedProjectsMap = new Map<string, string>();
      for (const verification of document.verifications) {
        const project = verification.candidateProjectMap?.project;
        if (project) {
          linkedProjectsMap.set(project.id, project.title);
        }
      }

      const linkedProjects = Array.from(linkedProjectsMap.entries()).map(
        ([projectId, projectTitle]) => ({
          projectId,
          projectTitle,
        }),
      );

      return {
        documentId: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        status: document.status,
        remarks: document.notes ?? null,
        uploadedAt: document.createdAt,
        isLibrary: linkedProjects.length === 0,
        linkedProjects,
      };
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private async listLibraryIntroductionVideos(
    candidateId: string,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;
    const where = {
      candidateId,
      docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
      isDeleted: false,
      NOT: {
        verifications: {
          some: { isDeleted: false },
        },
      },
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          fileSize: true,
          status: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items: documents.map((document) => ({
        documentId: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        status: document.status,
        uploadedAt: document.createdAt,
        remarks: document.notes ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async uploadCandidateIntroductionVideo(
    candidateId: string,
    file: Express.Multer.File,
    userId: string,
    remarks?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, firstName: true },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const originalExtension = file.originalname.split('.').pop() || 'mp4';
    const { friendlyFileName, storageFileName } =
      this.buildIntroductionVideoNames(candidate, originalExtension);

    const uploadResult = await this.uploadService.uploadIntroductionVideo(
      file,
      candidateId,
      storageFileName,
    );

    const document = await this.prisma.document.create({
      data: {
        candidateId,
        docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
        fileName: friendlyFileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        uploadedBy: userId,
        status: DOCUMENT_STATUS.PENDING,
        notes: this.normalizeRemarks(remarks),
      },
    });

    await this.publishSync(userId);

    return {
      document: {
        id: document.id,
        docType: document.docType,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        status: document.status,
        uploadedBy: document.uploadedBy,
        createdAt: document.createdAt,
        remarks: document.notes ?? null,
      },
    };
  }

  async uploadIntroductionVideo(
    candidateId: string,
    projectId: string,
    file: Express.Multer.File,
    userId: string,
    remarks?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { project, candidateProject, candidate } = await this.resolveAssignment(
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

    const originalExtension = file.originalname.split('.').pop() || 'mp4';
    const { friendlyFileName, storageFileName } =
      this.buildIntroductionVideoNames(candidate, originalExtension, project);

    const uploadResult = await this.uploadService.uploadIntroductionVideo(
      file,
      candidateId,
      storageFileName,
    );

    const roleCatalogId =
      candidateProject.roleNeeded?.roleCatalogId ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          candidateId,
          docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
          fileName: friendlyFileName,
          fileUrl: uploadResult.fileUrl,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          roleCatalogId,
          uploadedBy: userId,
          status: DOCUMENT_STATUS.PENDING,
          notes: this.normalizeRemarks(remarks),
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
    const { project, candidateProject, candidate } = await this.resolveAssignment(
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

    const friendlyFileName = this.buildIntroductionVideoFileName(
      candidate,
      project,
      document.fileName.split('.').pop() || 'mp4',
    );

    await this.prisma.document.update({
      where: { id: documentId },
      data: { fileName: friendlyFileName },
    });

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
    remarks?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { project, candidateProject, candidate } = await this.resolveAssignment(
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

    const originalExtension = file.originalname.split('.').pop() || 'mp4';
    const { friendlyFileName, storageFileName } =
      this.buildIntroductionVideoNames(candidate, originalExtension, project);

    const uploadResult = await this.uploadService.uploadIntroductionVideo(
      file,
      candidateId,
      storageFileName,
    );

    const result = await this.documentsService.reuploadRecruiter(
      existing.document.id,
      {
        candidateProjectMapId: candidateProject.id,
        fileName: friendlyFileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      },
      userId,
    );

    const normalizedRemarks = this.normalizeRemarks(remarks);
    if (normalizedRemarks && result?.updatedDocument?.id) {
      await this.prisma.document.update({
        where: { id: result.updatedDocument.id },
        data: { notes: normalizedRemarks },
      });
    }

    await this.publishSync(userId);

    const enriched = await this.findLatestIntroductionVideoVerification(
      candidateProject.id,
    );

    return {
      introductionVideo: this.enrichVerification(enriched),
      reupload: result,
    };
  }

  async initiateIntroductionVideoUpload(
    candidateId: string,
    dto: InitiateIntroductionVideoUploadDto,
    _userId: string,
  ) {
    this.validateIntroductionVideoMetadata(dto.mimeType, dto.fileSize);

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, firstName: true },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    let project: { title: string } | undefined;
    if (dto.projectId) {
      const resolved = await this.resolveAssignment(candidateId, dto.projectId);
      project = resolved.project;

      const existing = await this.findLatestIntroductionVideoVerification(
        resolved.candidateProject.id,
      );

      if (dto.mode === 'reupload') {
        if (!existing?.document) {
          throw new BadRequestException(
            'No introduction video found for this project. Upload one first.',
          );
        }
      } else if (existing && !existing.isDeleted) {
        throw new BadRequestException(
          'An introduction video is already linked to this project. Use reupload to replace it.',
        );
      }
    }

    const originalExtension = dto.fileName.split('.').pop() || 'mp4';
    const { friendlyFileName, storageFileName } =
      this.buildIntroductionVideoNames(candidate, originalExtension, project);
    const storageKey = this.uploadService.getIntroductionVideoStorageKey(
      candidateId,
      storageFileName,
    );
    const expiresIn = 3600;
    const uploadUrl = await this.uploadService.createPresignedPutUrl(
      storageKey,
      dto.mimeType,
      expiresIn,
    );

    return {
      uploadUrl,
      storageKey,
      fileUrl: this.uploadService.getPublicUrlForKey(storageKey),
      fileName: friendlyFileName,
      expiresIn,
    };
  }

  async confirmIntroductionVideoUpload(
    candidateId: string,
    dto: ConfirmIntroductionVideoUploadDto,
    userId: string,
  ) {
    this.validateIntroductionVideoMetadata(dto.mimeType, dto.fileSize);

    const expectedPrefix = `${this.uploadService.getIntroductionVideoFolder(candidateId)}/`;
    if (!dto.storageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid storage key for this candidate');
    }

    const head = await this.uploadService.headObject(dto.storageKey);
    if (head.contentLength !== dto.fileSize) {
      throw new BadRequestException(
        'Uploaded file size does not match the expected size',
      );
    }

    const fileUrl = this.uploadService.getPublicUrlForKey(dto.storageKey);
    const remarks = this.normalizeRemarks(dto.remarks);

    if (dto.projectId) {
      const { candidateProject } = await this.resolveAssignment(
        candidateId,
        dto.projectId,
      );
      const roleCatalogId =
        candidateProject.roleNeeded?.roleCatalogId ?? null;

      if (dto.mode === 'reupload') {
        const existing = await this.findLatestIntroductionVideoVerification(
          candidateProject.id,
        );

        if (!existing?.document) {
          throw new BadRequestException(
            'No introduction video found for this project. Upload one first.',
          );
        }

        const result = await this.documentsService.reuploadRecruiter(
          existing.document.id,
          {
            candidateProjectMapId: candidateProject.id,
            fileName: dto.fileName,
            fileUrl,
            fileSize: dto.fileSize,
            mimeType: dto.mimeType,
            notes: remarks,
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

      const existing = await this.findLatestIntroductionVideoVerification(
        candidateProject.id,
      );

      if (existing && !existing.isDeleted) {
        throw new BadRequestException(
          'An introduction video is already linked to this project. Use reupload to replace it.',
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const document = await tx.document.create({
          data: {
            candidateId,
            docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
            fileName: dto.fileName,
            fileUrl,
            fileSize: dto.fileSize,
            mimeType: dto.mimeType,
            roleCatalogId,
            uploadedBy: userId,
            status: DOCUMENT_STATUS.PENDING,
            notes: remarks,
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

    const document = await this.prisma.document.create({
      data: {
        candidateId,
        docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
        fileName: dto.fileName,
        fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        uploadedBy: userId,
        status: DOCUMENT_STATUS.PENDING,
        notes: remarks,
      },
    });

    await this.publishSync(userId);

    return {
      document: {
        id: document.id,
        docType: document.docType,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        status: document.status,
        uploadedBy: document.uploadedBy,
        createdAt: document.createdAt,
        remarks: document.notes ?? null,
      },
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
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to publish data sync for introduction video: ${message}`,
      );
    }
  }
}
