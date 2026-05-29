/**
 * Runs PDF compression in a separate Node process (ESM-friendly for pdfjs-dist).
 * Usage: npx tsx src/upload/__tests__/pdf-compress-runner.ts <inputPdfPath> <targetBytes>
 */
import { readFile } from 'node:fs/promises';
import { compressPdfToTarget } from '../pdf-compressor';

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const targetBytes = Number(process.argv[3]);
  if (!inputPath || !Number.isFinite(targetBytes)) {
    console.error('Usage: pdf-compress-runner.ts <inputPdfPath> <targetBytes>');
    process.exit(1);
  }

  const input = await readFile(inputPath);
  const result = await compressPdfToTarget(input, targetBytes);

  process.stdout.write(
    JSON.stringify({
      bufferLength: result.buffer.length,
      wasCompressed: result.wasCompressed,
      originalSize: result.originalSize,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
