import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { ParsedResumeFields } from '../resume-field-parser';

const FIXTURES = join(__dirname, '../__fixtures__');
const RUNNER = join(__dirname, 'resume-pdf-parse-runner.ts');

function parsePdfFixture(fileName: string): {
  firstLine: string;
  parsed: ParsedResumeFields;
} {
  const pdfPath = join(FIXTURES, fileName);
  const backendRoot = join(__dirname, '..', '..', '..', '..');
  const stdout = execFileSync(
    process.execPath,
    ['--import', 'tsx', RUNNER, pdfPath],
    {
      cwd: backendRoot,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout) as {
    firstLine: string;
    parsed: ParsedResumeFields;
  };
}

describe('bulk resume PDF fixtures (Y-line extract + field parse)', () => {
  it('parses Syam Chandran RenderCV resume accurately', () => {
    const { firstLine, parsed } = parsePdfFixture('syam-chandran.pdf');

    expect(firstLine).toBe('Syam Chandran');
    expect(parsed.firstName).toBe('Syam');
    expect(parsed.lastName).toBe('Chandran');
    expect(parsed.nameConfidence).toBe('high');
    expect(parsed.email).toBe('syamchandran965649@gmail.com');
    expect(parsed.countryCode).toBe('+91');
    expect(parsed.mobileNumber).toBe('9061486051');

    expect(parsed.educations.length).toBeGreaterThanOrEqual(1);
    expect(parsed.educations[0].rawDegree.toLowerCase()).toContain('tech');
    expect(parsed.educations[0].rawDegree.toLowerCase()).toContain(
      'computer science',
    );
    expect(parsed.educations[0].university?.toLowerCase()).toContain(
      'kalam',
    );
    expect(parsed.educations[0].graduationYear).toBe(2025);

    expect(parsed.workExperiences.length).toBeGreaterThanOrEqual(3);
    expect(
      parsed.workExperiences.some((w) =>
        (w.companyName ?? '').toLowerCase().includes('acmegrade'),
      ),
    ).toBe(true);
    expect(
      parsed.workExperiences.some((w) =>
        (w.companyName ?? '').toLowerCase().includes('keltron'),
      ),
    ).toBe(true);
    expect(
      parsed.workExperiences.some((w) =>
        (w.companyName ?? '').toLowerCase().includes('rivertech'),
      ),
    ).toBe(true);
  }, 30000);

  it('parses Anjana M A resume accurately', () => {
    const { firstLine, parsed } = parsePdfFixture('anjana-m-a.pdf');

    expect(firstLine).toBe('Anjana M A');
    expect(parsed.firstName).toBe('Anjana');
    expect(parsed.lastName).toMatch(/M\s*A/i);
    expect(parsed.nameConfidence).toBe('high');
    expect(parsed.email).toBe('anjanaanil10721@gmail.com');
    expect(parsed.countryCode).toBe('+91');
    expect(parsed.mobileNumber).toBe('9895211897');

    expect(parsed.educations.length).toBeGreaterThanOrEqual(1);
    expect(parsed.educations[0].rawDegree.toLowerCase()).toContain('btech');
    expect(parsed.educations[0].rawDegree.toLowerCase()).toContain(
      'computer science',
    );
    expect(parsed.educations[0].university?.toLowerCase()).toContain(
      'universal',
    );
    expect(parsed.educations[0].graduationYear).toBe(2026);

    expect(parsed.workExperiences.length).toBeGreaterThanOrEqual(1);
    expect(parsed.workExperiences[0].jobTitle.toLowerCase()).toContain(
      'intern',
    );
    expect(parsed.workExperiences[0].companyName?.toLowerCase()).toContain(
      'gp3',
    );
  }, 30000);
});
