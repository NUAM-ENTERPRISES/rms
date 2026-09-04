import { Injectable, Logger } from '@nestjs/common';
import { DOCUMENT_TYPE, DOCUMENT_TYPE_META } from '../../common/constants/document-types';
import { VertexAiService } from '../../vertex-ai/vertex-ai.service';
import { VertexSchema } from '../../vertex-ai/vertex-ai.types';
import { PdfPageContent } from '../utils/pdf-pages.util';
import { extractPassportFieldsFromText } from '../utils/passport-fields.util';

/**
 * Only these types are saved from a merged recruiter bundle.
 * Everything else (transcript, PCC, marriage, unknown pages) is dropped.
 */
export const BUNDLE_DOC_TYPES: string[] = [
  DOCUMENT_TYPE.RESUME,
  DOCUMENT_TYPE.DEGREE_CERTIFICATE,
  DOCUMENT_TYPE.PASSPORT_PHOTO,
  DOCUMENT_TYPE.PASSPORT_COPY,
  DOCUMENT_TYPE.AADHAAR,
  DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
  DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
].filter(Boolean) as string[];

export const BUNDLE_DOC_TYPE_SET = new Set(BUNDLE_DOC_TYPES);

/**
 * Types the model may return so it can label pages we will not save.
 * DataFlow/PSV reports look like employment verification and otherwise get
 * forced into `experience_certificate`.
 */
export const SKIPPABLE_BUNDLE_DOC_TYPES: string[] = [
  DOCUMENT_TYPE.DATAFLOW_REPORT,
  DOCUMENT_TYPE.TRANSCRIPT,
  DOCUMENT_TYPE.PCC,
  DOCUMENT_TYPE.MARRIAGE_CERTIFICATE,
  DOCUMENT_TYPE.OTHER,
].filter(Boolean) as string[];

export const CLASSIFIER_DOC_TYPES: string[] = [
  ...BUNDLE_DOC_TYPES,
  ...SKIPPABLE_BUNDLE_DOC_TYPES,
];

export function isSaveableBundleDocType(docType: string): boolean {
  return BUNDLE_DOC_TYPE_SET.has(docType);
}

const DATAFLOW_PAGE_RE =
  /dataflow|dataflowgroup|primary source verification|psv report/i;

/** Prefix used so the UI can style identity errors as hard candidate mismatches. */
export const CANDIDATE_MISMATCH_PREFIX = 'Candidate mismatch:';

export interface ClassifiedSegment {
  startPage: number;
  endPage: number;
  docType: string;
  docName?: string;
  confidence: number;
  extracted: Record<string, string | null>;
  reason: string;
  /** False when the model believes this page belongs to someone else. */
  belongsToCandidate?: boolean | null;
}

interface SegmentResponse {
  segments: Array<{
    startPage: number;
    endPage: number;
    docType: string;
    docName?: string | null;
    confidence: number;
    reason?: string | null;
    documentNumber?: string | null;
    fullName?: string | null;
    issuedAt?: string | null;
    expiryDate?: string | null;
    issuer?: string | null;
    /**
     * Whether the person named on the document is the candidate on file.
     * False when this looks like another person's paperwork (wrong bundle).
     */
    belongsToCandidate?: boolean | null;
  }>;
}

const SEGMENT_SCHEMA: VertexSchema = {
  type: 'OBJECT',
  properties: {
    segments: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          startPage: { type: 'INTEGER', description: '1-based first page.' },
          endPage: { type: 'INTEGER', description: '1-based last page.' },
          docType: {
            type: 'STRING',
            description: 'One key from the allowed list.',
            enum: CLASSIFIER_DOC_TYPES,
          },
          docName: {
            type: 'STRING',
            description:
              'Short human label, e.g. the issuing hospital or university.',
            nullable: true,
          },
          confidence: { type: 'NUMBER', description: '0 to 1.' },
          reason: { type: 'STRING', nullable: true },
          documentNumber: {
            type: 'STRING',
            description: 'Passport number, registration number, etc.',
            nullable: true,
          },
          fullName: {
            type: 'STRING',
            description:
              'Person named on the document (employee on experience letters, holder on passport/certificates).',
            nullable: true,
          },
          issuedAt: {
            type: 'STRING',
            description: 'ISO date (YYYY-MM-DD) if printed.',
            nullable: true,
          },
          expiryDate: {
            type: 'STRING',
            description: 'ISO date (YYYY-MM-DD) if printed.',
            nullable: true,
          },
          issuer: { type: 'STRING', nullable: true },
          belongsToCandidate: {
            type: 'BOOLEAN',
            description:
              "True if the named person matches the candidate on file; false if this is clearly another person's document.",
            nullable: true,
          },
        },
        required: ['startPage', 'endPage', 'docType', 'confidence'],
      },
    },
  },
  required: ['segments'],
};

