import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { CandidatesService } from '../../candidates/candidates.service';
import {
  CreateCandidateDto,
} from '../../candidates/dto/create-candidate.dto';
import { PrismaService } from '../../database/prisma.service';
import { UploadService } from '../../upload/upload.service';
import {
  BATCH_STATUS,
  CANDIDATE_IMPORT_JOB,
  CANDIDATE_IMPORT_QUEUE,
  CandidateImportJobData,
  MAX_IMPORT_FILE_BYTES,
  ROW_STATUS,
} from '../constants/candidate-import.constants';
import { ConfirmImportDto } from '../dto/confirm-import.dto';
import { UpdateImportRowDto } from '../dto/update-import-row.dto';
import {
  NormalizedRow,
  normalizeRow,
  parseWorkbook,
} from '../utils/excel-parser.util';
import {
  ImportIssue,
  hasBlockingIssue,
  validateNormalizedRow,
} from '../utils/row-validation.util';
import {
  CatalogMappingService,
  RowCatalogMapping,
} from './catalog-mapping.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { RecruiterResolutionService } from './recruiter-resolution.service';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
];

export interface ImportRowResult {
  rowId: string;
  sheetName: string;
  rowNumber: number;
  success: boolean;
  candidateId?: string;
  candidateCode?: string | null;
  firstName?: string;
  lastName?: string | null;
  countryCode?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  professionLabel?: string | null;
  gender?: string | null;
  error?: string;
}

/**
 * Orchestrates a candidate import batch from upload through to creation.
 *
 * Nothing is written to the candidate tables until `confirm` is called. The
 * parse and mapping phases only ever populate `CandidateImportRow`, which keeps
 * a failed or abandoned batch completely inert.
 */
@Injectable()
export class CandidateImportService {
  private readonly logger = new Logger(CandidateImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly candidatesService: CandidatesService,
    private readonly catalogMapping: CatalogMappingService,
    private readonly duplicateDetection: DuplicateDetectionService,
    private readonly recruiterResolution: RecruiterResolutionService,
    @InjectQueue(CANDIDATE_IMPORT_QUEUE)
    private readonly importQueue: Queue<CandidateImportJobData>,
  ) {}

  /** Stores the file, creates the batch shell and queues parsing. */
  async createBatch(
    file: Express.Multer.File,
    uploadedById: string,
    options: { defaultRecruiterId?: string; activeTabsOnly?: boolean },
  ) {
    if (!file) {
      throw new BadRequestException('A spreadsheet file is required.');
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      throw new BadRequestException(
        `File is larger than ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)}MB.`,
      );
    }
    const looksLikeSpreadsheet =
      ALLOWED_MIME_TYPES.includes(file.mimetype) ||
      /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (!looksLikeSpreadsheet) {
      throw new BadRequestException(
        'Only .xlsx, .xls and .csv files can be imported.',
      );
    }

    if (options.defaultRecruiterId) {
      await this.assertRecruiterExists(options.defaultRecruiterId);
    }

    const upload = await this.uploadService.uploadFile(
      file,
      `candidate-imports/${uploadedById}`,
      ALLOWED_MIME_TYPES,
      MAX_IMPORT_FILE_BYTES / 1024 / 1024,
    );

    const batch = await this.prisma.candidateImportBatch.create({
      data: {
        fileName: file.originalname,
        fileUrl: upload.fileUrl,
        fileSize: file.size,
        status: BATCH_STATUS.ANALYZING,
        uploadedById,
      },
      select: { id: true, status: true, fileName: true, createdAt: true },
    });

    await this.importQueue.add(CANDIDATE_IMPORT_JOB, {
      batchId: batch.id,
      defaultRecruiterId: options.defaultRecruiterId,
      activeTabsOnly: options.activeTabsOnly ?? false,
    });

    this.logger.log(
      `Queued import batch ${batch.id} (${file.originalname}) for user ${uploadedById}.`,
    );

    return batch;
  }

