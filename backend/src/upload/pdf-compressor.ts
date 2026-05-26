import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { compress as qpdfCompress } from 'qpdf-compress';

const execFileAsync = promisify(execFile);

export type PdfCompressResult = {
  buffer: Buffer;
  wasCompressed: boolean;
  originalSize: number;
};

/**
 * Shrink a PDF buffer to at most targetMaxBytes using qpdf-compress (primary)
 * and optional Ghostscript when installed.
 */
export async function compressPdfToTarget(
  input: Buffer,
  targetMaxBytes: number,
): Promise<PdfCompressResult> {
  const originalSize = input.length;
  if (input.length <= targetMaxBytes) {
    return { buffer: input, wasCompressed: false, originalSize };
  }

  let current: Buffer = Buffer.from(input);

  const tryQpdf = async (lossy: boolean): Promise<Buffer | null> => {
    try {
      const out = await qpdfCompress(current, {
        lossy,
        stripMetadata: true,
      });
      const next = Buffer.from(out);
      if (lossy) {
        return next.length <= current.length ? next : null;
      }
      return next.length < current.length ? next : null;
    } catch {
      return null;
    }
  };

  const lossless = await tryQpdf(false);
  if (lossless) {
    current = Buffer.from(lossless);
    if (current.length <= targetMaxBytes) {
      return {
        buffer: current,
        wasCompressed: current.length < originalSize,
        originalSize,
      };
    }
  }

  for (let pass = 0; pass < 3 && current.length > targetMaxBytes; pass++) {
    const lossy = await tryQpdf(true);
    if (!lossy || lossy.length >= current.length) {
      break;
    }
    current = Buffer.from(lossy);
    if (current.length <= targetMaxBytes) {
      return {
        buffer: current,
        wasCompressed: true,
        originalSize,
      };
    }
  }

  const gsBuffer = await tryGhostscriptCompress(current, targetMaxBytes);
  if (gsBuffer && gsBuffer.length <= targetMaxBytes) {
    return {
      buffer: gsBuffer,
      wasCompressed: true,
      originalSize,
    };
  }
  if (gsBuffer && gsBuffer.length < current.length) {
    current = Buffer.from(gsBuffer);
  }

  if (current.length <= targetMaxBytes) {
    return {
      buffer: current,
      wasCompressed: current.length < originalSize,
      originalSize,
    };
  }

  return { buffer: current, wasCompressed: current.length < originalSize, originalSize };
}

async function tryGhostscriptCompress(
  input: Buffer,
  targetMaxBytes: number,
): Promise<Buffer | null> {
  const gsBin = await resolveGhostscriptBinary();
  if (!gsBin) {
    return null;
  }

  const presets = [
    [
      '-dPDFSETTINGS=/ebook',
      '-dColorImageResolution=150',
      '-dGrayImageResolution=150',
    ],
    [
      '-dPDFSETTINGS=/screen',
      '-dColorImageResolution=96',
      '-dGrayImageResolution=96',
    ],
    [
      '-dPDFSETTINGS=/screen',
      '-dColorImageResolution=72',
      '-dGrayImageResolution=72',
    ],
  ];

  let best: Buffer | null = null;

  for (const extra of presets) {
    const out = await runGhostscript(gsBin, input, extra);
    if (!out) continue;
    if (!best || out.length < best.length) {
      best = out;
    }
    if (out.length <= targetMaxBytes) {
      return out;
    }
  }

  return best;
}

async function resolveGhostscriptBinary(): Promise<string | null> {
  const candidates = [
    process.env.GHOSTSCRIPT_PATH,
    'gs',
    'gswin64c',
    'gswin32c',
  ].filter(Boolean) as string[];

  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 5000 });
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

async function runGhostscript(
  gsBin: string,
  input: Buffer,
  extraArgs: string[],
): Promise<Buffer | null> {
  const dir = await mkdtemp(join(tmpdir(), 'rms-pdf-'));
  const inputPath = join(dir, 'in.pdf');
  const outputPath = join(dir, 'out.pdf');

  try {
    await writeFile(inputPath, input);
    await execFileAsync(
      gsBin,
      [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        ...extraArgs,
        `-sOutputFile=${outputPath}`,
        inputPath,
      ],
      { timeout: 120000, maxBuffer: 50 * 1024 * 1024 },
    );
    const out = await readFile(outputPath);
    return out.length > 0 ? out : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