const SYSTEM_INSTRUCTION = `You split a merged PDF of one candidate's documents into the individual documents it contains.

Rules:
- Return contiguous, non-overlapping page ranges for documents you can identify, in order.
- Use only docType values from the allowed enum.
- A multi-page document is ONE segment, not two. A resume that continues onto an education or declaration page is still one resume. A DataFlow/PSV report that spans several pages is one dataflow_report.
- experience_certificate is only an employer-issued work/experience letter (hospital or company letterhead; wording such as "this is to certify that … worked as").
- dataflow_report is a DataFlow / Primary Source Verification (PSV) report. It often has a DATAFLOW watermark, DataFlow Group, a case reference, and tables headed Education / Health License / Employment / Cross Check. Never call that an experience_certificate, even when an employment component is verified.
- School and university certificates (BSc, HSC, SSLC, Higher Secondary, Secondary School Leaving Certificate) are degree_certificate, not experience letters.
- SCFHS / council professional classification cards are registration_certificate.
- Label transcripts, police certificates, marriage certificates, DataFlow reports, and anything else that is not saveable with the matching skippable type. Do not force them into a saveable type.
- Do not create a segment for a blank page.
- Extract fields only when they are actually printed on the page. Never guess a passport number or a date.
- Dates must be ISO format YYYY-MM-DD.
- For passport_copy always extract documentNumber and expiryDate when printed on the bio page (Passport No. / Date of Expiry). Indian numbers look like Y4403682.
- Always extract fullName when a person is named — including resumes, experience / work certificates, degree certificates, registration certificates, Aadhaar, and passports.
- Compare that name to the "Candidate on file" in the prompt. Set belongsToCandidate to true when it is the same person (reordered names and initials count as a match). Set belongsToCandidate to false when the document clearly belongs to a different person.`;

/**
 * Turns a merged PDF into a reviewable list of individual documents.
 *
 * Vertex only ever proposes page ranges and field values; nothing is written
 * until a human confirms the segments and the bundle is applied.
 */
@Injectable()
export class MergedPdfClassifierService {
  private readonly logger = new Logger(MergedPdfClassifierService.name);

  constructor(private readonly vertexAi: VertexAiService) {}

  /**
   * @param pages Output of `extractPdfPages`.
   * @param candidateHint Name and passport of the profile, used only to help
   * the model disambiguate whose document is whose in a mixed bundle.
   */
  async classify(
    pages: PdfPageContent[],
    candidateHint: { fullName: string; passportNumber?: string | null },
  ): Promise<ClassifiedSegment[]> {
    const usablePages = pages.filter((page) => !page.isBlank);
    if (usablePages.length === 0) return [];

    const pageSummaries = usablePages.map((page) => ({
      page: page.pageNumber,
      // Enough text to identify a document and catch labeled passport fields.
      text: page.text.slice(0, 2500),
      scanned: page.isScanned,
      hasImage: Boolean(page.imageBase64),
    }));

    const inlineData = usablePages
      .filter((page) => page.imageBase64)
      .map((page) => ({
        mimeType: page.imageMimeType ?? 'image/jpeg',
        data: page.imageBase64 as string,
      }));

    const prompt = [
      `Candidate on file: ${candidateHint.fullName}${
        candidateHint.passportNumber
          ? ` (passport ${candidateHint.passportNumber})`
          : ''
      }.`,
      '',
      `The PDF has ${pages.length} pages. Blank pages already removed: ${
        pages.length - usablePages.length
      }.`,
      'Pages, in order, with any extractable text:',
      JSON.stringify(pageSummaries),
      '',
      inlineData.length > 0
        ? `The attached ${inlineData.length} images are the scanned pages, in the same order as the pages marked "hasImage": true.`
        : 'No scanned page images are attached.',
      '',
      'Saveable docType values:',
      JSON.stringify(
        BUNDLE_DOC_TYPES.map((type) => ({
          key: type,
          label:
            DOCUMENT_TYPE_META[type as keyof typeof DOCUMENT_TYPE_META]
              ?.displayName ?? type,
        })),
      ),
      '',
      'Skippable docType values (label them, they will not be saved):',
      JSON.stringify(
        SKIPPABLE_BUNDLE_DOC_TYPES.map((type) => ({
          key: type,
          label:
            DOCUMENT_TYPE_META[type as keyof typeof DOCUMENT_TYPE_META]
              ?.displayName ?? type,
        })),
      ),
      '',
      "If any document (including work / experience certificates) names a different person than the candidate on file, set belongsToCandidate to false and still extract that other person's fullName.",
    ].join('\n');

    const { data } = await this.vertexAi.generateStructured<SegmentResponse>({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt,
      responseSchema: SEGMENT_SCHEMA,
      inlineData,
      callerLabel: 'merged-pdf-classifier',
      maxOutputTokens: 8192,
    });

    return this.fillPassportExtracted(
      this.excludeNonSaveablePages(
        this.normalizeSegments(data.segments ?? [], pages.length),
        pages,
      ),
      pages,
    );
  }

