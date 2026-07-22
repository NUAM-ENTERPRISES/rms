/**
 * ESM-friendly runner for PDF extract + parse (Jest cannot dynamic-import pdfjs).
 * Usage: npx tsx src/candidates/bulk-resume/__tests__/resume-pdf-parse-runner.ts <pdfPath>
 */
import { readFileSync } from 'node:fs';
import { extractTextFromPdfBuffer } from '../resume-pdf-text-extractor';
import { parseResumeText } from '../resume-field-parser';

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: resume-pdf-parse-runner.ts <pdfPath>');
    process.exit(1);
  }
  const text = await extractTextFromPdfBuffer(readFileSync(pdfPath));
  const parsed = parseResumeText(text);
  process.stdout.write(
    JSON.stringify({
      firstLine: text.split('\n')[0]?.trim() ?? '',
      parsed,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
