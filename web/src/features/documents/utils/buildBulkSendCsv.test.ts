import { describe, expect, it } from 'vitest';
import {
  buildCsvFile,
  buildCsvString,
  escapeCsvCell,
  parseCsvFile,
  profilesToGridRows,
  resolveSelectedColumnIds,
  sanitizeProjectFileName,
} from './buildBulkSendCsv';
import type { BulkSendCsvProfile } from './buildBulkSendCsv';

const sampleProfile: BulkSendCsvProfile = {
  candidateProjectMapId: 'cpm-1',
  fullName: 'Jane Doe',
  passportNumber: 'P123',
  qualifications: 'BSc Nursing',
  department: 'ICU',
  totalYearsExperience: '5',
  dataFlow: 'Yes',
  prometric: 'Passed',
  recruiterName: 'Recruiter',
  nationality: '',
  gender: 'FEMALE',
  yearOfGraduation: '2018',
  gccExperience: '2',
  indianExperience: '3',
  dob: '15 Jun 1995',
  age: '30',
  height: '165',
  weight: '60',
  religion: '',
  saudiLicense: 'SCFHS-1',
  scfhsIssueDate: '01 Jan 2024',
  scfhsExpiryDate: '01 Jan 2027',
  eligibilityNumber: 'ELIG-1',
  eligibilityIssueDate: '01 Jan 2024',
  eligibilityExpiryDate: '31 Dec 2026',
  currentLocation: 'Riyadh',
  contactNumber: '+966 501234567',
  emailId: 'jane@example.com',
  mumarisId: '',
  mumarisPassword: '',
};

describe('buildBulkSendCsv', () => {
  it('includes mandatory columns and selected optional columns only', () => {
    const columnIds = resolveSelectedColumnIds(['emailId', 'gccExperience', 'eligibilityIssueDate']);
    const { headers } = profilesToGridRows([sampleProfile], columnIds);

    expect(headers).toContain('Serial No');
    expect(headers).toContain('Candidate Full Name');
    expect(headers).toContain('Email ID');
    expect(headers).toContain('GCC Experience');
    expect(headers).toContain('Eligibility Issue Date');
    expect(headers).not.toContain('Mumaris ID');
  });

  it('escapes commas and quotes in CSV cells', () => {
    expect(escapeCsvCell('Hello, "world"')).toBe('"Hello, ""world"""');
    expect(buildCsvString(['Name'], [['Jane, "Jr"']])).toBe('Name\n"Jane, ""Jr"""\n');
  });

  it('round-trips grid data through file parse', async () => {
    const columnIds = resolveSelectedColumnIds(['emailId']);
    const grid = profilesToGridRows([sampleProfile], columnIds);
    const file = buildCsvFile('test.csv', grid.headers, grid.rows);
    const parsed = await parseCsvFile(file);

    expect(parsed.headers).toEqual(grid.headers);
    expect(parsed.rows[0]).toEqual(grid.rows[0]);
  });

  it('sanitizes project title for filenames', () => {
    expect(sanitizeProjectFileName('King Faisal Hospital!')).toMatch(
      /^King_Faisal_Hospital_candidates_\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});
