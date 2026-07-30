import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BulkResumeParseDto } from './dto/bulk-resume-parse.dto';
import { BulkResumeCreateDto } from './dto/bulk-resume-create.dto';
import { BulkResumeTempFileStore } from './bulk-resume-temp-file.store';
import { CandidatesService } from '../candidates.service';
import { UploadService } from '../../upload/upload.service';
import { PrismaService } from '../../database/prisma.service';

const BULK_RESUME_MAX_FILES = 25;
const BULK_RESUME_PARSE_PAGE_LIMIT = 10;

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
type PdfTextContentItem = { str?: string; transform?: number[] };
let pdfJsLoadPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsLoadPromise) {
    const requireFromBackend = createRequire(
      join(__dirname, '../../../package.json'),
    );
    const workerPath = requireFromBackend.resolve(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
    );
    pdfJsLoadPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = workerPath;
      return mod;
    });
  }
  return pdfJsLoadPromise;
}

@Injectable()
export class BulkResumeCandidateService {
  private readonly logger = new Logger(BulkResumeCandidateService.name);

  constructor(
    private readonly tempFileStore: BulkResumeTempFileStore,
    private readonly candidatesService: CandidatesService,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  assertBulkPermissions(user: { permissions?: string[] }): void {
    const permissions = user.permissions ?? [];
    if (
      permissions.includes('*') ||
      permissions.includes('manage:all') ||
      permissions.includes('write:all')
    ) {
      return;
    }

    const hasCreate = permissions.includes('write:candidates');
    const hasBulk = permissions.includes('write:candidates_bulk_resume');
    if (!hasCreate || !hasBulk) {
      throw new ForbiddenException(
        'You need both write:candidates and write:candidates_bulk_resume permissions to use bulk resume creation.',
      );
    }
  }

  async parseResumes(
    files: Express.Multer.File[],
    payload: BulkResumeParseDto,
    user: { permissions?: string[] },
  ) {
    this.assertBulkPermissions(user);
    if (!files?.length) {
      throw new BadRequestException('At least one PDF file is required.');
    }
    if (files.length > BULK_RESUME_PARSE_PAGE_LIMIT) {
      throw new BadRequestException(
        `Maximum ${BULK_RESUME_PARSE_PAGE_LIMIT} files are allowed per parse request.`,
      );
    }
    if (files.length > BULK_RESUME_MAX_FILES) {
      throw new BadRequestException(
        `Maximum ${BULK_RESUME_MAX_FILES} files are allowed.`,
      );
    }

    const drafts: Array<Record<string, unknown>> = [];
    const failed: Array<{ fileName: string; reason: string }> = [];

    for (const file of files) {
      if (!file || !file.buffer || file.size === 0) {
        failed.push({
          fileName: file?.originalname ?? 'unknown',
          reason: 'File is empty.',
        });
        continue;
      }
      if (file.mimetype !== 'application/pdf') {
        failed.push({
          fileName: file.originalname,
          reason: 'Only PDF files are supported.',
        });
        continue;
      }

      try {
        const text = await this.extractTextFromPdf(file.buffer);
        const parsed = this.parseDraftFromText(text);
        const draftId = randomUUID();
        this.tempFileStore.set(draftId, { file, fileName: file.originalname });
        drafts.push({
          draftId,
          fileName: file.originalname,
          ...parsed,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to parse ${file.originalname}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        failed.push({
          fileName: file.originalname,
          reason: 'Failed to parse resume text.',
        });
      }
    }

    return {
      drafts,
      failed,
      source: payload.source ?? 'manual',
      professionTypeId: payload.professionTypeId ?? null,
      roleCatalogId: payload.roleCatalogId ?? null,
    };
  }

  async createFromDrafts(
    payload: BulkResumeCreateDto,
    user: { id: string; permissions?: string[] },
  ) {
    this.assertBulkPermissions(user);
    if (!payload.drafts?.length) {
      throw new BadRequestException('At least one draft is required.');
    }

    const resolvedProfessionTypeId = await this.resolveProfessionTypeId(
      payload.professionTypeId,
    );

    const created: Array<{
      draftId: string;
      candidateId: string;
      name: string;
      fileName: string;
      resumeAttached: boolean;
    }> = [];
    const failed: Array<{ draftId: string; fileName: string; reason: string }> =
      [];

    for (const draft of payload.drafts) {
      if (!draft.countryCode || !draft.mobileNumber) {
        failed.push({
          draftId: draft.draftId,
          fileName: draft.fileName ?? 'unknown',
          reason: 'Phone (countryCode + mobileNumber) is required.',
        });
        continue;
      }

      const storedFile = this.tempFileStore.get(draft.draftId);
      if (!storedFile) {
        failed.push({
          draftId: draft.draftId,
          fileName: draft.fileName ?? 'unknown',
          reason: 'Draft has expired. Please parse resumes again.',
        });
        continue;
      }

      try {
        const candidate = await this.candidatesService.create(
          {
            firstName: (draft.firstName || '').trim() || 'Unknown',
            lastName: (draft.lastName || '').trim() || 'Candidate',
            countryCode: draft.countryCode,
            mobileNumber: draft.mobileNumber,
            email: draft.email,
            source: payload.source ?? 'manual',
            professionTypeId: resolvedProfessionTypeId,
            passportNumber: draft.passportNumber,
            dateOfBirth: draft.dateOfBirth,
            address: draft.address,
            qualifications: (draft.educations ?? [])
              .filter((row) => !!row.qualificationId)
              .map((row) => ({
                qualificationId: row.qualificationId as string,
                university: row.university,
                graduationYear: row.graduationYear
                  ? Number(row.graduationYear)
                  : undefined,
                notes: row.notes,
                isCompleted: true,
              })),
            workExperiences: (draft.workExperiences ?? [])
              .filter((row) => !!row.jobTitle && !!row.startDate)
              .map((row) => ({
                jobTitle: row.jobTitle as string,
                companyName: row.companyName,
                location: row.location,
                startDate: row.startDate as string,
                endDate: row.endDate,
                isCurrent: Boolean(row.isCurrent),
                description: row.description,
              })),
          },
          user.id,
        );

        let resumeAttached = false;
        try {
          await this.uploadService.uploadResume(
            storedFile.file,
            candidate.id,
            payload.roleCatalogId,
            storedFile.fileName,
          );
          resumeAttached = true;
        } catch (error) {
          failed.push({
            draftId: draft.draftId,
            fileName: storedFile.fileName,
            reason: `Candidate created but resume upload failed: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          });
        }

        created.push({
          draftId: draft.draftId,
          candidateId: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`.trim(),
          fileName: storedFile.fileName,
          resumeAttached,
        });
      } catch (error) {
        failed.push({
          draftId: draft.draftId,
          fileName: storedFile.fileName,
          reason:
            error instanceof Error ? error.message : 'Failed to create candidate.',
        });
      } finally {
        this.tempFileStore.delete(draft.draftId);
      }
    }

    return { created, failed };
  }

  async createOneShot(
    files: Express.Multer.File[],
    parsePayload: BulkResumeParseDto,
    user: { id: string; permissions?: string[] },
  ) {
    const parsed = await this.parseResumes(files, parsePayload, user);
    const drafts = parsed.drafts.map((draft) => ({
      draftId: String(draft.draftId ?? ''),
      fileName: String(draft.fileName ?? ''),
      firstName: String(draft.firstName ?? ''),
      lastName: String(draft.lastName ?? ''),
      email: String(draft.email ?? ''),
      countryCode: String(draft.countryCode ?? ''),
      mobileNumber: String(draft.mobileNumber ?? ''),
      passportNumber: String(draft.passportNumber ?? ''),
      dateOfBirth: String(draft.dateOfBirth ?? ''),
      address: String(draft.address ?? ''),
      educations: Array.isArray(draft.educations) ? draft.educations : [],
      workExperiences: Array.isArray(draft.workExperiences)
        ? draft.workExperiences
        : [],
    }));
    const created = await this.createFromDrafts(
      {
        source: parsed.source ?? undefined,
        professionTypeId: parsed.professionTypeId ?? undefined,
        roleCatalogId: parsed.roleCatalogId ?? undefined,
        drafts,
      },
      user,
    );
    return {
      parsed,
      ...created,
    };
  }

  private async resolveProfessionTypeId(
    requestedProfessionTypeId?: string,
  ): Promise<string> {
    if (requestedProfessionTypeId) {
      return requestedProfessionTypeId;
    }
    const firstProfessionType = await this.prisma.professionType.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    if (!firstProfessionType) {
      throw new BadRequestException(
        'professionTypeId is required when no active profession type is configured.',
      );
    }
    return firstProfessionType.id;
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    const { getDocument } = await loadPdfJs();
    const data = new Uint8Array(buffer);
    const pdf = await getDocument({ data }).promise;
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const lineMap = new Map<number, string[]>();
        for (const item of content.items) {
          const textItem = item as PdfTextContentItem;
          const chunk = (textItem.str ?? '').replace(/\u0000/g, '').trim();
          if (!chunk) continue;
          const y = Math.round((textItem.transform?.[5] ?? 0) * 2) / 2;
          const line = lineMap.get(y) ?? [];
          line.push(chunk);
          lineMap.set(y, line);
        }

        const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
        const lines = sortedYs.map((y) => (lineMap.get(y) ?? []).join(' ').trim());
        const text = lines.join('\n');
        pages.push(text);
        page.cleanup();
      }
      return pages.join('\n');
    } finally {
      await pdf.destroy();
    }
  }

  private parseDraftFromText(text: string): Record<string, unknown> {
    const sanitizedText = text
      .replace(/\u0000/g, ' ')
      .replace(/[•\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const lines = text
      .split('\n')
      .map((line) => line.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const emailMatch = sanitizedText.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/,
    );
    const phoneMatch = sanitizedText.match(/(\+\d{1,4})?[\s-]?\d{6,15}/);
    const passportMatch = sanitizedText.match(/[A-Z][0-9]{7}/);
    const nameLine = this.detectNameLine(lines);
    const nameParts = nameLine?.split(/\s+/).filter(Boolean) ?? [];
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const countryCode = phoneMatch?.[1] ?? '+91';
    const mobileDigits = (phoneMatch?.[0] ?? '').replace(/\D/g, '');
    const mobileNumber = mobileDigits.length >= 6 ? mobileDigits : '';
    const educations = this.extractEducations(lines);
    const workExperiences = this.extractWorkExperiences(lines);

    const warnings: string[] = [];
    if (!firstName) warnings.push('Could not confidently parse candidate name.');
    if (!mobileNumber) warnings.push('Could not parse a valid mobile number.');
    if (educations.length === 0)
      warnings.push('Could not detect education details from this resume.');
    if (workExperiences.length === 0)
      warnings.push('Could not detect work experience details from this resume.');

    return {
      firstName: firstName ?? '',
      lastName,
      email: emailMatch?.[0] ?? '',
      countryCode,
      mobileNumber,
      passportNumber: passportMatch?.[0] ?? '',
      dateOfBirth: undefined,
      address: '',
      educations,
      workExperiences,
      warnings,
    };
  }

  private detectNameLine(lines: string[]): string | undefined {
    const stopWords = new Set([
      'SUMMARY',
      'EXPERIENCE',
      'EDUCATION',
      'SKILLS',
      'PROJECTS',
      'KEY ACHIEVEMENTS',
    ]);

    const candidate = lines.find((line) => {
      const normalized = line.trim();
      if (!normalized) return false;
      if (stopWords.has(normalized.toUpperCase())) return false;
      if (normalized.includes('@') || normalized.includes('http')) return false;
      if (/\d/.test(normalized)) return false;
      const tokens = normalized.split(/\s+/).filter(Boolean);
      if (tokens.length < 2 || tokens.length > 4) return false;
      return tokens.every((t) => /^[A-Za-z][A-Za-z'.-]*$/.test(t));
    });

    return candidate;
  }

  private extractSection(
    lines: string[],
    startHeaderRegex: RegExp,
    endHeaderRegexes: RegExp[],
  ): string[] {
    const startIndex = lines.findIndex((line) => startHeaderRegex.test(line));
    if (startIndex < 0) return [];

    const section: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (endHeaderRegexes.some((regex) => regex.test(line))) break;
      section.push(line);
    }
    return section;
  }

  private extractEducations(lines: string[]): Array<{
    rawDegree?: string;
    qualificationId?: string;
    university?: string;
    graduationYear?: string;
    notes?: string;
  }> {
    const educationBlock = this.extractSection(
      lines,
      /^EDUCATION$/i,
      [/^SKILLS$/i, /^PROJECTS$/i, /^EXPERIENCE$/i, /^KEY ACHIEVEMENTS$/i],
    );

    const sourceLines = educationBlock.length > 0 ? educationBlock : lines;
    const educationKeywords =
      /\b(bachelor|master|bsc|msc|b\.?tech|m\.?tech|mbbs|bds|gnm|anm|diploma|degree|phd|education|course)\b/i;
    const monthYearRangeRegex =
      /\b(\d{1,2}\/\d{4})\s*[-–]\s*(present|current|\d{1,2}\/\d{4})\b/i;
    const yearRangeRegex = /\b((19|20)\d{2})\s*[-–]\s*((19|20)\d{2})\b/i;
    const yearRegex = /\b(19|20)\d{2}\b/g;
    const results: Array<{
      rawDegree?: string;
      qualificationId?: string;
      university?: string;
      graduationYear?: string;
      notes?: string;
    }> = [];

    for (let i = 0; i < sourceLines.length; i++) {
      const line = sourceLines[i];
      if (!educationKeywords.test(line)) continue;

      const nextLine = sourceLines[i + 1] ?? '';
      const currentRange = line.match(monthYearRangeRegex) ?? line.match(yearRangeRegex);
      const nextRange = nextLine.match(monthYearRangeRegex) ?? nextLine.match(yearRangeRegex);
      const range = currentRange ?? nextRange;
      let graduationYear: string | undefined;

      if (range) {
        const endToken = range[2] ?? range[3];
        const yearPart = endToken?.match(/\b(19|20)\d{2}\b/)?.[0];
        graduationYear = yearPart;
      }

      if (!graduationYear) {
        const years = Array.from(line.matchAll(yearRegex)).map((match) => match[0]);
        graduationYear = years.length > 0 ? years[years.length - 1] : undefined;
      }

      const universityLine = nextLine;
      const looksLikeUniversity =
        universityLine.length > 0 &&
        !educationKeywords.test(universityLine) &&
        !/^\d{1,2}\/\d{4}\s*[-–]\s*/.test(universityLine) &&
        !/^SKILLS$|^PROJECTS$|^EXPERIENCE$/i.test(universityLine);

      results.push({
        rawDegree: line.slice(0, 120),
        university: looksLikeUniversity ? universityLine.slice(0, 120) : undefined,
        graduationYear,
        notes: [line, looksLikeUniversity ? universityLine : '']
          .filter(Boolean)
          .join(' | ')
          .slice(0, 200),
      });
      if (results.length >= 5) break;
    }

    return results;
  }

  private extractWorkExperiences(lines: string[]): Array<{
    jobTitle?: string;
    companyName?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
  }> {
    const experienceBlock = this.extractSection(
      lines,
      /^EXPERIENCE$/i,
      [/^EDUCATION$/i, /^SKILLS$/i, /^PROJECTS$/i, /^KEY ACHIEVEMENTS$/i],
    );
    const sourceLines = experienceBlock.length > 0 ? experienceBlock : lines;

    const roleKeywords =
      /\b(software engineer|developer|engineer|experience|worked|employment|technician|doctor|assistant|manager|executive|analyst|consultant)\b/i;
    const monthYearRangeRegex =
      /\b(\d{1,2}\/\d{4})\s*[-–]\s*(present|current|\d{1,2}\/\d{4})\b/i;
    const yearRangeRegex = /\b((19|20)\d{2})\s*[-–]\s*((19|20)\d{2}|present|current)\b/i;
    const results: Array<{
      jobTitle?: string;
      companyName?: string;
      location?: string;
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
      description?: string;
    }> = [];

    for (let i = 0; i < sourceLines.length; i++) {
      const line = sourceLines[i];
      const monthRangeMatch = line.match(monthYearRangeRegex);
      const yearRangeMatch = line.match(yearRangeRegex);
      const hasDateRange = Boolean(monthRangeMatch || yearRangeMatch);
      if (!hasDateRange && !roleKeywords.test(line)) continue;

      const previousLine = sourceLines[i - 1] ?? '';
      const roleSource = hasDateRange && previousLine ? previousLine : line;
      const startToken =
        monthRangeMatch?.[1] ??
        (yearRangeMatch?.[1] ? `${yearRangeMatch[1]}-01-01` : undefined);
      const endToken = monthRangeMatch?.[2] ?? yearRangeMatch?.[3];
      const endValue = endToken?.toLowerCase();
      const isCurrent = endValue === 'present' || endValue === 'current';
      const endResolved = !isCurrent
        ? endToken ??
          (yearRangeMatch?.[3] ? `${yearRangeMatch[3]}-01-01` : undefined)
        : undefined;

      const roleParts = roleSource
        .split(/\t| {2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      const jobTitle = roleParts[0]?.slice(0, 100);
      const companyName =
        roleParts.length > 1 ? roleParts[1].slice(0, 120) : undefined;

      const descriptionLines: string[] = [];
      for (let j = i + 1; j < sourceLines.length && descriptionLines.length < 2; j++) {
        const candidateLine = sourceLines[j];
        if (
          monthYearRangeRegex.test(candidateLine) ||
          yearRangeRegex.test(candidateLine) ||
          /^EDUCATION$|^SKILLS$|^PROJECTS$|^KEY ACHIEVEMENTS$/i.test(candidateLine)
        ) {
          break;
        }
        if (candidateLine.length > 20) descriptionLines.push(candidateLine);
      }

      if (!jobTitle && !companyName && !hasDateRange) continue;

      results.push({
        jobTitle: jobTitle || 'Professional',
        companyName,
        startDate: this.normalizeResumeDate(startToken),
        endDate: this.normalizeResumeDate(endResolved),
        isCurrent,
        description: descriptionLines.join(' ').slice(0, 200) || line.slice(0, 200),
      });
      if (results.length >= 8) break;
    }

    return results;
  }

  private normalizeResumeDate(value?: string): string | undefined {
    if (!value) return undefined;
    const monthYearMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
    if (monthYearMatch) {
      const month = monthYearMatch[1].padStart(2, '0');
      const year = monthYearMatch[2];
      return `${year}-${month}-01`;
    }
    const yearMatch = value.match(/^(\d{4})$/);
    if (yearMatch) {
      return `${yearMatch[1]}-01-01`;
    }
    const iso = Date.parse(value);
    if (!Number.isNaN(iso)) {
      return new Date(iso).toISOString().slice(0, 10);
    }
    return undefined;
  }
}
