import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { join } from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { compressPdfToTarget } from '../pdf-compressor';

const execFileAsync = promisify(execFile);
const backendRoot = join(__dirname, '..', '..', '..');
const runnerPath = join(__dirname, 'pdf-compress-runner.ts');

/** Build a large PDF by embedding multiple high-resolution JPEG pages. */
async function buildLargeTestPdf(targetBytes: number): Promise<Buffer> {
  const width = 3500;
  const height = 3500;
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = (i * 17) % 256;
  }

  const jpeg = await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 100 })
    .toBuffer();

  const pdfDoc = await PDFDocument.create();
  let size = 0;
  while (size < targetBytes) {
    const image = await pdfDoc.embedJpg(jpeg);
    const scaled = image.scale(1);
    const page = pdfDoc.addPage([scaled.width, scaled.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: scaled.width,
      height: scaled.height,
    });
    size = (await pdfDoc.save()).length;
    if (pdfDoc.getPageCount() > 8) break;
  }

  return Buffer.from(await pdfDoc.save());
}

describe('compressPdfToTarget', () => {
  jest.setTimeout(180000);

  it('returns input unchanged when already under target', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([400, 500]);
    const input = Buffer.from(await pdfDoc.save());

    const result = await compressPdfToTarget(input, 10 * 1024 * 1024);

    expect(result.wasCompressed).toBe(false);
    expect(result.buffer.length).toBe(input.length);
  });

  it('compresses oversized PDF below 10MB target (via tsx subprocess)', async () => {
    const target = 10 * 1024 * 1024;
    const input = await buildLargeTestPdf(15 * 1024 * 1024);

    expect(input.length).toBeGreaterThan(target);

    const tempDir = await mkdtemp(join(tmpdir(), 'rms-pdf-compress-'));
    const inputPath = join(tempDir, 'large.pdf');
    let stdout = '';

    try {
      await writeFile(inputPath, input);

      const run = await execFileAsync(
        'npx',
        ['tsx', runnerPath, inputPath, String(target)],
        {
          cwd: backendRoot,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, NODE_OPTIONS: '' },
        },
      );
      stdout = run.stdout;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }

    const result = JSON.parse(stdout) as {
      bufferLength: number;
      wasCompressed: boolean;
      originalSize: number;
    };

    expect(result.bufferLength).toBeLessThanOrEqual(target);
    expect(result.wasCompressed).toBe(true);
    expect(result.originalSize).toBe(input.length);
  });
});
