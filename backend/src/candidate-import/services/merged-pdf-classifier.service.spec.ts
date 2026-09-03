import { Test } from '@nestjs/testing';
import { DOCUMENT_TYPE } from '../../common/constants/document-types';
import { VertexAiService } from '../../vertex-ai/vertex-ai.service';
import { PdfPageContent } from '../utils/pdf-pages.util';
import { MergedPdfClassifierService } from './merged-pdf-classifier.service';

function page(
  pageNumber: number,
  overrides: Partial<PdfPageContent> = {},
): PdfPageContent {
  return {
    pageNumber,
    text: `Page ${pageNumber} content that is long enough to be treated as text.`,
    isScanned: false,
    isBlank: false,
    ...overrides,
  };
}

describe('MergedPdfClassifierService', () => {
  let service: MergedPdfClassifierService;
  let generateStructured: jest.Mock;

  beforeEach(async () => {
    generateStructured = jest.fn().mockResolvedValue({ data: { segments: [] } });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MergedPdfClassifierService,
        { provide: VertexAiService, useValue: { generateStructured } },
      ],
    }).compile();

    service = moduleRef.get(MergedPdfClassifierService);
  });

  describe('normalizeSegments', () => {
    it('keeps a clean segmentation of the real bundle shape untouched', () => {
      // Mirrors VISITHRA RAJESH.pdf: resume, certificates, DataFlow report,
      // experience letter, registration, then scanned pages.
      const segments = service.normalizeSegments(
        [
          { startPage: 1, endPage: 1, docType: DOCUMENT_TYPE.RESUME, confidence: 0.97 },
          { startPage: 2, endPage: 3, docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, confidence: 0.9 },
          { startPage: 4, endPage: 9, docType: DOCUMENT_TYPE.OTHER, confidence: 0.8 },
          { startPage: 10, endPage: 10, docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, confidence: 0.88 },
          { startPage: 11, endPage: 11, docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE, confidence: 0.92 },
          { startPage: 12, endPage: 14, docType: DOCUMENT_TYPE.PASSPORT_COPY, confidence: 0.85 },
        ],
        14,
      );

      expect(segments).toHaveLength(6);
      expect(segments.map((s) => [s.startPage, s.endPage])).toEqual([
        [1, 1],
        [2, 3],
        [4, 9],
        [10, 10],
        [11, 11],
        [12, 14],
      ]);
    });

    it('trims an overlap instead of producing two segments containing the same page', () => {
      const segments = service.normalizeSegments(
        [
          { startPage: 1, endPage: 5, docType: DOCUMENT_TYPE.RESUME, confidence: 0.9 },
          { startPage: 4, endPage: 8, docType: DOCUMENT_TYPE.PASSPORT_COPY, confidence: 0.9 },
        ],
        10,
      );

      expect(segments.map((s) => [s.startPage, s.endPage])).toEqual([
        [1, 5],
        [6, 8],
      ]);
    });

    it('clamps a page range that runs past the end of the file', () => {
      const segments = service.normalizeSegments(
        [{ startPage: 1, endPage: 99, docType: DOCUMENT_TYPE.RESUME, confidence: 0.9 }],
        4,
      );

      expect(segments[0].endPage).toBe(4);
    });

    it('repairs a reversed range rather than dropping the document', () => {
      const segments = service.normalizeSegments(
        [{ startPage: 6, endPage: 3, docType: DOCUMENT_TYPE.RESUME, confidence: 0.9 }],
        10,
      );

      expect(segments[0].startPage).toBe(3);
      expect(segments[0].endPage).toBe(6);
    });

    it('sorts out-of-order segments so splitting walks the file forwards', () => {
      const segments = service.normalizeSegments(
        [
          { startPage: 5, endPage: 6, docType: DOCUMENT_TYPE.PASSPORT_COPY, confidence: 0.9 },
          { startPage: 1, endPage: 2, docType: DOCUMENT_TYPE.RESUME, confidence: 0.9 },
        ],
        10,
      );

      expect(segments.map((s) => s.startPage)).toEqual([1, 5]);
    });

    it('drops a segment fully swallowed by the previous one', () => {
      const segments = service.normalizeSegments(
        [
          { startPage: 1, endPage: 8, docType: DOCUMENT_TYPE.RESUME, confidence: 0.9 },
          { startPage: 3, endPage: 5, docType: DOCUMENT_TYPE.PASSPORT_COPY, confidence: 0.9 },
        ],
        10,
      );

      expect(segments).toHaveLength(1);
    });

    it('falls back to "other" for a doc type outside the allowed list', () => {
      const segments = service.normalizeSegments(
        [{ startPage: 1, endPage: 1, docType: 'not_a_real_type', confidence: 0.9 }],
        3,
      );

      expect(segments[0].docType).toBe(DOCUMENT_TYPE.OTHER);
    });

    it('clamps confidence into 0-1 and treats a missing value as zero', () => {
      const segments = service.normalizeSegments(
        [
          { startPage: 1, endPage: 1, docType: DOCUMENT_TYPE.RESUME, confidence: 4 },
          { startPage: 2, endPage: 2, docType: DOCUMENT_TYPE.RESUME, confidence: Number.NaN },
        ],
        3,
      );

      expect(segments[0].confidence).toBe(1);
      expect(segments[1].confidence).toBe(0);
    });

    it('keeps only ISO dates, so a half-read date never reaches the profile', () => {
      const segments = service.normalizeSegments(
        [
          {
            startPage: 1,
            endPage: 1,
            docType: DOCUMENT_TYPE.PASSPORT_COPY,
            confidence: 0.9,
            issuedAt: '2026-06-06',
            expiryDate: '05/06/2028',
          },
        ],
        3,
      );

      expect(segments[0].extracted.issuedAt).toBe('2026-06-06');
      expect(segments[0].extracted.expiryDate).toBeNull();
    });
  });

  describe('buildWarnings', () => {
    const candidate = {
      firstName: 'Visithra',
      lastName: 'Rajesh',
      passportNumber: 'P1234567',
    };

    const segment = (overrides: Record<string, unknown> = {}) =>
      service.normalizeSegments(
        [
          {
            startPage: 1,
            endPage: 1,
            docType: DOCUMENT_TYPE.PASSPORT_COPY,
            confidence: 0.95,
            ...overrides,
          },
        ],
        3,
      )[0];

    it('stays quiet when the document agrees with the profile', () => {
      const warnings = service.buildWarnings(
        segment({ fullName: 'Visithra Rajesh', documentNumber: 'P1234567' }),
        candidate,
      );

      expect(warnings).toHaveLength(0);
    });

    it('accepts a reordered name, which is normal in these documents', () => {
      const warnings = service.buildWarnings(
        segment({ fullName: 'RAJESH VISITHRA', documentNumber: 'P1234567' }),
        candidate,
      );

      expect(warnings).toHaveLength(0);
    });

    it('warns when the document belongs to somebody else entirely', () => {
      const warnings = service.buildWarnings(
        segment({ fullName: 'Anjali Menon' }),
        candidate,
      );

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Candidate mismatch');
      expect(warnings[0]).toContain('Anjali Menon');
    });

    it('flags a work certificate the model says belongs to someone else', () => {
      const experience = service.normalizeSegments(
        [
          {
            startPage: 1,
            endPage: 1,
            docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
            confidence: 0.9,
            fullName: 'Anjali Menon',
            belongsToCandidate: false,
          },
        ],
        1,
      )[0];

      const warnings = service.buildWarnings(experience, candidate);

      expect(warnings[0]).toContain('Candidate mismatch');
      expect(warnings[0]).toContain('work certificates');
    });

    it('warns when a passport number contradicts the profile', () => {
      const warnings = service.buildWarnings(
        segment({ fullName: 'Visithra Rajesh', documentNumber: 'P9999999' }),
        candidate,
      );

      expect(warnings.some((w) => w.includes('Candidate mismatch'))).toBe(true);
      expect(warnings.some((w) => w.includes('P9999999'))).toBe(true);
    });

    it('ignores spacing differences in the passport number', () => {
      const warnings = service.buildWarnings(
        segment({ fullName: 'Visithra Rajesh', documentNumber: 'p 123 4567' }),
        candidate,
      );

      expect(warnings).toHaveLength(0);
    });

    it('asks for a second look when the model was unsure', () => {
      const warnings = service.buildWarnings(
        segment({ fullName: 'Visithra Rajesh', confidence: 0.4 }),
        candidate,
      );

      expect(warnings.some((w) => w.includes('Low confidence'))).toBe(true);
    });
  });

  describe('classify', () => {
    it('does not call Vertex at all when every page is blank', async () => {
      const result = await service.classify(
        [page(1, { isBlank: true, text: '' })],
        { fullName: 'Visithra Rajesh' },
      );

      expect(result).toEqual([]);
      expect(generateStructured).not.toHaveBeenCalled();
    });

    it('excludes blank pages from the prompt but still numbers pages by the original file', async () => {
      await service.classify(
        [page(1), page(2, { isBlank: true, text: '' }), page(3)],
        { fullName: 'Visithra Rajesh' },
      );

      const { prompt } = generateStructured.mock.calls[0][0];
      expect(prompt).toContain('Blank pages already removed: 1');
      expect(prompt).toContain('The PDF has 3 pages');
    });

    it('attaches rendered scans as inline images using their own mime type', async () => {
      await service.classify(
        [
          page(1),
          page(2, {
            isScanned: true,
            text: '',
            imageBase64: 'AAAA',
            imageMimeType: 'image/jpeg',
          }),
        ],
        { fullName: 'Visithra Rajesh' },
      );

      const { inlineData } = generateStructured.mock.calls[0][0];
      expect(inlineData).toEqual([{ mimeType: 'image/jpeg', data: 'AAAA' }]);
    });

    it('passes the passport number as a hint so mixed bundles can be told apart', async () => {
      await service.classify([page(1)], {
        fullName: 'Visithra Rajesh',
        passportNumber: 'P1234567',
      });

      const { prompt } = generateStructured.mock.calls[0][0];
      expect(prompt).toContain('P1234567');
    });
  });
});
