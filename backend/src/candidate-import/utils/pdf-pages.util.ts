/**
 * Per-page inspection of a merged PDF.
 *
 * Recruiter bundles mix born-digital pages (a resume exported from Word) with
 * scans of certificates. Text extraction alone is therefore not enough: pages
 * with little or no text layer are rendered to PNG so the model can read them.
 */

export interface PdfPageContent {
  /** 1-based, matching what a reviewer sees in a PDF viewer. */
  pageNumber: number;
  text: string;
  /** True when the text layer is effectively empty, i.e. the page is a scan. */
  isScanned: boolean;
  /** True when the page carries neither text nor meaningful ink. */
  isBlank: boolean;
  /** Base64 JPEG, only produced for scanned pages. */
  imageBase64?: string;
  /** MIME type of `imageBase64`, for the Vertex inline-data part. */
  imageMimeType?: string;
}

/** Below this many characters a page is treated as a scan, not as text. */
const SCANNED_TEXT_THRESHOLD = 40;
/** Below this, and with no image, the page is considered blank. */
const BLANK_TEXT_THRESHOLD = 8;
/** Rendering resolution; enough for the model to read a stamped certificate. */
const RENDER_SCALE = 1.5;
/**
 * Caps the longest rendered edge. A4 at scale 1.5 is already ~1750px, and
 * beyond this the extra pixels only inflate the Vertex payload.
 */
const MAX_RENDER_EDGE = 1600;
/**
 * JPEG, not PNG: these pages are photographs of paperwork, where PNG produced
 * ~2 MB of base64 per page against roughly 150 KB here for the same legibility.
 */
const JPEG_QUALITY = 78;
/**
 * Share of non-white pixels below which a rendered scan is treated as blank.
 * Separator and back-of-certificate pages still pick up scanner speckle, so
 * this sits above zero rather than testing for a perfectly white page.
 */
const BLANK_INK_RATIO = 0.005;

/**
 * Reads every page of a PDF, returning text and (for scans) a rendered image.
 *
 * @param maxRenderedPages Caps how many pages are rasterized, since rendering
 * dominates both time and Vertex payload size on large bundles.
 */
export async function extractPdfPages(
  buffer: Buffer,
  maxRenderedPages = 30,
): Promise<PdfPageContent[]> {
  // pdfjs-dist ships as ESM; the legacy build is the one that works under
  // CommonJS Nest without a bundler.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // Bundles are third-party paperwork; never let a file pull in remote assets.
    useSystemFonts: false,
    isOffscreenCanvasSupported: false,
    // Resolved from the installed package so pages using the base-14 fonts
    // render their glyphs instead of warning and dropping them.
    standardFontDataUrl: resolveStandardFontDir(),
  }).promise;

  const pages: PdfPageContent[] = [];
  let rendered = 0;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      let text = '';
      try {
        const content = await page.getTextContent();
        text = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch {
        // A broken text layer is normal for scans; fall through to rendering.
        text = '';
      }

      const isScanned = text.length < SCANNED_TEXT_THRESHOLD;
      let render: RenderedPage | undefined;

      if (isScanned && rendered < maxRenderedPages) {
        render = await renderPage(page);
        if (render) rendered += 1;
      }

      // A rendered page that carries no ink is a separator or a blank reverse
      // side. Keeping it would waste a Vertex slot and invite a bogus segment.
      const isBlankScan = render ? render.inkRatio < BLANK_INK_RATIO : false;
      const usableRender = render && !isBlankScan ? render : undefined;

      pages.push({
        pageNumber,
        text,
        isScanned,
        isBlank:
          text.length < BLANK_TEXT_THRESHOLD && (isBlankScan || !render),
        imageBase64: usableRender?.base64,
        imageMimeType: usableRender ? 'image/jpeg' : undefined,
      });

      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  return pages;
}

const PHOTO_JPEG_QUALITY = 88;

/**
 * Rasterize the first page of a range to JPEG. Used for passport photos,
 * which must be stored as an image (never as a PDF).
 */
export async function renderPdfPagesToJpeg(
  buffer: Buffer,
  startPage: number,
): Promise<Buffer> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: false,
    isOffscreenCanvasSupported: false,
    standardFontDataUrl: resolveStandardFontDir(),
  }).promise;

  try {
    const pageNumber = Math.min(
      Math.max(1, startPage),
      document.numPages,
    );
    const page = await document.getPage(pageNumber);
    const render = await renderPage(page, PHOTO_JPEG_QUALITY);
    page.cleanup();
    if (!render) {
      throw new Error(
        'Could not convert the passport photo page to an image.',
      );
    }
    return Buffer.from(render.base64, 'base64');
  } finally {
    await document.destroy();
  }
}

function resolveStandardFontDir(): string | undefined {
  try {
    // require.resolve points at the package entry; the fonts sit alongside it.
    const entry = require.resolve('pdfjs-dist/package.json');
    return `${entry.replace(/package\.json$/, '')}standard_fonts/`;
  } catch {
    return undefined;
  }
}

interface RenderedPage {
  base64: string;
  /** Share of pixels that are not near-white, used for blank detection. */
  inkRatio: number;
}

async function renderPage(
  page: {
    getViewport: (options: { scale: number }) => {
      width: number;
      height: number;
    };
    render: (options: Record<string, unknown>) => { promise: Promise<void> };
  },
  jpegQuality: number = JPEG_QUALITY,
): Promise<RenderedPage | undefined> {
  try {
    const { createCanvas } = await import('@napi-rs/canvas');

    const base = page.getViewport({ scale: RENDER_SCALE });
    const longestEdge = Math.max(base.width, base.height);
    const scale =
      longestEdge > MAX_RENDER_EDGE
        ? RENDER_SCALE * (MAX_RENDER_EDGE / longestEdge)
        : RENDER_SCALE;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const context = canvas.getContext('2d');

    // Scans photographed on white paper render correctly only with an opaque
    // backdrop; without this, transparent regions come through black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const inkRatio = measureInkRatio(context, canvas.width, canvas.height);

    return {
      base64: canvas.toBuffer('image/jpeg', jpegQuality).toString('base64'),
      inkRatio,
    };
  } catch {
    // Rendering is best-effort: a page that will not rasterize is still
    // classified from whatever text it has.
    return undefined;
  }
}

/** Anything darker than this on any channel counts as ink rather than paper. */
const INK_LUMINANCE_CEILING = 240;
/** Sampling every Nth pixel; blank detection does not need every one. */
const INK_SAMPLE_STRIDE = 7;

function measureInkRatio(
  context: { getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray } },
  width: number,
  height: number,
): number {
  try {
    const { data } = context.getImageData(0, 0, width, height);
    let sampled = 0;
    let inked = 0;

    for (let i = 0; i < data.length; i += 4 * INK_SAMPLE_STRIDE) {
      sampled += 1;
      if (
        data[i] < INK_LUMINANCE_CEILING ||
        data[i + 1] < INK_LUMINANCE_CEILING ||
        data[i + 2] < INK_LUMINANCE_CEILING
      ) {
        inked += 1;
      }
    }

    return sampled === 0 ? 1 : inked / sampled;
  } catch {
    // Without a readable buffer, assume the page has content rather than
    // silently dropping a document.
    return 1;
  }
}
