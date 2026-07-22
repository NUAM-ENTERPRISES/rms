import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CandidatesService } from '../candidates.service';
import { UploadService } from '../../upload/upload.service';
import { PrismaService } from '../../database/prisma.service';
import { RbacUtil } from '../../auth/rbac/rbac.util';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { extractTextFromPdfBuffer } from './resume-pdf-text-extractor';
import { parseResumeText } from './resume-field-parser';
import {
  matchEducationsToCatalog,
  type QualificationCatalogEntry,
} from './qualification-catalog-matcher';
import { BulkResumeTempFileStore } from './bulk-resume-temp-file.store';
import {
  BulkCreateFromDraftsDto,
  BulkCreateFromResumesResult,
  BulkResumeCreatedItem,
  BulkResumeDraft,
  BulkResumeDraftDto,
  BulkResumeFailedItem,
  BulkResumeParseDto,
  BulkResumeParseResult,
} from './dto/bulk-resume-review.dto';

export const BULK_RESUME_MAX_FILES = 25;
/** Max files accepted by a single parse request (upload picker may still allow more). */
export const BULK_RESUME_PARSE_MAX_FILES = 10;
/** How many PDFs are extracted/parsed at the same time within one request. */
const PARSE_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

/** Strip NUL / other bytes Postgres rejects in UTF-8 text columns. */
function sanitizeDbText(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const cleaned = value
    .replace(/\u0000/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

@Injectable()
export class BulkResumeCandidateService {
  private readonly logger = new Logger(BulkResumeCandidateService.name);

  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
    private readonly rbacUtil: RbacUtil,
    private readonly tempFileStore: BulkResumeTempFileStore,
  ) {}

  async parseResumes(
    files: Express.Multer.File[],
    dto: BulkResumeParseDto,
    userId: string,
  ): Promise<BulkResumeParseResult> {
    await this.assertBulkPermissions(userId);
    this.assertParseFileBatch(files);
    const professionTypeId = await this.assertSharedMeta(
      dto.professionTypeId,
      dto.roleCatalogId,
    );

    const catalog = await this.loadQualificationCatalog();
    const source = dto.source?.trim() || 'direct_application';

    const outcomes = await mapWithConcurrency(
      files,
      PARSE_CONCURRENCY,
      async (
        file,
      ): Promise<
        | { draft: BulkResumeDraft }
        | { failure: { fileName: string; reason: string } }
      > => {
        const fileName = file.originalname || 'resume.pdf';
        try {
          this.assertPdfFile(file);

          const text = await extractTextFromPdfBuffer(file.buffer);
          if (!text || text.length < 10) {
            return {
              failure: {
                fileName,
                reason:
                  'Could not extract text from resume (scanned or empty PDF)',
              },
            };
          }

          const parsed = parseResumeText(text);
          const matchedByRaw = new Map(
            matchEducationsToCatalog(parsed.educations, catalog).map((m) => [
              m.rawDegree.toLowerCase(),
              m,
            ]),
          );

          const educations = (parsed.educations ?? []).map((edu) => {
            const match = matchedByRaw.get(edu.rawDegree.toLowerCase());
            return {
              rawDegree: sanitizeDbText(edu.rawDegree),
              qualificationId: match?.qualificationId,
              university: sanitizeDbText(edu.university),
              graduationYear: edu.graduationYear,
              notes: sanitizeDbText(edu.notes ?? match?.notes),
            };
          });

          const workExperiences = (parsed.workExperiences ?? []).map((we) => ({
            jobTitle: sanitizeDbText(we.jobTitle) || 'Professional',
            companyName: sanitizeDbText(we.companyName),
            location: sanitizeDbText(we.location),
            startDate: we.startDate,
            endDate: we.endDate,
            isCurrent: we.isCurrent,
            description: sanitizeDbText(we.description),
          }));

          const parseWarnings: string[] = [];
          if (
            parsed.nameConfidence === 'low' ||
            parsed.firstName === 'Unknown' ||
            parsed.lastName === 'Candidate'
          ) {
            parseWarnings.push(
              'Name not detected reliably — please confirm first and last name',
            );
          }
          if (!parsed.countryCode || !parsed.mobileNumber) {
            parseWarnings.push('Phone number missing or incomplete');
          }
          if (educations.length === 0) {
            parseWarnings.push('No education detected');
          } else if (educations.some((e) => !e.qualificationId)) {
            parseWarnings.push(
              'Some education rows need a qualification selected',
            );
          }
          if (workExperiences.length === 0) {
            parseWarnings.push('No work experience detected');
          }
          if (!parsed.email) {
            parseWarnings.push('Email not detected');
          }

          const draftId = this.tempFileStore.put(userId, file);

          return {
            draft: {
              draftId,
              fileName,
              parseWarnings,
              firstName: sanitizeDbText(parsed.firstName) || 'Unknown',
              lastName: sanitizeDbText(parsed.lastName) || 'Candidate',
              email: sanitizeDbText(parsed.email),
              countryCode: parsed.countryCode,
              mobileNumber: parsed.mobileNumber,
              passportNumber: sanitizeDbText(parsed.passportNumber),
              dateOfBirth: parsed.dateOfBirth,
              address: sanitizeDbText(parsed.address),
              educations,
              workExperiences,
            },
          };
        } catch (err) {
          const reason =
            err instanceof Error ? err.message : 'Failed to parse resume';
          this.logger.warn(
            `Bulk resume parse failed for ${fileName}: ${reason}`,
          );
          return { failure: { fileName, reason } };
        }
      },
    );

    const drafts: BulkResumeDraft[] = [];
    const failed: Array<{ fileName: string; reason: string }> = [];
    for (const outcome of outcomes) {
      if ('draft' in outcome) drafts.push(outcome.draft);
      else failed.push(outcome.failure);
    }

    return {
      drafts,
      failed,
      professionTypeId,
      source,
      roleCatalogId: dto.roleCatalogId,
    };
  }

  async createFromDrafts(
    dto: BulkCreateFromDraftsDto,
    userId: string,
  ): Promise<BulkCreateFromResumesResult> {
    await this.assertBulkPermissions(userId);
    const professionTypeId = await this.assertSharedMeta(
      dto.professionTypeId,
      dto.roleCatalogId,
    );

    if (!dto.drafts?.length) {
      throw new BadRequestException('At least one draft is required');
    }
    if (dto.drafts.length > BULK_RESUME_MAX_FILES) {
      throw new BadRequestException(
        `Maximum ${BULK_RESUME_MAX_FILES} drafts allowed per create`,
      );
    }

    const source = dto.source?.trim() || 'direct_application';
    const created: BulkResumeCreatedItem[] = [];
    const failed: BulkResumeFailedItem[] = [];

    for (const draft of dto.drafts) {
      const fileName = draft.fileName || 'resume.pdf';
      try {
        if (!draft.countryCode || !draft.mobileNumber) {
          failed.push({
            fileName,
            reason: 'Phone number (country code and mobile) is required',
          });
          continue;
        }

        const stored = this.tempFileStore.take(draft.draftId, userId);
        if (!stored) {
          failed.push({
            fileName,
            reason:
              'Resume file expired or not found. Re-upload and parse again.',
          });
          continue;
        }

        const qualifications = (draft.educations ?? [])
          .filter((e) => e.qualificationId)
          .map((e) => ({
            qualificationId: e.qualificationId!,
            university: sanitizeDbText(e.university),
            graduationYear: e.graduationYear,
            isCompleted: true,
            notes: sanitizeDbText(e.notes ?? e.rawDegree),
          }));

        const workExperiences = (draft.workExperiences ?? [])
          .filter((we) => sanitizeDbText(we.jobTitle) && we.startDate)
          .map((we) => ({
            jobTitle: sanitizeDbText(we.jobTitle) || 'Professional',
            companyName: sanitizeDbText(we.companyName),
            location: sanitizeDbText(we.location),
            startDate: we.startDate!,
            endDate: we.endDate,
            isCurrent: we.isCurrent,
            description: sanitizeDbText(we.description),
          }));

        const createDto: CreateCandidateDto = {
          firstName: sanitizeDbText(draft.firstName) || 'Unknown',
          lastName: sanitizeDbText(draft.lastName) || 'Candidate',
          professionTypeId,
          countryCode: draft.countryCode,
          mobileNumber: draft.mobileNumber,
          email: sanitizeDbText(draft.email),
          passportNumber: sanitizeDbText(draft.passportNumber),
          dateOfBirth: draft.dateOfBirth,
          address: sanitizeDbText(draft.address),
          source,
          qualifications:
            qualifications.length > 0 ? qualifications : undefined,
          workExperiences:
            workExperiences.length > 0 ? workExperiences : undefined,
        };

        const candidate = await this.candidatesService.create(
          createDto,
          userId,
        );

        const createdItem: BulkResumeCreatedItem = {
          candidateId: candidate.id,
          fileName,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          qualificationCount: qualifications.length,
          workExperienceCount: workExperiences.length,
        };

        const multerFile = {
          buffer: stored.buffer,
          originalname: stored.originalname,
          mimetype: stored.mimetype,
          size: stored.size,
          fieldname: 'files',
          encoding: '7bit',
          destination: '',
          filename: stored.originalname,
          path: '',
          stream: undefined as never,
        } as Express.Multer.File;

        try {
          await this.uploadService.uploadResume(
            multerFile,
            candidate.id,
            dto.roleCatalogId,
            fileName,
          );
        } catch (uploadErr) {
          this.logger.warn(
            `Candidate ${candidate.id} created but resume attach failed for ${fileName}: ${
              uploadErr instanceof Error ? uploadErr.message : uploadErr
            }`,
          );
          failed.push({
            fileName,
            reason: `Candidate created (${candidate.id}) but resume upload failed: ${
              uploadErr instanceof Error ? uploadErr.message : 'unknown error'
            }`,
          });
          created.push(createdItem);
          continue;
        }

        created.push(createdItem);
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : 'Failed to create candidate';
        this.logger.warn(`Bulk resume create failed for ${fileName}: ${reason}`);
        failed.push({ fileName, reason });
      }
    }

    return { created, failed };
  }

  /**
   * @deprecated Prefer parseResumes + createFromDrafts. Kept for compatibility.
   */
  async createFromResumes(
    files: Express.Multer.File[],
    dto: BulkResumeParseDto,
    userId: string,
  ): Promise<BulkCreateFromResumesResult> {
    const parsed = await this.parseResumes(files, dto, userId);
    if (!parsed.drafts.length) {
      return { created: [], failed: parsed.failed };
    }

    const createBody: BulkCreateFromDraftsDto = {
      professionTypeId: parsed.professionTypeId,
      source: parsed.source,
      roleCatalogId: parsed.roleCatalogId,
      drafts: parsed.drafts.map(
        (d): BulkResumeDraftDto => ({
          draftId: d.draftId,
          fileName: d.fileName,
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          countryCode: d.countryCode,
          mobileNumber: d.mobileNumber,
          passportNumber: d.passportNumber,
          dateOfBirth: d.dateOfBirth,
          address: d.address,
          educations: d.educations,
          workExperiences: d.workExperiences,
        }),
      ),
    };

    const result = await this.createFromDrafts(createBody, userId);
    return {
      created: result.created,
      failed: [...parsed.failed, ...result.failed],
    };
  }

  private async assertBulkPermissions(userId: string): Promise<void> {
    const canCreate = await this.rbacUtil.hasPermission(userId, [
      'write:candidates',
      'manage:candidates',
    ]);
    const canBulk = await this.rbacUtil.hasPermission(userId, [
      'write:candidates_bulk_resume',
    ]);
    if (!canCreate || !canBulk) {
      throw new ForbiddenException(
        'Requires write:candidates (or manage:candidates) and write:candidates_bulk_resume',
      );
    }
  }

  private assertParseFileBatch(files: Express.Multer.File[]): void {
    if (!files?.length) {
      throw new BadRequestException('At least one resume PDF is required');
    }
    if (files.length > BULK_RESUME_PARSE_MAX_FILES) {
      throw new BadRequestException(
        `Maximum ${BULK_RESUME_PARSE_MAX_FILES} resume files allowed per parse request`,
      );
    }
  }

  private assertFileBatch(files: Express.Multer.File[]): void {
    if (!files?.length) {
      throw new BadRequestException('At least one resume PDF is required');
    }
    if (files.length > BULK_RESUME_MAX_FILES) {
      throw new BadRequestException(
        `Maximum ${BULK_RESUME_MAX_FILES} resume files allowed per upload`,
      );
    }
  }

  private async resolveProfessionTypeId(
    professionTypeId?: string,
  ): Promise<string> {
    if (professionTypeId?.trim()) {
      const professionType = await this.prisma.professionType.findFirst({
        where: { id: professionTypeId.trim(), isActive: true },
        select: { id: true },
      });
      if (!professionType) {
        throw new BadRequestException(
          'Profession type is invalid or inactive',
        );
      }
      return professionType.id;
    }

    const preferred = await this.prisma.professionType.findFirst({
      where: { isActive: true, name: 'nurse' },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (preferred) return preferred.id;

    const fallback = await this.prisma.professionType.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!fallback) {
      throw new BadRequestException('No active profession type is configured');
    }
    return fallback.id;
  }

  private async assertSharedMeta(
    professionTypeId: string | undefined,
    roleCatalogId?: string,
  ): Promise<string> {
    const resolvedProfessionTypeId =
      await this.resolveProfessionTypeId(professionTypeId);

    if (roleCatalogId) {
      const role = await this.prisma.roleCatalog.findUnique({
        where: { id: roleCatalogId },
        select: { id: true },
      });
      if (!role) {
        throw new BadRequestException('Role catalog ID is invalid');
      }
    }

    return resolvedProfessionTypeId;
  }

  private async loadQualificationCatalog(): Promise<
    QualificationCatalogEntry[]
  > {
    const rows = await this.prisma.qualification.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        shortName: true,
        field: true,
        aliases: { select: { alias: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      shortName: row.shortName,
      field: row.field,
      aliases: row.aliases.map((a) => a.alias),
    }));
  }

  private assertPdfFile(file: Express.Multer.File): void {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    const isPdf =
      mime === 'application/pdf' ||
      mime === 'application/x-pdf' ||
      name.endsWith('.pdf');
    if (!isPdf) {
      throw new BadRequestException('Only PDF resumes are supported');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty');
    }
  }
}
