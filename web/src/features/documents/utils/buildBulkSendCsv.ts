import {
  BulkSendCsvColumnId,
  CSV_COLUMN_BY_ID,
  MANDATORY_CSV_COLUMNS,
} from '../constants/bulk-send-csv-columns';

export interface BulkSendCsvProfile {
  candidateProjectMapId: string;
  fullName: string;
  passportNumber: string;
  qualifications: string;
  department: string;
  totalYearsExperience: string;
  dataFlow: string;
  prometric: string;
  recruiterName: string;
  nationality: string;
  gender: string;
  yearOfGraduation: string;
  gccExperience: string;
  indianExperience: string;
  dob: string;
  age: string;
  height: string;
  weight: string;
  religion: string;
  saudiLicense: string;
  scfhsIssueDate: string;
  scfhsExpiryDate: string;
  eligibilityNumber: string;
  eligibilityExpiryDate: string;
  currentLocation: string;
  contactNumber: string;
  emailId: string;
  mumarisId: string;
  mumarisPassword: string;
}

export interface CsvGridState {
  headers: string[];
  rows: string[][];
  fileName: string;
}

const PROFILE_FIELD_BY_COLUMN: Record<
  Exclude<BulkSendCsvColumnId, 'serialNo'>,
  keyof BulkSendCsvProfile
> = {
  fullName: 'fullName',
  passportNumber: 'passportNumber',
  qualifications: 'qualifications',
  department: 'department',
  totalYearsExperience: 'totalYearsExperience',
  dataFlow: 'dataFlow',
  prometric: 'prometric',
  recruiterName: 'recruiterName',
  nationality: 'nationality',
  gender: 'gender',
  yearOfGraduation: 'yearOfGraduation',
  gccExperience: 'gccExperience',
  indianExperience: 'indianExperience',
  dob: 'dob',
  age: 'age',
  height: 'height',
  weight: 'weight',
  religion: 'religion',
  saudiLicense: 'saudiLicense',
  scfhsIssueDate: 'scfhsIssueDate',
  scfhsExpiryDate: 'scfhsExpiryDate',
  eligibilityNumber: 'eligibilityNumber',
  eligibilityExpiryDate: 'eligibilityExpiryDate',
  currentLocation: 'currentLocation',
  contactNumber: 'contactNumber',
  emailId: 'emailId',
  mumarisId: 'mumarisId',
  mumarisPassword: 'mumarisPassword',
};

export function resolveSelectedColumnIds(
  optionalColumnIds: BulkSendCsvColumnId[],
): BulkSendCsvColumnId[] {
  const mandatoryIds = MANDATORY_CSV_COLUMNS.map((column) => column.id);
  const optionalSet = new Set(optionalColumnIds);
  const optionalIds = optionalColumnIds.filter((id) => optionalSet.has(id));
  return [...mandatoryIds, ...optionalIds];
}

export function profilesToGridRows(
  profiles: BulkSendCsvProfile[],
  columnIds: BulkSendCsvColumnId[],
): { headers: string[]; rows: string[][] } {
  const headers = columnIds.map((id) => CSV_COLUMN_BY_ID[id].label);
  const rows = profiles.map((profile, index) =>
    columnIds.map((columnId) => {
      if (columnId === 'serialNo') {
        return String(index + 1);
      }
      const field = PROFILE_FIELD_BY_COLUMN[columnId];
      return profile[field] ?? '';
    }),
  );

  return { headers, rows };
}

export function escapeCsvCell(value: string): string {
  const normalized = value ?? '';
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function buildCsvString(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell ?? '')).join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

export function sanitizeProjectFileName(projectTitle: string): string {
  const safeTitle = projectTitle
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'project';
  const date = new Date().toISOString().slice(0, 10);
  return `${safeTitle}_candidates_${date}.csv`;
}

export function buildCsvFile(
  fileName: string,
  headers: string[],
  rows: string[][],
): File {
  const content = buildCsvString(headers, rows);
  return new File([content], fileName, { type: 'text/csv;charset=utf-8' });
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

async function readFileAsText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function parseCsvFile(
  file: File,
): Promise<{ headers: string[]; rows: string[][] }> {
  const text = await readFileAsText(file);
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return { headers: [], rows: [] };
  }

  const lines = normalized.split('\n').filter((line) => line.length > 0);
  const headers = parseCsvLine(lines[0] ?? '');
  const rows = lines.slice(1).map((line) => {
    const parsed = parseCsvLine(line);
    while (parsed.length < headers.length) {
      parsed.push('');
    }
    return parsed.slice(0, headers.length);
  });

  return { headers, rows };
}

export function downloadCsvFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