  /**
   * Drops DataFlow/PSV pages even when the model labelled them as a saveable
   * type (usually experience_certificate, because of the employment table).
   */
  excludeNonSaveablePages(
    segments: ClassifiedSegment[],
    pages: PdfPageContent[],
  ): ClassifiedSegment[] {
    const byNumber = new Map(pages.map((page) => [page.pageNumber, page]));
    const kept: ClassifiedSegment[] = [];

    for (const segment of segments) {
      const keptPages: number[] = [];
      for (let pageNumber = segment.startPage; pageNumber <= segment.endPage; pageNumber += 1) {
        const page = byNumber.get(pageNumber);
        if (this.looksLikeDataflow(page?.text ?? '')) continue;
        keptPages.push(pageNumber);
      }
      if (keptPages.length === 0) continue;

      const run = this.longestContiguousRun(keptPages);
      if (!run) continue;

      kept.push({
        ...segment,
        startPage: run.startPage,
        endPage: run.endPage,
      });
    }

    return kept;
  }

  /**
   * Passport scans often have no text layer, so the model classifies the
   * pages but leaves number/expiry empty. Fill from any labeled print in the
   * bundle (resume sidebar, DataFlow report, or a born-digital bio page).
   */
  fillPassportExtracted(
    segments: ClassifiedSegment[],
    pages: PdfPageContent[],
  ): ClassifiedSegment[] {
    const fromBundle = extractPassportFieldsFromText(
      pages.map((page) => page.text).join('\n'),
    );
    return segments.map((segment) => {
      if (segment.docType !== DOCUMENT_TYPE.PASSPORT_COPY) return segment;
      const fromPages = extractPassportFieldsFromText(
        pages
          .filter(
            (page) =>
              page.pageNumber >= segment.startPage &&
              page.pageNumber <= segment.endPage,
          )
          .map((page) => page.text)
          .join('\n'),
        { bioPage: true },
      );
      return {
        ...segment,
        extracted: {
          ...segment.extracted,
          documentNumber:
            segment.extracted.documentNumber ||
            fromPages.documentNumber ||
            fromBundle.documentNumber,
          expiryDate:
            segment.extracted.expiryDate ||
            fromPages.expiryDate ||
            fromBundle.expiryDate,
        },
      };
    });
  }

  looksLikeDataflow(text: string): boolean {
    return DATAFLOW_PAGE_RE.test(text);
  }

