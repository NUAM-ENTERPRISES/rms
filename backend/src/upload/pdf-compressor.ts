import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { createCanvas } from '@napi-rs/canvas';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

const logger = new Logger('PdfCompressor');

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

const requireFromBackend = createRequire(join(__dirname, '../../package.json'));
const pdfJsDistRoot = dirname(requireFromBackend.resolve('pdfjs-dist/package.json'));

/** Absolute path — pdfjs resolves relative workerSrc from its own package dir. */
const pdfWorkerPath = requireFromBackend.resolve(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
);

const pdfJsDocumentBase = {
  standardFontDataUrl: `${pathToFileURL(join(pdfJsDistRoot, 'standard_fonts')).href}/`,
  cMapUrl: `${pathToFileURL(join(pdfJsDistRoot, 'cmaps')).href}/`,
  cMapPacked: true,
};

/** Cap raster work for normal multi-page uploads (certificates, packs). */
const MAX_RASTER_PAGES = 40;
/** Many pages with tiny per-page payload usually means a bloated export. */
const BLOAT_PAGE_COUNT = 50;
const BLOAT_AVG_BYTES_PER_PAGE = 64 * 1024;

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

export type PdfCompressResult = {
  buffer: Buffer;
  wasCompressed: boolean;
  originalSize: number;
};

type CompressionPass = {
  scale: number;
  maxWidth: number;
  quality: number;
  grayscale: boolean;
};

/** Progressive passes: try mild settings first, then more aggressive. */
const COMPRESSION_PASSES: CompressionPass[] = [
  { scale: 2, maxWidth: 1600, quality: 85, grayscale: false },
  { scale: 1.75, maxWidth: 1600, quality: 70, grayscale: false },
  { scale: 1.5, maxWidth: 1600, quality: 55, grayscale: false },
  { scale: 1.5, maxWidth: 1200, quality: 45, grayscale: true },
  { scale: 1.25, maxWidth: 1200, quality: 35, grayscale: true },
  { scale: 1, maxWidth: 1024, quality: 30, grayscale: true },
];

/**
 * Compress PDFs for upload: pdfjs renders pages, sharp encodes JPEG, pdf-lib rebuilds.
 */
export async function compressPdfToTarget(
  input: Buffer,
  targetMaxBytes: number,
): Promise<PdfCompressResult> {
  const originalSize = input.length;
  if (input.length <= targetMaxBytes) {
    return { buffer: input, wasCompressed: false, originalSize };
  }

  let best: Buffer = input;

  for (const pass of COMPRESSION_PASSES) {
    try {
      const candidate = await rasterizeAndRebuildPdf(input, pass);
      if (candidate.length < best.length) {
        best = candidate;
      }
      if (candidate.length <= targetMaxBytes) {
        return {
          buffer: candidate,
          wasCompressed: candidate.length < originalSize,
          originalSize,
        };
      }
    } catch (err) {
      logger.warn(
        `PDF compress pass failed (scale=${pass.scale}, maxWidth=${pass.maxWidth}, quality=${pass.quality}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return {
    buffer: best,
    wasCompressed: best.length < originalSize,
    originalSize,
  };
}

function pagesToRasterize(numPages: number, fileBytes: number): number {
  const avgBytesPerPage = fileBytes / numPages;
  if (
    numPages > BLOAT_PAGE_COUNT &&
    avgBytesPerPage < BLOAT_AVG_BYTES_PER_PAGE
  ) {
    logger.warn(
      `PDF has ${numPages} pages with ~${Math.round(avgBytesPerPage)} bytes/page; rasterizing first page only to compress`,
    );
    return 1;
  }
  return Math.min(numPages, MAX_RASTER_PAGES);
}

async function rasterizeAndRebuildPdf(
  input: Buffer,
  pass: CompressionPass,
): Promise<Buffer> {
  const { getDocument } = await loadPdfJs();
  const data = new Uint8Array(input);
  const pdf = await getDocument({ data, ...pdfJsDocumentBase }).promise;

  try {
    const pageLimit = pagesToRasterize(pdf.numPages, input.length);
    const jpegPages: Buffer[] = [];

    for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
      try {
        const jpeg = await rasterizePage(pdf, pageNum, pass);
        jpegPages.push(jpeg);
      } catch (err) {
        logger.warn(
          `PDF page ${pageNum}/${pdf.numPages} rasterize failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (jpegPages.length === 0) {
      throw new Error('No PDF pages could be rasterized for compression');
    }

    return embedJpegsInPdf(jpegPages);
  } finally {
    await pdf.destroy();
  }
}

async function rasterizePage(
  pdf: PDFDocumentProxy,
  pageNum: number,
  pass: CompressionPass,
): Promise<Buffer> {
  const page = await pdf.getPage(pageNum);
  try {
    const viewport = page.getViewport({ scale: pass.scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    let pipeline = sharp(
      Buffer.from(await canvas.encode('jpeg', pass.quality)),
    ).rotate();

    if (pass.grayscale) {
      pipeline = pipeline.grayscale();
    }

    if (width > pass.maxWidth) {
      pipeline = pipeline.resize({
        width: pass.maxWidth,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    return pipeline
      .jpeg({ quality: pass.quality, mozjpeg: true })
      .toBuffer();
  } finally {
    page.cleanup();
  }
}

async function embedJpegsInPdf(jpegPages: Buffer[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  for (const jpeg of jpegPages) {
    const image = await pdfDoc.embedJpg(jpeg);
    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return Buffer.from(await pdfDoc.save({ useObjectStreams: true }));
}
