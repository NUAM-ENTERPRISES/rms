import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QualificationLevel } from '@prisma/client';
import { Queue } from 'bullmq';
import { DOCUMENT_TYPE } from '../../common/constants/document-types';
import { CandidateQualificationService } from '../../candidates/candidate-qualification.service';
import { WorkExperienceService } from '../../candidates/work-experience.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateDocumentDto } from '../../documents/dto/create-document.dto';
import { DocumentsService } from '../../documents/documents.service';
import { UploadCompressionService } from '../../upload/upload-compression.service';
import { UploadService } from '../../upload/upload.service';
import {
  BUNDLE_STATUS,
  DOCUMENT_CLASSIFICATION_JOB,
  DOCUMENT_CLASSIFICATION_QUEUE,
  DocumentClassificationJobData,
  MAX_BUNDLE_FILE_BYTES,
  SEGMENT_STATUS,
} from '../constants/candidate-import.constants';
import { UpdateBundleProfileSuggestionsDto } from '../dto/update-bundle-profile-suggestions.dto';
import { UpdateBundleSegmentDto } from '../dto/update-bundle-segment.dto';
import {
  BundleProfileSuggestions,
  BundleQualificationSuggestion,
  BundleResumeRoleSuggestion,
  BundleWorkExperienceSuggestion,
  emptyProfileSuggestions,
} from '../types/bundle-profile-suggestions';
import { extractPdfPages, renderPdfPagesToJpeg } from '../utils/pdf-pages.util';
import { CatalogApprovalService } from './catalog-approval.service';
import { MergedPdfClassifierService } from './merged-pdf-classifier.service';
import { MergedPdfProfileExtractorService } from './merged-pdf-profile-extractor.service';
import {
  filterApplyableSaveableSegments,
  hasResumeRole,
  identityProfileUpdate,
  usablePassportExpiry,
  isPassportPhotoType,
  PASSPORT_PHOTO_MAX_BYTES,
} from './bundle-apply.util';
import { PDFDocument } from 'pdf-lib';

/** Doc types DocumentsService refuses to create without a role catalog. */
const RESUME_DOC_TYPES = new Set<string>(
  [DOCUMENT_TYPE.RESUME, DOCUMENT_TYPE.CV].filter(Boolean) as string[],
);

const EXPERIENCE_CERT_TYPES = new Set<string>(
  [
    DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
    DOCUMENT_TYPE.EXPERIENCE_CERTIFICATES,
  ].filter(Boolean) as string[],
);

export interface ApplyBundleResult {
  applied: number;
  failed: number;
  qualificationsCreated: number;
  workExperiencesCreated: number;
  profileErrors: string[];
  documents: Array<{
    segmentId: string;
    documentId?: string;
    docType: string;
    error?: string;
  }>;
}

/**
 * Manages merged-PDF bundles: upload, AI classification, profile extraction,
 * review and apply.
 *
 * Page-range splits for recruiter preview never create documents. Saving still
 * splits only confirmed allow-listed segments, so a wrong suggestion never
 * reaches the candidate's document list.
 */
@Injectable()
export class DocumentBundleService {
  private readonly logger = new Logger(DocumentBundleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly documentsService: DocumentsService,
    private readonly classifier: MergedPdfClassifierService,
    private readonly profileExtractor: MergedPdfProfileExtractorService,
    private readonly catalogApproval: CatalogApprovalService,
    private readonly candidateQualifications: CandidateQualificationService,
    private readonly workExperiences: WorkExperienceService,
    private readonly compression: UploadCompressionService,
    @InjectQueue(DOCUMENT_CLASSIFICATION_QUEUE)
    private readonly queue: Queue<DocumentClassificationJobData>,
  ) {}

  async createBundle(
    candidateId: string,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    if (!file) throw new BadRequestException('A PDF file is required.');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF bundles can be classified.');
    }
    if (file.size > MAX_BUNDLE_FILE_BYTES) {
      throw new BadRequestException(
        `File is larger than ${Math.round(MAX_BUNDLE_FILE_BYTES / 1024 / 1024)}MB.`,
      );
    }

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    const upload = await this.uploadService.uploadFile(
      file,
      `candidates/document-bundles/${candidateId}`,
      ['application/pdf'],
      MAX_BUNDLE_FILE_BYTES / 1024 / 1024,
    );