  private longestContiguousRun(
    pageNumbers: number[],
  ): { startPage: number; endPage: number } | null {
    if (pageNumbers.length === 0) return null;
    const sorted = [...pageNumbers].sort((left, right) => left - right);
    let bestStart = sorted[0];
    let bestEnd = sorted[0];
    let runStart = sorted[0];
    let runEnd = sorted[0];

    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index] === runEnd + 1) {
        runEnd = sorted[index];
        continue;
      }
      if (runEnd - runStart >= bestEnd - bestStart) {
        bestStart = runStart;
        bestEnd = runEnd;
      }
      runStart = sorted[index];
      runEnd = sorted[index];
    }
    if (runEnd - runStart >= bestEnd - bestStart) {
      bestStart = runStart;
      bestEnd = runEnd;
    }
    return { startPage: bestStart, endPage: bestEnd };
  }

  /**
   * Repairs the model's page ranges so they are always usable for splitting.
   *
   * Overlaps and out-of-range pages are corrected rather than rejected, since a
   * mostly-right segmentation a reviewer can nudge beats a hard failure.
   */
  normalizeSegments(
    segments: SegmentResponse['segments'],
    pageCount: number,
  ): ClassifiedSegment[] {
    const cleaned: ClassifiedSegment[] = [];

    const sorted = [...segments].sort(
      (left, right) => left.startPage - right.startPage,
    );

    let previousEnd = 0;
    for (const segment of sorted) {
      let start = Math.max(1, Math.min(pageCount, Math.floor(segment.startPage)));
      let end = Math.max(1, Math.min(pageCount, Math.floor(segment.endPage)));
      if (end < start) [start, end] = [end, start];

      // Trim any overlap with the previous segment rather than dropping either.
      if (start <= previousEnd) start = previousEnd + 1;
      if (start > pageCount || start > end) continue;

      if (!BUNDLE_DOC_TYPES.includes(segment.docType)) {
        previousEnd = end;
        continue;
      }

      const docType = segment.docType;

      cleaned.push({
        startPage: start,
        endPage: end,
        docType,
        docName: segment.docName?.trim() || undefined,
        confidence: Number.isFinite(segment.confidence)
          ? Math.max(0, Math.min(1, segment.confidence))
          : 0,
        reason: segment.reason?.trim() || '',
        belongsToCandidate:
          typeof segment.belongsToCandidate === 'boolean'
            ? segment.belongsToCandidate
            : null,
        extracted: {
          documentNumber: this.clean(segment.documentNumber),
          fullName: this.clean(segment.fullName),
          issuedAt: this.isoDate(segment.issuedAt),
          expiryDate: this.isoDate(segment.expiryDate),
          issuer: this.clean(segment.issuer),
        },
      });

      previousEnd = end;
    }

    return cleaned;
  }

  /**
   * Flags extracted values that disagree with the candidate profile.
   *
   * A mismatched name (resume, work/experience certificate, passport, etc.)
   * usually means the wrong person's bundle was uploaded — surface that as an
   * explicit candidate mismatch error before anything is saved.
   */
  buildWarnings(
    segment: ClassifiedSegment,
    candidate: {
      firstName: string;
      lastName: string | null;
      passportNumber: string | null;
    },
  ): string[] {
    const warnings: string[] = [];
    const profileName =
      `${candidate.firstName} ${candidate.lastName ?? ''}`.trim();

    const extractedName = segment.extracted.fullName;
    const nameMismatch =
      Boolean(extractedName) &&
      !this.namesOverlap(extractedName as string, profileName);
    const modelSaidMismatch = segment.belongsToCandidate === false;

    if (modelSaidMismatch || nameMismatch) {
      const named = extractedName?.trim() || 'a different person';
      warnings.push(
        `${CANDIDATE_MISMATCH_PREFIX} document names "${named}" but this profile is "${profileName}". Upload this candidate's own documents (including work certificates).`,
      );
    }

    const extractedNumber = segment.extracted.documentNumber;
    if (
      extractedNumber &&
      candidate.passportNumber &&
      segment.docType === DOCUMENT_TYPE.PASSPORT_COPY &&
      extractedNumber.replace(/\s/g, '').toUpperCase() !==
        candidate.passportNumber.replace(/\s/g, '').toUpperCase()
    ) {
      warnings.push(
        `${CANDIDATE_MISMATCH_PREFIX} passport number "${extractedNumber}" does not match "${candidate.passportNumber}" on the profile.`,
      );
    }

    if (segment.confidence > 0 && segment.confidence < 0.6) {
      warnings.push('Low confidence; confirm the document type.');
    }

    return warnings;
  }

  /**
   * Name comparison is deliberately loose. Indian names in these sheets are
   * frequently reordered or initialised, so any shared token counts as a match
   * and only a completely disjoint name raises a warning.
   */
  private namesOverlap(left: string, right: string): boolean {
    const tokenize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 2);

    const leftTokens = new Set(tokenize(left));
    const rightTokens = tokenize(right);
    if (leftTokens.size === 0 || rightTokens.length === 0) return true;
    return rightTokens.some((token) => leftTokens.has(token));
  }

  private clean(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private isoDate(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }
}
