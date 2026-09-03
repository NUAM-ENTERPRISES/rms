import { Injectable, Logger } from '@nestjs/common';
import { DOCUMENT_TYPE, DOCUMENT_TYPE_META } from '../../common/constants/document-types';
import { VertexAiService } from '../../vertex-ai/vertex-ai.service';
import { VertexSchema } from '../../vertex-ai/vertex-ai.types';
import { PdfPageContent } from '../utils/pdf-pages.util';

/**
 * Doc types a merged recruiter bundle realistically contains.
 *
 * The full catalog is ~100 types; offering all of them makes the model pick
 * near-synonyms like `degree_certificate_attested` for a plain degree scan.
 */
export const BUNDLE_DOC_TYPES: string[] = [
  DOCUMENT_TYPE.RESUME,
  DOCUMENT_TYPE.PASSPORT_COPY,
  DOCUMENT_TYPE.PASSPORT_PHOTO,
  DOCUMENT_TYPE.DEGREE_CERTIFICATE,
  DOCUMENT_TYPE.TRANSCRIPT,
  DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
  DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
  DOCUMENT_TYPE.GOOD_STANDING_CERTIFICATE,
  DOCUMENT_TYPE.PCC,
  DOCUMENT_TYPE.MARRIAGE_CERTIFICATE,
  DOCUMENT_TYPE.OTHER,
].filter(Boolean) as string[];

export interface ClassifiedSegment {
  startPage: number;
  endPage: number;
  docType: string;
  docName?: string;
  confidence: number;
  extracted: Record<string, string | null>;
  reason: string;
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
            enum: BUNDLE_DOC_TYPES,
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
            description: 'Person named on the document.',
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
        },
        required: ['startPage', 'endPage', 'docType', 'confidence'],
      },
    },
  },
  required: ['segments'],
};

const SYSTEM_INSTRUCTION = `You split a merged PDF of one candidate's documents into the individual documents it contains.

Rules:
- Return contiguous, non-overlapping page ranges that cover the pages given to you, in order.
- A multi-page document (a two-page resume, a passport front and back) is ONE segment, not two.
- Use only docType values from the allowed enum.
- Do not create a segment for a blank page.
- Extract fields only when they are actually printed on the page. Never guess a passport number or a date.
- Dates must be ISO format YYYY-MM-DD.
- If you cannot tell what a document is, use "other" with low confidence rather than guessing a specific type.`;

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
      // Enough text to identify a document without blowing up the prompt.
      text: page.text.slice(0, 1200),
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
      'Allowed docType values:',
      JSON.stringify(
        BUNDLE_DOC_TYPES.map((type) => ({
          key: type,
          label:
            DOCUMENT_TYPE_META[type as keyof typeof DOCUMENT_TYPE_META]
              ?.displayName ?? type,
        })),
      ),
    ].join('\n');

    const { data } = await this.vertexAi.generateStructured<SegmentResponse>({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt,
      responseSchema: SEGMENT_SCHEMA,
      inlineData,
      callerLabel: 'merged-pdf-classifier',
      maxOutputTokens: 8192,
    });

    return this.normalizeSegments(data.segments ?? [], pages.length);
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

      const docType = BUNDLE_DOC_TYPES.includes(segment.docType)
        ? segment.docType
        : DOCUMENT_TYPE.OTHER;

      cleaned.push({
        startPage: start,
        endPage: end,
        docType,
        docName: segment.docName?.trim() || undefined,
        confidence: Number.isFinite(segment.confidence)
          ? Math.max(0, Math.min(1, segment.confidence))
          : 0,
        reason: segment.reason?.trim() || '',
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
   * A mismatched name usually means the wrong bundle was uploaded, which is
   * exactly the mistake worth catching before documents land on a profile.
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

    const extractedName = segment.extracted.fullName;
    if (extractedName) {
      const profileName = `${candidate.firstName} ${candidate.lastName ?? ''}`;
      if (!this.namesOverlap(extractedName, profileName)) {
        warnings.push(
          `Document names "${extractedName}" but the profile is "${profileName.trim()}".`,
        );
      }
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
        `Passport number "${extractedNumber}" does not match "${candidate.passportNumber}" on the profile.`,
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
