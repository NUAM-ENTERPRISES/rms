import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BadRequestException, Logger } from '@nestjs/common';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

type TextContentItem = {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
};

const logger = new Logger('ResumePdfTextExtractor');

/** Bucket Y positions within this many PDF points into the same line. */
const Y_LINE_TOLERANCE = 2;

const requireFromBackend = createRequire(join(__dirname, '../../../package.json'));
const pdfJsDistRoot = dirname(
  requireFromBackend.resolve('pdfjs-dist/package.json'),
);

const pdfWorkerPath = requireFromBackend.resolve(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
);

const pdfJsDocumentBase = {
  standardFontDataUrl: `${pathToFileURL(join(pdfJsDistRoot, 'standard_fonts')).href}/`,
  cMapUrl: `${pathToFileURL(join(pdfJsDistRoot, 'cmaps')).href}/`,
  cMapPacked: true,
};

let pdfJsLoadPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsLoadPromise) {
    pdfJsLoadPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = pdfWorkerPath;
      return mod;
    });
  }
  return pdfJsLoadPromise;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Rebuild lines using glyph Y positions. Designer PDFs (RenderCV, etc.) often
 * omit reliable hasEOL flags, which fuses the name into a giant first line.
 */
function reconstructPageTextByY(items: TextContentItem[]): string {
  type LineBucket = { y: number; parts: Array<{ x: number; str: string }> };
  const buckets: LineBucket[] = [];

  for (const item of items) {
    if (!item.str) continue;
    const str = item.str.replace(/\u0000/g, '');
    if (!str.trim()) continue;
    const y = item.transform?.[5] ?? 0;
    const x = item.transform?.[4] ?? 0;
    const existing = buckets.find(
      (b) => Math.abs(b.y - y) <= Y_LINE_TOLERANCE,
    );
    if (existing) {
      existing.parts.push({ x, str });
      existing.y = (existing.y * (existing.parts.length - 1) + y) / existing.parts.length;
    } else {
      buckets.push({ y, parts: [{ x, str }] });
    }
  }

  if (buckets.length === 0) return '';

  buckets.sort((a, b) => b.y - a.y);
  return buckets
    .map((bucket) =>
      bucket.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(' ')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

/** Legacy hasEOL concat — used only when Y-grouping yields nothing. */
function reconstructPageTextByEol(items: TextContentItem[]): string {
  let pageText = '';
  for (const item of items) {
    if (!item.str) continue;
    pageText += item.str.replace(/\u0000/g, '');
    if (item.hasEOL) {
      pageText += '\n';
    } else {
      pageText += ' ';
    }
  }
  return pageText.replace(/[ \t]+\n/g, '\n').trim();
}

/**
 * Extract plain text from a PDF buffer using pdfjs (no OCR).
 * Prefers Y-position line reconstruction so name/contact lines stay separate
 * on modern resume layouts where hasEOL is unreliable.
 */
export async function extractTextFromPdfBuffer(
  buffer: Buffer,
): Promise<string> {
  try {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      ...pdfJsDocumentBase,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const items: TextContentItem[] = [];
      for (const raw of content.items) {
        if (typeof raw !== 'object' || raw === null || !('str' in raw)) {
          continue;
        }
        const item = raw as TextContentItem;
        if (typeof item.str !== 'string' || !item.str) continue;
        items.push({
          str: item.str,
          hasEOL: item.hasEOL,
          transform: Array.isArray(item.transform)
            ? item.transform
            : undefined,
        });
      }

      const byY = reconstructPageTextByY(items);
      const pageText =
        byY.trim().length > 0 ? byY : reconstructPageTextByEol(items);
      pages.push(pageText.trim());
    }

    await pdf.destroy();
    return normalizeExtractedText(pages.join('\n'));
  } catch (err) {
    logger.warn(
      `PDF text extraction failed: ${err instanceof Error ? err.message : err}`,
    );
    throw new BadRequestException('Could not extract text from resume PDF');
  }
}