  /**
   * Parses the workbook, maps catalogs and detects duplicates.
   *
   * Runs inside the BullMQ worker. It is safe to re-run: existing rows for the
   * batch are cleared first, so a retried job cannot double-insert.
   */
  async processBatch(data: CandidateImportJobData): Promise<void> {
    const batch = await this.prisma.candidateImportBatch.findUnique({
      where: { id: data.batchId },
      select: { id: true, fileUrl: true, fileName: true },
    });
    if (!batch) {
      this.logger.warn(`Import batch ${data.batchId} vanished before parsing.`);
      return;
    }

    try {
      const buffer = await this.uploadService.getFile(batch.fileUrl);
      const parsed = await parseWorkbook(buffer, {
        activeTabsOnly: data.activeTabsOnly,
      });

      if (parsed.rows.length === 0) {
        await this.failBatch(
          batch.id,
          parsed.unrecognizedSheets.length > 0
            ? `No recognizable candidate columns found. Check the header row in: ${parsed.unrecognizedSheets.join(', ')}.`
            : 'No candidate rows found in this file.',
        );
        return;
      }

      const sheetOwners = await this.recruiterResolution.suggestSheetOwners(
        [...new Set(parsed.rows.map((row) => row.sheetName))],
        data.defaultRecruiterId,
      );
      const ownerBySheet = new Map(
        sheetOwners.map((owner) => [owner.sheetName, owner]),
      );

      const normalizedRows = parsed.rows.map((row) => ({
        key: `${row.sheetName}!${row.rowNumber}`,
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        raw: row.values,
        normalized: normalizeRow(row.values),
      }));

      const [mappings, duplicates] = await Promise.all([
        this.catalogMapping.mapBatch(
          normalizedRows.map((row) => ({
            key: row.key,
            category: row.normalized.category,
            // Sheet import only maps CATEGORY → profession. Qualification and
            // department are left for the candidate profile after import.
            qualification: '',
            department: '',
          })),
        ),
        this.duplicateDetection.detect(
          normalizedRows.map((row) => ({
            key: row.key,
            sheetName: row.sheetName,
            rowNumber: row.rowNumber,
            normalized: row.normalized,
          })),
        ),
      ]);

      // Replace rather than append so a retry is idempotent.
      await this.prisma.candidateImportRow.deleteMany({
        where: { batchId: batch.id },
      });

      const counters = {
        ready: 0,
        review: 0,
        invalid: 0,
      };

      const rowData: Prisma.CandidateImportRowCreateManyInput[] = [];

      for (const row of normalizedRows) {
        const mapping = mappings.get(row.key)!;
        const duplicate = duplicates.get(row.key)!;
        const owner = ownerBySheet.get(row.sheetName);

        const issues: ImportIssue[] = [
          ...validateNormalizedRow(row.normalized),
          ...duplicate.issues,
        ];

        if (!owner?.recruiterId) {
          issues.push({
            type: 'UNRESOLVED_RECRUITER',
            severity: 'error',
            field: 'recruiterId',
            message:
              owner?.match === 'ambiguous'
                ? `Sheet "${row.sheetName}" matches more than one recruiter; choose the owner.`
                : `No recruiter matches sheet "${row.sheetName}"; choose the owner.`,
          });
        }

        this.appendCatalogIssues(mapping, issues);

        const status = this.deriveStatus(issues);
        if (status === ROW_STATUS.READY) counters.ready += 1;
        else if (status === ROW_STATUS.INVALID) counters.invalid += 1;
        else counters.review += 1;

        rowData.push({
          batchId: batch.id,
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          rawData: row.raw as unknown as Prisma.InputJsonValue,
          normalized: row.normalized as unknown as Prisma.InputJsonValue,
          mapping: mapping as unknown as Prisma.InputJsonValue,
          issues: issues as unknown as Prisma.InputJsonValue,
          status,
          recruiterId: owner?.recruiterId ?? null,
        });
      }

      await this.prisma.candidateImportRow.createMany({ data: rowData });

      await this.prisma.candidateImportBatch.update({
        where: { id: batch.id },
        data: {
          status: BATCH_STATUS.REVIEW,
          totalRows: rowData.length,
          readyRows: counters.ready,
          reviewRows: counters.review,
          invalidRows: counters.invalid,
          sheetOwners: sheetOwners as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Batch ${batch.id} parsed: ${rowData.length} rows (${counters.ready} ready, ${counters.review} review, ${counters.invalid} invalid).`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown parsing error.';
      this.logger.error(`Batch ${batch.id} failed: ${message}`);
      await this.failBatch(batch.id, message);
    }
  }

  async getBatch(batchId: string, requesterId: string) {
    const batch = await this.prisma.candidateImportBatch.findUnique({
      where: { id: batchId },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        rows: {
          orderBy: [{ sheetName: 'asc' }, { rowNumber: 'asc' }],
        },
      },
    });
    if (!batch) throw new NotFoundException('Import batch not found.');
    return batch;
  }

  async updateRow(
    batchId: string,
    rowId: string,
    dto: UpdateImportRowDto,
  ): Promise<void> {
    const row = await this.prisma.candidateImportRow.findFirst({
      where: { id: rowId, batchId },
    });
    if (!row) throw new NotFoundException('Import row not found.');

    const normalized = {
      ...(row.normalized as unknown as NormalizedRow),
    };
    const mapping = row.mapping as unknown as RowCatalogMapping | null;

    for (const key of [
      'firstName',
      'lastName',
      'countryCode',
      'mobileNumber',
      'email',
      'passportNumber',
      'gender',
      'licensingExam',
      'remarks',
    ] as const) {
      if (dto[key] !== undefined) {
        (normalized as Record<string, unknown>)[key] = dto[key];
      }
    }
    if (dto.dataFlow !== undefined) normalized.dataFlow = dto.dataFlow;
    if (dto.preferredCountries !== undefined) {
      normalized.preferredCountries = dto.preferredCountries;
    }

    // Reviewer profession pick overrides AI decisions outright.
    if (mapping) {
      if (dto.professionTypeId !== undefined && dto.professionTypeId) {
        mapping.professionType = {
          ...mapping.professionType,
          decision: 'exact',
          matchedId: dto.professionTypeId,
          confidence: 1,
          reason: 'Set by reviewer.',
        };
      }
    }

    if (dto.recruiterId) {
      await this.assertRecruiterExists(dto.recruiterId);
    }

    const recruiterId = dto.recruiterId ?? row.recruiterId;
    const issues = [
      ...validateNormalizedRow(normalized),
      // Duplicate findings from the original scan are preserved, since the
      // reviewer may have corrected the phone number precisely to clear them.
      ...((row.issues as unknown as ImportIssue[]) ?? []).filter(
        (issue) =>
          issue.type === 'DUPLICATE_IN_DATABASE' ||
          issue.type === 'DUPLICATE_IN_FILE',
      ),
    ];

    if (!recruiterId) {
      issues.push({
        type: 'UNRESOLVED_RECRUITER',
        severity: 'error',
        field: 'recruiterId',
        message: 'Choose the recruiter who will own this candidate.',
      });
    }
    if (mapping) this.appendCatalogIssues(mapping, issues);

    // Explicit skip / unskip from the reviewer. Other saves keep skip intact
    // so editing a skipped row does not silently re-include it.
    let status: string;
    if (dto.skip === true) {
      status = ROW_STATUS.SKIPPED;
    } else if (dto.skip === false || row.status !== ROW_STATUS.SKIPPED) {
      status = this.deriveStatus(issues);
    } else {
      status = ROW_STATUS.SKIPPED;
    }

    await this.prisma.candidateImportRow.update({
      where: { id: rowId },
      data: {
        normalized: normalized as unknown as Prisma.InputJsonValue,
        mapping: (mapping ?? undefined) as unknown as Prisma.InputJsonValue,
        issues: issues as unknown as Prisma.InputJsonValue,
        status,
        recruiterId,
      },
    });

    await this.refreshCounters(batchId);
  }

  async setSheetOwners(
    batchId: string,
    owners: Record<string, string>,
  ): Promise<void> {
    const batch = await this.prisma.candidateImportBatch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('Import batch not found.');

    for (const recruiterId of new Set(Object.values(owners))) {
      await this.assertRecruiterExists(recruiterId);
    }

    for (const [sheetName, recruiterId] of Object.entries(owners)) {
      await this.prisma.candidateImportRow.updateMany({
        where: { batchId, sheetName },
        data: { recruiterId },
      });
    }

    // Ownership was the only blocking issue for many rows; re-evaluate them.
    await this.revalidateRows(batchId);
    await this.refreshCounters(batchId);
  }

  /**
   * Assigns one recruiter as owner of every row in the batch (Apply to all).
   * Skipped rows keep skip status; other rows are revalidated.
   */
  async setBatchRecruiter(
    batchId: string,
    recruiterId: string,
  ): Promise<void> {
    const batch = await this.prisma.candidateImportBatch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('Import batch not found.');

    await this.assertRecruiterExists(recruiterId);

    await this.prisma.candidateImportRow.updateMany({
      where: { batchId, status: { notIn: [ROW_STATUS.IMPORTED] } },
      data: { recruiterId },
    });

    await this.revalidateRows(batchId);
    await this.refreshCounters(batchId);
  }

  /**
   * Creates candidates for the selected rows.
   *
   * Each row is created independently so one bad row cannot abort the batch,
   * and each is attributed to its own recruiter rather than to the importer.
   */
  async confirm(
    batchId: string,
    dto: ConfirmImportDto,
    importedById: string,
  ): Promise<{ imported: number; failed: number; results: ImportRowResult[] }> {
    const batch = await this.prisma.candidateImportBatch.findUnique({
      where: { id: batchId },
      select: { id: true, status: true },
    });
    if (!batch) throw new NotFoundException('Import batch not found.');
    if (batch.status === BATCH_STATUS.IMPORTING) {
      throw new BadRequestException('This batch is already being imported.');
    }

    const rows = await this.prisma.candidateImportRow.findMany({
      where: {
        batchId,
        status: ROW_STATUS.READY,
        ...(dto.rowIds?.length ? { id: { in: dto.rowIds } } : {}),
      },
      orderBy: [{ sheetName: 'asc' }, { rowNumber: 'asc' }],
    });

    if (rows.length === 0) {
      throw new BadRequestException(
        'No rows are ready to import. Resolve the outstanding issues first.',
      );
    }

    await this.prisma.candidateImportBatch.update({
      where: { id: batchId },
      data: { status: BATCH_STATUS.IMPORTING },
    });

    const results: ImportRowResult[] = [];

    for (const row of rows) {
      const normalized = row.normalized as unknown as NormalizedRow;
      const mapping = row.mapping as unknown as RowCatalogMapping | null;

      try {
        if (!row.recruiterId) {
          throw new Error('Row has no owning recruiter.');
        }

        const dtoForCreate = this.toCreateCandidateDto(normalized, mapping);

        // The recruiter is passed as the acting user so ownership and the
        // automatic assignment land on them; the batch records who ran it.
        const candidate = await this.candidatesService.create(
          dtoForCreate,
          row.recruiterId,
        );

        await this.prisma.candidateImportRow.update({
          where: { id: row.id },
          data: {
            status: ROW_STATUS.IMPORTED,
            candidateId: candidate.id,
            error: null,
          },
        });

        results.push({
          rowId: row.id,
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          success: true,
          candidateId: candidate.id,
          candidateCode: candidate.candidateCode ?? null,
          firstName: candidate.firstName,
          lastName: candidate.lastName ?? null,
          countryCode: candidate.countryCode ?? normalized.countryCode ?? null,
          mobileNumber:
            candidate.mobileNumber ?? normalized.mobileNumber ?? null,
          email: candidate.email ?? normalized.email ?? null,
          professionLabel:
            mapping?.professionType.matchedLabel ??
            normalized.category ??
            null,
          gender: candidate.gender ?? normalized.gender ?? null,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error.';
        await this.prisma.candidateImportRow.update({
          where: { id: row.id },
          data: { status: ROW_STATUS.FAILED, error: message },
        });
        results.push({
          rowId: row.id,
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          success: false,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          countryCode: normalized.countryCode || null,
          mobileNumber: normalized.mobileNumber || null,
          email: normalized.email,
          professionLabel:
            mapping?.professionType.matchedLabel ??
            normalized.category ??
            null,
          gender: normalized.gender ?? null,
          error: message,
        });
      }
    }

    const imported = results.filter((result) => result.success).length;
    const failed = results.length - imported;

    await this.refreshCounters(batchId);
    await this.prisma.candidateImportBatch.update({
      where: { id: batchId },
      data: {
        status: BATCH_STATUS.COMPLETED,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Batch ${batchId} confirmed by ${importedById}: ${imported} imported, ${failed} failed.`,
    );

    return { imported, failed, results };
  }

  // --- helpers ---------------------------------------------------------------

  private toCreateCandidateDto(
    normalized: NormalizedRow,
    mapping: RowCatalogMapping | null,
  ): CreateCandidateDto {
    const dto = new CreateCandidateDto();
    dto.firstName = normalized.firstName;
    dto.lastName = normalized.lastName ?? undefined;
    dto.countryCode = normalized.countryCode;
    dto.mobileNumber = normalized.mobileNumber;
    if (normalized.email) dto.email = normalized.email;
    if (normalized.passportNumber) {
      dto.passportNumber = normalized.passportNumber;
    }
    if (normalized.gender) dto.gender = normalized.gender as never;
    if (normalized.licensingExam) dto.licensingExam = normalized.licensingExam;
    if (normalized.dataFlow !== undefined) dto.dataFlow = normalized.dataFlow;
    dto.source = normalized.source;

    if (mapping?.professionType.matchedId) {
      dto.professionTypeId = mapping.professionType.matchedId;
    }
    if (normalized.preferredCountries.length > 0) {
      dto.preferredCountries = normalized.preferredCountries;
    }

    return dto;
  }

  /** Only profession (sheet CATEGORY) can block an import. Qualification and
   * department are not mapped on this flow. */
  private appendCatalogIssues(
    mapping: RowCatalogMapping,
    issues: ImportIssue[],
  ): void {
    if (mapping.professionType.decision === 'needs_review') {
      issues.push({
        type: 'UNKNOWN_CATEGORY',
        severity: 'error',
        field: 'category',
        message: mapping.professionType.reason,
      });
    }
  }

  private deriveStatus(issues: ImportIssue[]): string {
    if (issues.some((issue) => issue.type === 'DUPLICATE_IN_DATABASE')) {
      return ROW_STATUS.DUPLICATE;
    }
    if (issues.some((issue) => issue.type === 'DUPLICATE_IN_FILE')) {
      return ROW_STATUS.DUPLICATE;
    }
    if (hasBlockingIssue(issues)) return ROW_STATUS.INVALID;
    return ROW_STATUS.READY;
  }

  private async revalidateRows(batchId: string): Promise<void> {
    const rows = await this.prisma.candidateImportRow.findMany({
      where: { batchId, status: { notIn: [ROW_STATUS.IMPORTED] } },
      select: {
        id: true,
        normalized: true,
        mapping: true,
        issues: true,
        recruiterId: true,
        status: true,
      },
    });

    for (const row of rows) {
      if (row.status === ROW_STATUS.SKIPPED) continue;
      const normalized = row.normalized as unknown as NormalizedRow;
      const mapping = row.mapping as unknown as RowCatalogMapping | null;
      const issues = [
        ...validateNormalizedRow(normalized),
        ...((row.issues as unknown as ImportIssue[]) ?? []).filter(
          (issue) =>
            issue.type === 'DUPLICATE_IN_DATABASE' ||
            issue.type === 'DUPLICATE_IN_FILE',
        ),
      ];
      if (!row.recruiterId) {
        issues.push({
          type: 'UNRESOLVED_RECRUITER',
          severity: 'error',
          field: 'recruiterId',
          message: 'Choose the recruiter who will own this candidate.',
        });
      }
      if (mapping) this.appendCatalogIssues(mapping, issues);

      await this.prisma.candidateImportRow.update({
        where: { id: row.id },
        data: {
          issues: issues as unknown as Prisma.InputJsonValue,
          status: this.deriveStatus(issues),
        },
      });
    }
  }

  private async refreshCounters(batchId: string): Promise<void> {
    const grouped = await this.prisma.candidateImportRow.groupBy({
      by: ['status'],
      where: { batchId },
      _count: { _all: true },
    });

    const countOf = (status: string) =>
      grouped.find((entry) => entry.status === status)?._count._all ?? 0;

    const review =
      countOf(ROW_STATUS.NEEDS_REVIEW) + countOf(ROW_STATUS.DUPLICATE);

    await this.prisma.candidateImportBatch.update({
      where: { id: batchId },
      data: {
        totalRows: grouped.reduce((sum, e) => sum + e._count._all, 0),
        readyRows: countOf(ROW_STATUS.READY),
        reviewRows: review,
        invalidRows: countOf(ROW_STATUS.INVALID),
        importedRows: countOf(ROW_STATUS.IMPORTED),
        failedRows: countOf(ROW_STATUS.FAILED),
      },
    });
  }

  private async failBatch(batchId: string, error: string): Promise<void> {
    await this.prisma.candidateImportBatch.update({
      where: { id: batchId },
      data: { status: BATCH_STATUS.FAILED, error },
    });
  }

  private async assertRecruiterExists(recruiterId: string): Promise<void> {
    const recruiter = await this.prisma.user.findFirst({
      where: {
        id: recruiterId,
        userRoles: { some: { role: { name: 'Recruiter' } } },
      },
      select: { id: true },
    });
    if (!recruiter) {
      throw new BadRequestException(
        `User ${recruiterId} is not an active recruiter.`,
      );
    }
  }
}
