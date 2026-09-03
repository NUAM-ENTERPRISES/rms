import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PDFDocument } from 'pdf-lib';
import { DOCUMENT_TYPE } from '../../common/constants/document-types';
import { PrismaService } from '../../database/prisma.service';
import { CreateDocumentDto } from '../../documents/dto/create-document.dto';
import { DocumentsService } from '../../documents/documents.service';
import { UploadService } from '../../upload/upload.service';
import {
  BUNDLE_STATUS,
  DOCUMENT_CLASSIFICATION_JOB,
  DOCUMENT_CLASSIFICATION_QUEUE,
  DocumentClassificationJobData,
  MAX_BUNDLE_FILE_BYTES,
  SEGMENT_STATUS,
} from '../constants/candidate-import.constants';
import { UpdateBundleSegmentDto } from '../dto/update-bundle-segment.dto';
import { extractPdfPages } from '../utils/pdf-pages.util';
import { MergedPdfClassifierService } from './merged-pdf-classifier.service';

/** Doc types DocumentsService refuses to create without a role catalog. */
const RESUME_DOC_TYPES = new Set<string>(
  [DOCUMENT_TYPE.RESUME, DOCUMENT_TYPE.CV].filter(Boolean) as string[],
);

export interface ApplyBundleResult {
  applied: number;
  failed: number;
  documents: Array<{
    segmentId: string;
    documentId?: string;
    docType: string;
    error?: string;
  }>;
}

/**
 * Manages merged-PDF bundles: upload, AI classification, review and apply.
 *
 * Splitting only happens on apply, and only for segments a reviewer confirmed,
 * so an incorrect suggestion never reaches the candidate's document list.
 */
@Injectable()
export class DocumentBundleService {
  private readonly logger = new Logger(DocumentBundleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly documentsService: DocumentsService,
    private readonly classifier: MergedPdfClassifierService,
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
   * Reads the PDF, asks Vertex to segment it and stores the suggestions.
   *
   * Re-running replaces any suggestions that have not been applied yet, so a
   * retried job is idempotent.
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
      const segments = await this.classifier.classify(pages, {
        fullName: `${candidate.firstName} ${candidate.lastName ?? ''}`.trim(),
        passportNumber: candidate.passportNumber,
      });

      await this.prisma.candidateDocumentBundleSegment.deleteMany({
        where: { bundleId, status: { not: SEGMENT_STATUS.APPLIED } },
      });

      if (segments.length > 0) {
        await this.prisma.candidateDocumentBundleSegment.createMany({
          data: segments.map((segment, index) => ({
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
          })),
        });
      }

      await this.prisma.candidateDocumentBundle.update({
        where: { id: bundleId },
        data: {
          status: BUNDLE_STATUS.REVIEW,
          pageCount: pages.length,
        },
      });

      this.logger.log(
        `Bundle ${bundleId}: ${pages.length} pages split into ${segments.length} documents.`,
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
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    if (!bundle) throw new NotFoundException('Document bundle not found.');
    return bundle;
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

  /**
   * Splits the bundle and creates one `Document` per confirmed segment.
   *
   * `UploadService.uploadDocument` only stores bytes, so each split is
   * explicitly registered through `DocumentsService.create`.
   */
  async applyBundle(
    bundleId: string,
    userId: string,
  ): Promise<ApplyBundleResult> {
    const bundle = await this.prisma.candidateDocumentBundle.findUnique({
      where: { id: bundleId },
      include: {
        segments: { orderBy: { sortOrder: 'asc' } },
        candidate: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!bundle) throw new NotFoundException('Document bundle not found.');

    const confirmed = bundle.segments.filter(
      (segment) => segment.status === SEGMENT_STATUS.CONFIRMED,
    );
    if (confirmed.length === 0) {
      throw new BadRequestException(
        'Confirm at least one segment before saving.',
      );
    }

    // DocumentsService rejects a resume without a role, and unlike experience
    // letters it has no fallback chain, so the preference is resolved here.
    const rolePreference = confirmed.some((segment) =>
      RESUME_DOC_TYPES.has(segment.docType),
    )
      ? await this.prisma.candidateRolePreference.findFirst({
          where: { candidateId: bundle.candidateId },
          select: { roleCatalogId: true },
        })
      : null;

    const sourceBytes = await this.uploadService.getFile(bundle.fileUrl);
    const source = await PDFDocument.load(sourceBytes);
    const pageCount = source.getPageCount();

    const results: ApplyBundleResult['documents'] = [];

    for (const segment of confirmed) {
      try {
        const start = Math.max(1, segment.startPage);
        const end = Math.min(pageCount, segment.endPage);
        if (end < start) {
          throw new Error(
            `Page range ${segment.startPage}-${segment.endPage} is outside this ${pageCount}-page file.`,
          );
        }

        const split = await PDFDocument.create();
        const indices = Array.from(
          { length: end - start + 1 },
          (_, offset) => start - 1 + offset,
        );
        const copied = await split.copyPages(source, indices);
        for (const page of copied) split.addPage(page);
        const splitBytes = Buffer.from(await split.save());

        const extracted = (segment.extracted ?? {}) as Record<
          string,
          string | null
        >;

        if (RESUME_DOC_TYPES.has(segment.docType) && !rolePreference) {
          throw new Error(
            'This candidate has no preferred role yet, so a resume cannot be saved. Set a role on the profile first.',
          );
        }

        const fileName = this.buildFileName(
          bundle.candidate,
          segment.docType,
          segment.startPage,
        );

        const upload = await this.uploadService.uploadFile(
          {
            buffer: splitBytes,
            originalname: fileName,
            mimetype: 'application/pdf',
            size: splitBytes.length,
          } as Express.Multer.File,
          `candidates/documents/${bundle.candidateId}/${segment.docType}`,
          ['application/pdf'],
          MAX_BUNDLE_FILE_BYTES / 1024 / 1024,
        );

        const createDto: CreateDocumentDto = {
          candidateId: bundle.candidateId,
          docType: segment.docType,
          docName: segment.docName ?? undefined,
          fileName,
          fileUrl: upload.fileUrl,
          fileSize: splitBytes.length,
          mimeType: 'application/pdf',
          documentNumber: extracted.documentNumber ?? undefined,
          issuedAt: extracted.issuedAt ?? undefined,
          expiryDate: extracted.expiryDate ?? undefined,
          notes: `Split from ${bundle.fileName}, pages ${segment.startPage}-${segment.endPage}.`,
          ...(RESUME_DOC_TYPES.has(segment.docType) && rolePreference
            ? { roleCatalogId: rolePreference.roleCatalogId }
            : {}),
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

    const applied = results.filter((result) => result.documentId).length;

    await this.prisma.candidateDocumentBundle.update({
      where: { id: bundleId },
      data: {
        status: BUNDLE_STATUS.APPLIED,
        appliedAt: new Date(),
      },
    });

    this.logger.log(
      `Bundle ${bundleId} applied by ${userId}: ${applied} documents created.`,
    );

    return { applied, failed: results.length - applied, documents: results };
  }

  private buildFileName(
    candidate: { firstName: string; lastName: string | null },
    docType: string,
    startPage: number,
  ): string {
    const name = `${candidate.firstName}_${candidate.lastName ?? ''}`
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${name}_${docType}_p${startPage}.pdf`;
  }
}
