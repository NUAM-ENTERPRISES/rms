import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BadRequestException, Logger } from '@nestjs/common';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

const logger = new Logger('ResumePdfTextExtractor');

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

/**
 * Extract plain text from a PDF buffer using pdfjs (no OCR).
 * Preserves line breaks when pdfjs marks EOL so education sections stay parseable.
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
      let pageText = '';
      for (const item of content.items) {
        if (!('str' in item) || !item.str) continue;
        pageText += item.str.replace(/\u0000/g, '');
        if ('hasEOL' in item && item.hasEOL) {
          pageText += '\n';
        } else {
          pageText += ' ';
        }
      }
      pages.push(pageText.replace(/[ \t]+\n/g, '\n').trim());
    }

    await pdf.destroy();
    return pages
      .join('\n')
      .replace(/\u0000/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (err) {
    logger.warn(
      `PDF text extraction failed: ${err instanceof Error ? err.message : err}`,
    );
    throw new BadRequestException('Could not extract text from resume PDF');
  }
}
