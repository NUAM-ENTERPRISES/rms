/**
 * Benchmark: bulk resume parse pipeline (PDF text extraction + rule parsing).
 *
 * Usage: npx tsx scripts/bench-bulk-resume-parse.ts [fileCount] [pdfPath]
 *
 * Generates resume-like PDFs with pdf-lib (or duplicates a real PDF when
 * pdfPath is given), then measures:
 *  1. Sequential processing (current parseResumes behavior)
 *  2. Concurrent processing at several concurrency levels
 */
import { readFileSync } from 'fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractTextFromPdfBuffer } from '../src/candidates/bulk-resume/resume-pdf-text-extractor';
import { parseResumeText } from '../src/candidates/bulk-resume/resume-field-parser';

const FILE_COUNT = Number(process.argv[2] || 25);

const NAMES = [
  'Priya Sharma', 'Rahul Menon', 'Anita Kumar', 'Vikram Nair', 'Sneha Pillai',
  'Arjun Das', 'Meera Iyer', 'Kiran Raj', 'Divya Thomas', 'Sanjay Verma',
];

async function makeResumePdf(index: number): Promise<Buffer> {
  const name = NAMES[index % NAMES.length];
  const [first, last] = name.split(' ');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const lines: Array<{ text: string; isBold?: boolean; size?: number }> = [
    { text: name, isBold: true, size: 20 },
    { text: 'Registered Nurse', size: 12 },
    { text: `Email: ${first.toLowerCase()}.${last.toLowerCase()}${index}@example.com` },
    { text: `Phone: +91 98${String(76543210 + index).slice(0, 8)}` },
    { text: `Passport No: A${1234567 + index}` },
    { text: 'Date of Birth: 15/08/1992' },
    { text: 'Address: Kochi, Kerala, India' },
    { text: '' },
    { text: 'EXPERIENCE', isBold: true, size: 14 },
    { text: `Staff Nurse City Hospital Kochi 01/2020 - Present` },
    { text: 'Provided ICU patient care, managed medication schedules,' },
    { text: 'coordinated with physicians on treatment plans.' },
    { text: `Junior Nurse Apollo Clinic 06/2017 - 12/2019` },
    { text: 'Assisted in outpatient department and emergency ward.' },
    { text: '' },
    { text: 'EDUCATION', isBold: true, size: 14 },
    { text: 'Bachelor of Science in Nursing University of Calicut 06/2013 - 04/2017' },
    { text: 'General Nursing and Midwifery Kerala Nursing Council 2012' },
    { text: '' },
    { text: 'SKILLS', isBold: true, size: 14 },
    { text: 'Patient Care, ICU, Medication Management, Emergency Response' },
  ];

  // Pad to ~2 dense pages so extraction cost approximates a real resume
  const filler =
    'Responsible for comprehensive patient assessment, care planning, and evaluation in a fast-paced clinical environment.';
  for (let i = 0; i < 90; i++) {
    lines.push({ text: `${filler} (${i + 1})` });
  }

  let page = doc.addPage([595, 842]);
  let y = 800;
  for (const line of lines) {
    const size = line.size ?? 11;
    if (y < 50) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(line.text, {
      x: 50,
      y,
      size,
      font: line.isBold ? bold : font,
    });
    y -= size + 8;
  }

  return Buffer.from(await doc.save());
}

async function processOne(buffer: Buffer): Promise<void> {
  const text = await extractTextFromPdfBuffer(buffer);
  parseResumeText(text);
}

async function runSequential(buffers: Buffer[]): Promise<number> {
  const start = performance.now();
  for (const buf of buffers) {
    await processOne(buf);
  }
  return performance.now() - start;
}

async function runConcurrent(
  buffers: Buffer[],
  concurrency: number,
): Promise<number> {
  const start = performance.now();
  let next = 0;
  async function worker() {
    while (next < buffers.length) {
      const idx = next++;
      await processOne(buffers[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, buffers.length) }, worker),
  );
  return performance.now() - start;
}

async function main() {
  const pdfPath = process.argv[3];
  const buffers: Buffer[] = [];
  if (pdfPath) {
    console.log(`Duplicating ${pdfPath} x${FILE_COUNT}...`);
    const buf = readFileSync(pdfPath);
    for (let i = 0; i < FILE_COUNT; i++) buffers.push(buf);
  } else {
    console.log(`Generating ${FILE_COUNT} resume PDFs...`);
    for (let i = 0; i < FILE_COUNT; i++) {
      buffers.push(await makeResumePdf(i));
    }
  }
  console.log(
    `PDF size ~${(buffers[0].length / 1024).toFixed(1)} KB each\n`,
  );

  // Warm up pdfjs module load so timings reflect steady state
  await processOne(buffers[0]);

  const seq = await runSequential(buffers);
  console.log(
    `Sequential (current):     ${seq.toFixed(0)} ms total, ${(seq / FILE_COUNT).toFixed(1)} ms/file`,
  );

  for (const conc of [5, 10, 25]) {
    const t = await runConcurrent(buffers, conc);
    console.log(
      `Concurrent x${String(conc).padEnd(2)}:          ${t.toFixed(0)} ms total, ${(t / FILE_COUNT).toFixed(1)} ms/file`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