    const bundle = await this.prisma.candidateDocumentBundle.create({
      data: {
        candidateId,
        fileUrl: upload.fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        status: BUNDLE_STATUS.QUEUED,
        uploadedById,
      },
      select: { id: true, status: true, fileName: true },
    });

    await this.queue.add(DOCUMENT_CLASSIFICATION_JOB, { bundleId: bundle.id });

    this.logger.log(
      `Queued document bundle ${bundle.id} for candidate ${candidateId}.`,
    );
    return bundle;
  }

  /**
   * Reads the PDF, asks Vertex to segment it, extracts profile suggestions,
   * and stores both for review.
   */
  async classifyBundle(bundleId: string): Promise<void> {
    const bundle = await this.prisma.candidateDocumentBundle.findUnique({
      where: { id: bundleId },
      select: {
        id: true,
        fileUrl: true,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            passportNumber: true,
          },
        },
      },
    });
    if (!bundle) {
      this.logger.warn(`Bundle ${bundleId} vanished before classification.`);
      return;
    }

    try {
      await this.prisma.candidateDocumentBundle.update({
        where: { id: bundleId },
        data: { status: BUNDLE_STATUS.ANALYZING, error: null },
      });

      const buffer = await this.uploadService.getFile(bundle.fileUrl);
      const pages = await extractPdfPages(buffer);

      const candidate = bundle.candidate;
      const fullName =
        `${candidate.firstName} ${candidate.lastName ?? ''}`.trim();
      const segments = await this.classifier.classify(pages, {
        fullName,
        passportNumber: candidate.passportNumber,
      });

      await this.prisma.candidateDocumentBundleSegment.deleteMany({
        where: { bundleId, status: { not: SEGMENT_STATUS.APPLIED } },
      });

      const createdSegments: Array<{
        id: string;
        startPage: number;
        endPage: number;
        docType: string;
      }> = [];

      for (const [index, segment] of segments.entries()) {
        const row = await this.prisma.candidateDocumentBundleSegment.create({
          data: {
            bundleId,
            startPage: segment.startPage,
            endPage: segment.endPage,
            docType: segment.docType,
            docName: segment.docName ?? null,
            confidence: segment.confidence,
            extracted: segment.extracted as unknown as Prisma.InputJsonValue,
            warnings: this.classifier.buildWarnings(segment, {
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              passportNumber: candidate.passportNumber,
            }) as unknown as Prisma.InputJsonValue,
            status: SEGMENT_STATUS.SUGGESTED,
            sortOrder: index,
          },
          select: {
            id: true,
            startPage: true,
            endPage: true,
            docType: true,
          },
        });
        createdSegments.push(row);
      }

      const profileSuggestions = await this.profileExtractor.extract(
        pages,
        createdSegments,
        { fullName },
      );

      await this.backfillPassportSegments(
        bundleId,
        profileSuggestions.identity,
      );

      await this.prisma.candidateDocumentBundle.update({
        where: { id: bundleId },
        data: {
          status: BUNDLE_STATUS.REVIEW,
          pageCount: pages.length,
          profileSuggestions:
            profileSuggestions as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Bundle ${bundleId}: ${pages.length} pages → ${createdSegments.length} docs, ${profileSuggestions.qualifications.length} quals, ${profileSuggestions.workExperiences.length} jobs.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown classification error.';
      this.logger.error(`Bundle ${bundleId} classification failed: ${message}`);
      await this.prisma.candidateDocumentBundle.update({
        where: { id: bundleId },
        data: { status: BUNDLE_STATUS.FAILED, error: message },
      });
    }
  }

  async getBundle(bundleId: string) {
    const bundle = await this.prisma.candidateDocumentBundle.findUnique({
      where: { id: bundleId },
      include: {
        segments: { orderBy: { sortOrder: 'asc' } },
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true, dateOfBirth: true, passportNumber: true },
        },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    if (!bundle) throw new NotFoundException('Document bundle not found.');
    return bundle;
  }

  /**
   * Splits one page range out of the merged PDF so the recruiter can preview
   * a single detected document without seeing the rest of the bundle.
   */
  async previewPages(
    bundleId: string,
    startPage: number,
    endPage: number,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const bundle = await this.prisma.candidateDocumentBundle.findUnique({
      where: { id: bundleId },
      select: {
        fileUrl: true,
        fileName: true,
        candidate: { select: { firstName: true, lastName: true } },
      },
    });
    if (!bundle) throw new NotFoundException('Document bundle not found.');
    if (endPage < startPage) {
      throw new BadRequestException('endPage must not be before startPage.');
    }

    const sourceBytes = await this.uploadService.getFile(bundle.fileUrl);
    const source = await PDFDocument.load(sourceBytes);
    const pageCount = source.getPageCount();
    const start = Math.max(1, startPage);
    const end = Math.min(pageCount, endPage);
    if (end < start) {
      throw new BadRequestException(
        `Page range ${startPage}-${endPage} is outside this ${pageCount}-page file.`,
      );
    }

    const split = await this.materializePdfSplit(
      source,
      start,
      end,
      bundle.candidate,
      'preview',
    );

    return { buffer: split.buffer, fileName: split.fileName };
  }

  async listBundles(candidateId: string) {
    return this.prisma.candidateDocumentBundle.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: { segments: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateSegment(
    bundleId: string,
    segmentId: string,
    dto: UpdateBundleSegmentDto,
  ) {
    const segment = await this.prisma.candidateDocumentBundleSegment.findFirst({
      where: { id: segmentId, bundleId },
      select: { id: true, status: true },
    });
    if (!segment) throw new NotFoundException('Segment not found.');
    if (segment.status === SEGMENT_STATUS.APPLIED) {
      throw new BadRequestException(
        'This segment has already been saved as a document.',
      );
    }

    const bundle = await this.prisma.candidateDocumentBundle.findUnique({
      where: { id: bundleId },
      select: { pageCount: true },
    });

    if (dto.startPage !== undefined && dto.endPage !== undefined) {
      if (dto.endPage < dto.startPage) {
        throw new BadRequestException(
          'endPage must not be before startPage.',
        );
      }
      if (bundle?.pageCount && dto.endPage > bundle.pageCount) {
        throw new BadRequestException(
          `endPage exceeds the ${bundle.pageCount}-page document.`,
        );
      }
    }

    return this.prisma.candidateDocumentBundleSegment.update({
      where: { id: segmentId },
      data: {
        ...(dto.startPage !== undefined ? { startPage: dto.startPage } : {}),
        ...(dto.endPage !== undefined ? { endPage: dto.endPage } : {}),
        ...(dto.docType !== undefined ? { docType: dto.docType } : {}),
        ...(dto.docName !== undefined ? { docName: dto.docName } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.extracted !== undefined
          ? { extracted: dto.extracted as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async updateProfileSuggestions(
    bundleId: string,
    dto: UpdateBundleProfileSuggestionsDto,
  ): Promise<BundleProfileSuggestions> {
    const bundle = await this.prisma.candidateDocumentBundle.findUnique({
      where: { id: bundleId },
      select: { id: true, status: true, segments: { select: { id: true } } },
    });
    if (!bundle) throw new NotFoundException('Document bundle not found.');
    if (
      bundle.status === BUNDLE_STATUS.APPLIED ||
      bundle.status === BUNDLE_STATUS.FAILED
    ) {
      throw new BadRequestException(
        'Profile suggestions can only be edited while the bundle is in review.',
      );
    }

    const segmentIds = new Set(bundle.segments.map((segment) => segment.id));
    const profileSuggestions: BundleProfileSuggestions = {
      qualifications: dto.qualifications.map((row) => ({
        ...row,
        qualificationId: row.qualificationId ?? null,
        proposedNew: row.proposedNew ?? null,
        university: row.university ?? null,
        graduationYear: row.graduationYear ?? null,
        notes: row.notes ?? null,
      })),
      workExperiences: dto.workExperiences.map((row) => ({
        ...row,
        roleDepartmentId: row.roleDepartmentId ?? null,
        roleCatalogId: row.roleCatalogId ?? null,
        proposedDepartment: row.proposedDepartment ?? null,
        proposedRole: row.proposedRole ?? null,
        companyName: row.companyName ?? null,
        endDate: row.endDate ?? null,
        notes: row.notes ?? null,
        linkedSegmentIds: (row.linkedSegmentIds ?? []).filter((id) =>
          segmentIds.has(id),
        ),
      })),
      resumeRole: dto.resumeRole
        ? {
            departmentId: dto.resumeRole.departmentId ?? null,
            roleCatalogId: dto.resumeRole.roleCatalogId ?? null,
            departmentLabel: dto.resumeRole.departmentLabel ?? null,
            roleLabel: dto.resumeRole.roleLabel ?? null,
            proposedDepartment: dto.resumeRole.proposedDepartment ?? null,
            proposedRole: dto.resumeRole.proposedRole ?? null,
            docName: dto.resumeRole.docName ?? null,
          }
        : null,
      identity: dto.identity
        ? {
            dateOfBirth: dto.identity.dateOfBirth ?? null,
            email: dto.identity.email ?? null,
            passportNumber: dto.identity.passportNumber ?? null,
            passportExpiry: dto.identity.passportExpiry ?? null,
            identityEdited: Boolean(dto.identity.identityEdited),
          }
        : null,
    };

    this.assertProfileSuggestionsValid(profileSuggestions);

    await this.prisma.candidateDocumentBundle.update({
      where: { id: bundleId },
      data: {
        profileSuggestions:
          profileSuggestions as unknown as Prisma.InputJsonValue,
      },
    });

    return profileSuggestions;
  }

  /**
   * Splits the bundle, creates documents, and saves included profile rows.
   */
  async applyBundle(
    bundleId: string,
    userId: string,
  ): Promise<ApplyBundleResult> {
    const bundle = await this.prisma.candidateDocumentBundle.findUnique({
      where: { id: bundleId },
      include: {
        segments: { orderBy: { sortOrder: 'asc' } },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
            passportNumber: true,
          },
        },
      },
    });
    if (!bundle) throw new NotFoundException('Document bundle not found.');

    const profile = (bundle.profileSuggestions ??
      emptyProfileSuggestions()) as BundleProfileSuggestions;
    const includedQuals = (profile.qualifications ?? []).filter(
      (row) => row.included,
    );
    const includedJobs = (profile.workExperiences ?? []).filter(
      (row) => row.included,
    );

    const confirmed = filterApplyableSaveableSegments(bundle.segments);
    if (
      confirmed.length === 0 &&
      includedQuals.length === 0 &&
      includedJobs.length === 0
    ) {
      throw new BadRequestException(
        'Confirm at least one document or include a qualification / work experience before saving.',
      );
    }

    const resumeConfirmed = confirmed.some((segment) =>
      RESUME_DOC_TYPES.has(segment.docType),
    );
    if (resumeConfirmed && !hasResumeRole(profile.resumeRole)) {
      throw new BadRequestException(
        'Resume needs a department and role before it can be saved. Skip the resume or choose a role.',
      );
    }

    this.assertProfileSuggestionsValid({
      qualifications: includedQuals,
      workExperiences: includedJobs,
      resumeRole: profile.resumeRole,
      identity: profile.identity,
    });

    const profileErrors: string[] = [];
    let qualificationsCreated = 0;
    let workExperiencesCreated = 0;

    // Create work experiences before documents so experience certs can link.
    const segmentToWorkExperienceId = new Map<string, string>();

    for (const job of includedJobs) {
      try {
        const workId = await this.applyWorkExperience(
          bundle.candidateId,
          job,
          userId,
        );
        workExperiencesCreated += 1;
        for (const segmentId of job.linkedSegmentIds ?? []) {
          segmentToWorkExperienceId.set(segmentId, workId);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown work experience error.';
        profileErrors.push(`Work experience "${job.jobTitleRaw}": ${message}`);
      }
    }

    for (const qual of includedQuals) {
      try {
        await this.applyQualification(bundle.candidateId, qual, userId);
        qualificationsCreated += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown qualification error.';
        profileErrors.push(`Qualification "${qual.rawLabel}": ${message}`);
      }
    }

    try {
      await this.applyIdentity(bundle.candidateId, profile.identity);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown identity error.';
      profileErrors.push(`Profile identity: ${message}`);
    }

    let resumeRoleCatalogId: string | null = null;
    if (resumeConfirmed) {
      try {
        resumeRoleCatalogId = await this.resolveResumeRoleCatalogId(
          profile.resumeRole,
          userId,
        );
        if (resumeRoleCatalogId) {
          await this.ensureRolePreference(
            bundle.candidateId,
            resumeRoleCatalogId,
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown resume role error.';
        throw new BadRequestException(`Resume role: ${message}`);
      }
    }

    const results: ApplyBundleResult['documents'] = [];

    if (confirmed.length > 0) {
      const sourceBytes = await this.uploadService.getFile(bundle.fileUrl);
      const source = await PDFDocument.load(sourceBytes);
      const pageCount = source.getPageCount();

      for (const segment of confirmed) {
        try {
          const start = Math.max(1, segment.startPage);
          const end = Math.min(pageCount, segment.endPage);
          if (end < start) {
            throw new Error(
              `Page range ${segment.startPage}-${segment.endPage} is outside this ${pageCount}-page file.`,
            );
          }

          const extracted = {
            ...((segment.extracted ?? {}) as Record<string, string | null>),
          };
          if (segment.docType === DOCUMENT_TYPE.PASSPORT_COPY) {
            extracted.documentNumber =
              extracted.documentNumber?.trim() ||
              profile.identity?.passportNumber?.trim() ||
              null;
            extracted.expiryDate =
              usablePassportExpiry(extracted.expiryDate) ||
              usablePassportExpiry(profile.identity?.passportExpiry);
          }

          if (RESUME_DOC_TYPES.has(segment.docType) && !resumeRoleCatalogId) {
            throw new Error(
              'Resume needs a department and role before it can be saved.',
            );
          }

          const file = isPassportPhotoType(segment.docType)
            ? await this.materializePassportPhoto(
                sourceBytes,
                start,
                bundle.candidate,
                segment.docType,
              )
            : await this.materializePdfSplit(
                source,
                start,
                end,
                bundle.candidate,
                segment.docType,
              );

          const upload = await this.uploadService.uploadFile(
            {
              buffer: file.buffer,
              originalname: file.fileName,
              mimetype: file.mimeType,
              size: file.buffer.length,
            } as Express.Multer.File,
            `candidates/documents/${bundle.candidateId}/${segment.docType}`,
            file.allowedMimeTypes,
            file.maxSizeMb,
          );

          const linkedWorkId = EXPERIENCE_CERT_TYPES.has(segment.docType)
            ? segmentToWorkExperienceId.get(segment.id)
            : undefined;

          const createDto: CreateDocumentDto = {
            candidateId: bundle.candidateId,
            docType: segment.docType,
            docName:
              (RESUME_DOC_TYPES.has(segment.docType)
                ? profile.resumeRole?.docName
                : null) ??
              segment.docName ??
              undefined,
            fileName: file.fileName,
            fileUrl: upload.fileUrl,
            fileSize: file.buffer.length,
            mimeType: file.mimeType,
            documentNumber: extracted.documentNumber ?? undefined,
            issuedAt: extracted.issuedAt ?? undefined,
            expiryDate: extracted.expiryDate ?? undefined,
            notes: `Split from ${bundle.fileName}, pages ${segment.startPage}-${segment.endPage}.`,
            ...(RESUME_DOC_TYPES.has(segment.docType) && resumeRoleCatalogId
              ? { roleCatalogId: resumeRoleCatalogId }
              : {}),
            ...(linkedWorkId ? { workExperienceId: linkedWorkId } : {}),
          };

          const document = await this.documentsService.create(createDto, userId);

          await this.prisma.candidateDocumentBundleSegment.update({
            where: { id: segment.id },
            data: {
              status: SEGMENT_STATUS.APPLIED,
              documentId: document.id,
              error: null,
            },
          });

          results.push({
            segmentId: segment.id,
            documentId: document.id,
            docType: segment.docType,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error.';
          await this.prisma.candidateDocumentBundleSegment.update({
            where: { id: segment.id },
            data: { status: SEGMENT_STATUS.FAILED, error: message },
          });
          results.push({
            segmentId: segment.id,
            docType: segment.docType,
            error: message,
          });
        }
      }
    }

    const applied = results.filter((result) => result.documentId).length;

    await this.prisma.candidateDocumentBundle.update({
      where: { id: bundleId },
      data: {
        status: BUNDLE_STATUS.APPLIED,
        appliedAt: new Date(),
      },
    });

    this.logger.log(
      `Bundle ${bundleId} applied by ${userId}: ${applied} docs, ${qualificationsCreated} quals, ${workExperiencesCreated} jobs.`,
    );

    return {
      applied,
      failed: results.length - applied,
      qualificationsCreated,
      workExperiencesCreated,
      profileErrors,
      documents: results,
    };
  }

  private assertProfileSuggestionsValid(
    profile: BundleProfileSuggestions,
  ): void {
    for (const qual of profile.qualifications) {
      if (!qual.included) continue;
      if (!qual.qualificationId && !qual.proposedNew?.name) {
        throw new BadRequestException(
          `Qualification "${qual.rawLabel}" needs a catalog match or a proposed new value.`,
        );
      }
      if (qual.proposedNew && !qual.qualificationId) {
        if (!qual.proposedNew.level || !qual.proposedNew.field) {
          throw new BadRequestException(
            `New qualification "${qual.proposedNew.name}" needs level and field.`,
          );
        }
      }
    }

    for (const job of profile.workExperiences) {
      if (!job.included) continue;
      if (!job.departmentRaw?.trim() || !job.jobTitleRaw?.trim()) {
        throw new BadRequestException(
          'Each work experience needs a department and job title.',
        );
      }
      if (
        !job.roleDepartmentId &&
        !job.proposedDepartment?.name &&
        !job.roleCatalogId
      ) {
        throw new BadRequestException(
          `Work experience "${job.jobTitleRaw}" needs a department match or proposal.`,
        );
      }
      if (!job.roleCatalogId && !job.proposedRole?.label) {
        throw new BadRequestException(
          `Work experience "${job.jobTitleRaw}" needs a job title match or proposal.`,
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(job.startDate)) {
        throw new BadRequestException(
          `Work experience "${job.jobTitleRaw}" needs a valid start date.`,
        );
      }
      if (job.isCurrent) {
        if (job.endDate) {
          throw new BadRequestException(
            `Current role "${job.jobTitleRaw}" cannot have an end date.`,
          );
        }
      } else if (!job.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(job.endDate)) {
        throw new BadRequestException(
          `Work experience "${job.jobTitleRaw}" needs an end date, or mark it as current.`,
        );
      }
    }
  }

  private async applyQualification(
    candidateId: string,
    suggestion: BundleQualificationSuggestion,
    userId: string,
  ): Promise<void> {
    let qualificationId = suggestion.qualificationId;

    if (!qualificationId && suggestion.proposedNew) {
      try {
        const created = await this.catalogApproval.approve(
          {
            target: 'qualification',
            value: suggestion.proposedNew.name,
            level: suggestion.proposedNew.level as QualificationLevel,
            field: suggestion.proposedNew.field,
            shortName: suggestion.proposedNew.shortName,
          },
          userId,
        );
        qualificationId = created.id;
      } catch (error) {
        if (error instanceof ConflictException) {
          const existing = await this.prisma.qualification.findFirst({
            where: {
              name: {
                equals: suggestion.proposedNew.name,
                mode: 'insensitive',
              },
            },
            select: { id: true },
          });
          if (!existing) throw error;
          qualificationId = existing.id;
        } else {
          throw error;
        }
      }
    }

    if (!qualificationId) {
      throw new BadRequestException('No qualification to attach.');
    }

    try {
      await this.candidateQualifications.create({
        candidateId,
        qualificationId,
        university: suggestion.university ?? undefined,
        graduationYear: suggestion.graduationYear ?? undefined,
        notes: suggestion.notes ?? undefined,
        isCompleted: true,
      });
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        String(error.message).includes('already has this qualification')
      ) {
        return;
      }
      throw error;
    }
  }

  private async applyWorkExperience(
    candidateId: string,
    suggestion: BundleWorkExperienceSuggestion,
    userId: string,
  ): Promise<string> {
    let roleDepartmentId = suggestion.roleDepartmentId;

    if (!roleDepartmentId && suggestion.proposedDepartment?.name) {
      try {
        const created = await this.catalogApproval.approve(
          {
            target: 'role_department',
            value: suggestion.proposedDepartment.name,
            label: suggestion.proposedDepartment.name,
          },
          userId,
        );
        roleDepartmentId = created.id;
      } catch (error) {
        if (error instanceof ConflictException) {
          const existing = await this.prisma.roleDepartment.findFirst({
            where: {
              OR: [
                {
                  label: {
                    equals: suggestion.proposedDepartment.name,
                    mode: 'insensitive',
                  },
                },
                {
                  name: {
                    equals: suggestion.departmentRaw,
                    mode: 'insensitive',
                  },
                },
              ],
            },
            select: { id: true },
          });
          if (!existing) throw error;
          roleDepartmentId = existing.id;
        } else {
          throw error;
        }
      }
    }

    let roleCatalogId = suggestion.roleCatalogId;

    if (!roleCatalogId && suggestion.proposedRole?.label) {
      if (!roleDepartmentId) {
        throw new BadRequestException(
          `Cannot create job title "${suggestion.proposedRole.label}" without a department.`,
        );
      }
      try {
        const created = await this.catalogApproval.approve(
          {
            target: 'role_catalog',
            value: suggestion.proposedRole.label,
            label: suggestion.proposedRole.label,
            roleDepartmentId,
          },
          userId,
        );
        roleCatalogId = created.id;
      } catch (error) {
        if (error instanceof ConflictException) {
          const existing = await this.prisma.roleCatalog.findFirst({
            where: {
              label: {
                equals: suggestion.proposedRole.label,
                mode: 'insensitive',
              },
            },
            select: { id: true },
          });
          if (!existing) throw error;
          roleCatalogId = existing.id;
        } else {
          throw error;
        }
      }
    }

    const created = await this.workExperiences.create({
      candidateId,
      jobTitle: suggestion.jobTitleRaw,
      roleCatalogId: roleCatalogId ?? undefined,
      companyName: suggestion.companyName ?? undefined,
      startDate: `${suggestion.startDate}T00:00:00.000Z`,
      endDate:
        suggestion.isCurrent || !suggestion.endDate
          ? undefined
          : `${suggestion.endDate}T00:00:00.000Z`,
      isCurrent: suggestion.isCurrent,
      description: suggestion.notes ?? undefined,
    });

    return created.id;
  }

  /**
   * The profile pass often reads the passport number from the resume or a
   * DataFlow report after the classifier left the scanned bio page blank.
   * Copy those values onto the passport segment so the wizard fields fill in.
   */
  private async backfillPassportSegments(
    bundleId: string,
    identity: BundleProfileSuggestions['identity'],
  ): Promise<void> {
    if (!identity?.passportNumber && !identity?.passportExpiry) return;

    const segments = await this.prisma.candidateDocumentBundleSegment.findMany({
      where: { bundleId, docType: DOCUMENT_TYPE.PASSPORT_COPY },
      select: { id: true, extracted: true },
    });

    for (const segment of segments) {
      const extracted = (segment.extracted ?? {}) as Record<string, unknown>;
      const existingNumber =
        typeof extracted.documentNumber === 'string'
          ? extracted.documentNumber.trim()
          : '';
      const existingExpiry =
        typeof extracted.expiryDate === 'string'
          ? extracted.expiryDate.trim()
          : '';
      const documentNumber =
        existingNumber || identity.passportNumber || null;
      const expiryDate = existingExpiry || identity.passportExpiry || null;
      if (
        documentNumber === (extracted.documentNumber ?? null) &&
        expiryDate === (extracted.expiryDate ?? null)
      ) {
        continue;
      }

      await this.prisma.candidateDocumentBundleSegment.update({
        where: { id: segment.id },
        data: {
          extracted: {
            ...extracted,
            documentNumber,
            expiryDate,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async applyIdentity(
    candidateId: string,
    identity: BundleProfileSuggestions['identity'],
  ): Promise<void> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { dateOfBirth: true, email: true, passportNumber: true },
    });
    if (!candidate) return;

    const data = identityProfileUpdate(candidate, identity);
    if (Object.keys(data).length === 0) return;

    await this.prisma.candidate.update({
      where: { id: candidateId },
      data,
    });
  }

  private async resolveResumeRoleCatalogId(
    suggestion: BundleResumeRoleSuggestion | null | undefined,
    userId: string,
  ): Promise<string | null> {
    if (!suggestion || !hasResumeRole(suggestion)) {
      return null;
    }

    let roleDepartmentId = suggestion.departmentId;
    if (!roleDepartmentId && suggestion.proposedDepartment?.name) {
      try {
        const created = await this.catalogApproval.approve(
          {
            target: 'role_department',
            value: suggestion.proposedDepartment.name,
            label: suggestion.proposedDepartment.name,
          },
          userId,
        );
        roleDepartmentId = created.id;
      } catch (error) {
        if (error instanceof ConflictException) {
          const existing = await this.prisma.roleDepartment.findFirst({
            where: {
              OR: [
                {
                  label: {
                    equals: suggestion.proposedDepartment.name,
                    mode: 'insensitive',
                  },
                },
                {
                  name: {
                    equals: suggestion.proposedDepartment.name,
                    mode: 'insensitive',
                  },
                },
              ],
            },
            select: { id: true },
          });
          if (!existing) throw error;
          roleDepartmentId = existing.id;
        } else {
          throw error;
        }
      }
    }

    if (suggestion.roleCatalogId) {
      return suggestion.roleCatalogId;
    }

    if (!suggestion.proposedRole?.label) {
      return null;
    }
    if (!roleDepartmentId) {
      throw new BadRequestException(
        `Cannot create job title "${suggestion.proposedRole.label}" without a department.`,
      );
    }

    try {
      const created = await this.catalogApproval.approve(
        {
          target: 'role_catalog',
          value: suggestion.proposedRole.label,
          label: suggestion.proposedRole.label,
          roleDepartmentId,
        },
        userId,
      );
      return created.id;
    } catch (error) {
      if (error instanceof ConflictException) {
        const existing = await this.prisma.roleCatalog.findFirst({
          where: {
            label: {
              equals: suggestion.proposedRole.label,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });
        if (!existing) throw error;
        return existing.id;
      }
      throw error;
    }
  }

  private async ensureRolePreference(
    candidateId: string,
    roleCatalogId: string,
  ): Promise<void> {
    const existing = await this.prisma.candidateRolePreference.findUnique({
      where: {
        candidateId_roleCatalogId: { candidateId, roleCatalogId },
      },
      select: { id: true },
    });
    if (existing) return;

    await this.prisma.candidateRolePreference.create({
      data: { candidateId, roleCatalogId },
    });
  }

  private async materializePdfSplit(
    source: PDFDocument,
    start: number,
    end: number,
    candidate: { firstName: string; lastName: string | null },
    docType: string,
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    allowedMimeTypes: string[];
    maxSizeMb: number;
  }> {
    const split = await PDFDocument.create();
    const indices = Array.from(
      { length: end - start + 1 },
      (_, offset) => start - 1 + offset,
    );
    const copied = await split.copyPages(source, indices);
    for (const page of copied) split.addPage(page);
    const buffer = Buffer.from(await split.save());

    return {
      buffer,
      fileName: this.buildFileName(candidate, docType, start, 'pdf'),
      mimeType: 'application/pdf',
      allowedMimeTypes: ['application/pdf'],
      maxSizeMb: MAX_BUNDLE_FILE_BYTES / 1024 / 1024,
    };
  }

  private async materializePassportPhoto(
    sourceBytes: Buffer,
    startPage: number,
    candidate: { firstName: string; lastName: string | null },
    docType: string,
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    allowedMimeTypes: string[];
    maxSizeMb: number;
  }> {
    const jpeg = await renderPdfPagesToJpeg(sourceBytes, startPage);
    const fileName = this.buildFileName(candidate, docType, startPage, 'jpg');
    const prepared = await this.compression.prepareFile(
      {
        buffer: jpeg,
        originalname: fileName,
        mimetype: 'image/jpeg',
        size: jpeg.length,
      } as Express.Multer.File,
      PASSPORT_PHOTO_MAX_BYTES,
      'passport photo',
    );

    if (prepared.size > PASSPORT_PHOTO_MAX_BYTES) {
      throw new BadRequestException(
        'Passport photo could not be compressed to 1 MB. Skip it or crop the page.',
      );
    }

    return {
      buffer: prepared.buffer,
      fileName,
      mimeType: 'image/jpeg',
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxSizeMb: 1,
    };
  }

  private buildFileName(
    candidate: { firstName: string; lastName: string | null },
    docType: string,
    startPage: number,
    extension: 'pdf' | 'jpg',
  ): string {
    const name = `${candidate.firstName}_${candidate.lastName ?? ''}`
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${name}_${docType}_p${startPage}.${extension}`;
  }
}
