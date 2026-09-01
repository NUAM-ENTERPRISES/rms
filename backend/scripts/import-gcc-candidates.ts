/**
 * Import candidates from the red recruiter tabs in the GCC live workbook.
 *
 * Safe default: validation only. A write requires --write and a clean report.
 *
 *   npx tsx scripts/import-gcc-candidates.ts \
 *     --workbook "/Users/nuamtechnologies/Downloads/GCC_LIVE DATA.xlsx"
 *
 *   npx tsx scripts/import-gcc-candidates.ts --workbook ... --write
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { PrismaClient, Gender, ProfessionSector } from '@prisma/client';

const DEFAULT_WORKBOOK =
  '/Users/nuamtechnologies/Downloads/GCC_LIVE DATA.xlsx';
const DEFAULT_REPORT = resolve(
  process.cwd(),
  'reports/gcc-candidate-import-errors.csv',
);
const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5433/affiniks_rms?schema=public';
const RED_TAB = 'FFFF0000';
const BLUE_TAB = 'FF0000FF';
const GCC_COUNTRIES = ['SA', 'AE', 'OM', 'QA', 'KW', 'BH'] as const;

type CellValue = string | number | boolean | Date | null | undefined;
type Row = Record<string, CellValue>;

export type ImportIssue = {
  recruiter: string;
  excelRow: number | '';
  issueType: string;
  message: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  category: string;
  qualification: string;
  department: string;
  countryPreference: string;
  leadSource: string;
  duplicateKey: string;
  duplicateReference: string;
};

export type CandidateImportRow = {
  recruiterTab: string;
  excelRow: number;
  recruiterId: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  professionTypeId: string;
  professionSector: ProfessionSector;
  gender: Gender | undefined;
  licensingExam: string | undefined;
  dataFlow: boolean | undefined;
  source: string;
  remarks: string | undefined;
  duplicateKey: string;
};

type ParsedWorkbook = {
  rows: Array<{ tab: string; excelRow: number; values: Row }>;
  skippedBlueRows: number;
};

type CliArgs = {
  workbook: string;
  report: string;
  write: boolean;
};

const HEADER_ALIASES: Record<string, string> = {
  'SL NO': 'serial',
  'SL NO\\': 'serial',
  'FIRST NAME': 'firstName',
  'LAST NAME': 'lastName',
  CATAGORY: 'category',
  CATEGORY: 'category',
  'COUNTRY CODE': 'countryCode',
  MOBILE: 'mobile',
  QUALIFICATION: 'qualification',
  DEPARTMENT: 'department',
  GENDER: 'gender',
  COUNTRY: 'countryPreference',
  'COUNTRY PREFENCE': 'countryPreference',
  'COUNTRY PREFERENCE': 'countryPreference',
  'LICENSING EXAM': 'licensingExam',
  DATAFLOW: 'dataFlow',
  'LEAD SOURCE': 'leadSource',
  REMARKS: 'remarks',
};

function parseArgs(argv: string[]): CliArgs {
  let workbook = DEFAULT_WORKBOOK;
  let report = DEFAULT_REPORT;
  let write = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg === '--workbook' && argv[i + 1]) workbook = argv[++i];
    else if (arg.startsWith('--workbook=')) workbook = arg.slice(11);
    else if (arg === '--report' && argv[i + 1]) report = argv[++i];
    else if (arg.startsWith('--report=')) report = arg.slice(9);
  }
  return { workbook, report, write };
}

function text(value: CellValue): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizePersonName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeCountryCode(value: CellValue): string {
  const digits = text(value).replace(/\.0+$/, '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export function normalizeMobile(value: CellValue): string {
  const raw = text(value).replace(/\D/g, '');
  return raw.replace(/^0+(?=\d)/, '');
}

export function parseGender(value: CellValue): Gender | undefined {
  const normalized = text(value).toLowerCase();
  if (normalized === 'male' || normalized === 'm') return Gender.MALE;
  if (normalized === 'female' || normalized === 'f') return Gender.FEMALE;
  return undefined;
}

function parseBoolean(value: CellValue): boolean | undefined {
  const normalized = text(value).toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(normalized)) return true;
  if (['no', 'n', 'false', '0'].includes(normalized)) return false;
  return undefined;
}

export function mapCategory(value: string): {
  professionTypeId: string;
  professionSector: ProfessionSector;
} | undefined {
  const category = value.trim().toLowerCase();
  if (category === 'nurse' || category === 'nurses') {
    return { professionTypeId: 'pt_nurse_seed001', professionSector: ProfessionSector.HEALTHCARE };
  }
  if (category === 'doctor' || category === 'doctors') {
    return { professionTypeId: 'pt_doctor_seed01', professionSector: ProfessionSector.HEALTHCARE };
  }
  if (category === 'technician' || category === 'technicians') {
    return { professionTypeId: 'pt_technician_s01', professionSector: ProfessionSector.HEALTHCARE };
  }
  return undefined;
}

export function mapPreferredCountries(value: string): string[] {
  const normalized = value.toLowerCase();
  if (!normalized) return [];
  if (/\b(any|gcc)\b/.test(normalized)) return [...GCC_COUNTRIES];
  const result = new Set<string>();
  const aliases: Array<[RegExp, (typeof GCC_COUNTRIES)[number]]> = [
    [/\bsaudi\b|\bksa\b/, 'SA'],
    [/\bdubai\b|\buae\b|\babudhabi\b|\bsharjah\b|\bunited arab emirates\b/, 'AE'],
    [/\boman\b/, 'OM'],
    [/\bqatar\b/, 'QA'],
    [/\bkuwait\b/, 'KW'],
    [/\bbahrain\b|\bbehrain\b/, 'BH'],
  ];
  for (const [pattern, code] of aliases) if (pattern.test(normalized)) result.add(code);
  return [...result];
}

function unknownCountryTokens(value: string): string[] {
  if (!value.trim() || /\b(any|gcc)\b/i.test(value)) return [];
  const known = /\b(saudi|ksa|dubai|uae|abudhabi|sharjah|united arab emirates|oman|qatar|kuwait|bahrain|behrain)\b/gi;
  const remaining = value.replace(known, '').replace(/[,&/+]/g, ' ').trim();
  return remaining ? remaining.split(/\s+/).filter(Boolean) : [];
}

function csvEscape(value: string | number): string {
  const stringValue = String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function writeIssueReport(
  reportPath: string,
  issues: ImportIssue[],
): Promise<void> {
  await mkdir(resolve(reportPath, '..'), { recursive: true });
  const columns: Array<keyof ImportIssue> = [
    'recruiter', 'excelRow', 'issueType', 'message', 'firstName', 'lastName',
    'countryCode', 'mobileNumber', 'category', 'qualification', 'department',
    'countryPreference', 'leadSource', 'duplicateKey', 'duplicateReference',
  ];
  const lines = [
    columns.join(','),
    ...issues.map((issue) => columns.map((column) => csvEscape(issue[column])).join(',')),
  ];
  await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');
}

async function readTabColors(workbookPath: string): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(await readFile(workbookPath));
  const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
  const colors = new Map<string, string>();
  if (!workbookXml) return colors;
  const sheetMatches = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)];
  for (const match of sheetMatches) {
    const attributes = match[1];
    const name = /name="([^"]*)"/.exec(attributes)?.[1];
    const sheetId = /sheetId="([^"]*)"/.exec(attributes)?.[1];
    if (!name || !sheetId) continue;
    const sheetXml = await zip.file(`xl/worksheets/sheet${sheetId}.xml`)?.async('text');
    const tabColor = sheetXml?.match(/<tabColor\b[^>]*rgb="([^"]+)"/)?.[1];
    if (tabColor) colors.set(name, tabColor.toUpperCase());
  }
  return colors;
}

function rowFromArray(headers: string[], values: CellValue[]): Row {
  const row: Row = {};
  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[header.trim().toUpperCase()];
    if (key) row[key] = values[index];
  });
  return row;
}

export async function parseWorkbook(workbookPath: string): Promise<ParsedWorkbook> {
  const workbook = XLSX.readFile(workbookPath, {
    cellText: true,
    cellDates: true,
    raw: false,
  });
  const tabColors = await readTabColors(workbookPath);
  const rows: ParsedWorkbook['rows'] = [];
  let skippedBlueRows = 0;
  for (const tab of workbook.SheetNames) {
    const color = tabColors.get(tab);
    const data = XLSX.utils.sheet_to_json<CellValue[]>(workbook.Sheets[tab], {
      header: 1,
      defval: '',
      raw: false,
    });
    const headers = (data[0] ?? []).map((value) => text(value));
    const red = color === RED_TAB;
    const blue = color === BLUE_TAB;
    for (let index = 1; index < data.length; index += 1) {
      const values = data[index];
      const row = rowFromArray(headers, values);
      if (!text(row.firstName) && !text(row.lastName) && !text(row.mobile)) continue;
      if (blue) {
        skippedBlueRows += 1;
        continue;
      }
      if (!red) continue;
      rows.push({ tab, excelRow: index + 1, values: row });
    }
  }
  return { rows, skippedBlueRows };
}

function issue(
  tab: string,
  excelRow: number | '',
  values: Row,
  issueType: string,
  message: string,
  duplicateKey = '',
  duplicateReference = '',
): ImportIssue {
  return {
    recruiter: tab,
    excelRow,
    issueType,
    message,
    firstName: text(values.firstName),
    lastName: text(values.lastName),
    countryCode: text(values.countryCode),
    mobileNumber: text(values.mobile),
    category: text(values.category),
    qualification: text(values.qualification),
    department: text(values.department),
    countryPreference: text(values.countryPreference),
    leadSource: text(values.leadSource),
    duplicateKey,
    duplicateReference,
  };
}

function resolveRecruiter(
  tab: string,
  recruiters: Array<{ id: string; name: string; email: string }>,
): { id: string; name: string; email: string } | undefined {
  const normalizedTab = normalizePersonName(tab);
  const matches = recruiters.filter((recruiter) => {
    const name = normalizePersonName(recruiter.name);
    const email = normalizePersonName(recruiter.email.split('@')[0]);
    return name.includes(normalizedTab) || normalizedTab.includes(name) ||
      email.includes(normalizedTab) || normalizedTab.includes(email);
  });
  if (matches.length === 0) return undefined;
  const ranked = matches.sort((left, right) => {
    const leftLength = Math.max(
      normalizePersonName(left.name).length,
      normalizePersonName(left.email.split('@')[0]).length,
    );
    const rightLength = Math.max(
      normalizePersonName(right.name).length,
      normalizePersonName(right.email.split('@')[0]).length,
    );
    return rightLength - leftLength;
  });
  const bestLength = Math.max(
    normalizePersonName(ranked[0].name).length,
    normalizePersonName(ranked[0].email.split('@')[0]).length,
  );
  const secondLength = ranked[1]
    ? Math.max(
        normalizePersonName(ranked[1].name).length,
        normalizePersonName(ranked[1].email.split('@')[0]).length,
      )
    : 0;
  return bestLength > secondLength ? ranked[0] : undefined;
}

async function validateRows(
  parsed: ParsedWorkbook,
  local: PrismaClient,
): Promise<{ valid: CandidateImportRow[]; issues: ImportIssue[] }> {
  const [recruiters, professionTypes, candidateStatuses, existingCandidates] =
    await Promise.all([
      local.user.findMany({
        where: { userRoles: { some: { role: { name: 'Recruiter' } } } },
        select: { id: true, name: true, email: true },
      }),
      local.professionType.findMany({ select: { id: true } }),
      local.candidateStatus.findMany({ select: { id: true, statusName: true } }),
      local.candidate.findMany({
        where: { mobileNumber: { not: null } },
        select: { id: true, countryCode: true, mobileNumber: true },
      }),
    ]);
  const professionTypeIds = new Set(professionTypes.map((type) => type.id));
  const existingKeys = new Set(
    existingCandidates
      .filter((candidate) => candidate.countryCode && candidate.mobileNumber)
      .map((candidate) => `${candidate.countryCode}|${candidate.mobileNumber}`),
  );
  const interestedStatus = candidateStatuses.find((candidateStatus) => candidateStatus.statusName.toLowerCase() === 'interested');
  const issues: ImportIssue[] = [];
  const valid: CandidateImportRow[] = [];
  const tabsWithRecruiter = new Map<string, { id: string; name: string; email: string } | undefined>();
  const seenKeys = new Map<string, string>();

  for (const parsedRow of parsed.rows) {
    const { tab, excelRow, values } = parsedRow;
    if (!tabsWithRecruiter.has(tab)) tabsWithRecruiter.set(tab, resolveRecruiter(tab, recruiters));
    const recruiter = tabsWithRecruiter.get(tab);
    if (!recruiter) {
      issues.push(issue(tab, excelRow, values, 'UNRESOLVED_RECRUITER', 'No unique local recruiter matches this worksheet tab.'));
      continue;
    }
    const firstName = text(values.firstName);
    const lastName = text(values.lastName);
    const countryCode = normalizeCountryCode(values.countryCode);
    const mobileNumber = normalizeMobile(values.mobile);
    const category = mapCategory(text(values.category));
    const genderText = text(values.gender);
    const gender = parseGender(genderText);
    const rowIssues: ImportIssue[] = [];
    if (!firstName) rowIssues.push(issue(tab, excelRow, values, 'MISSING_FIRST_NAME', 'First name is required.'));
    if (!countryCode) rowIssues.push(issue(tab, excelRow, values, 'MISSING_COUNTRY_CODE', 'Country calling code is required.'));
    else if (!/^\+[1-9]\d{0,3}$/.test(countryCode)) rowIssues.push(issue(tab, excelRow, values, 'INVALID_COUNTRY_CODE', `Invalid country calling code: ${countryCode}.`));
    if (!mobileNumber) rowIssues.push(issue(tab, excelRow, values, 'MISSING_MOBILE', 'Mobile number is required.'));
    else if (!/^\d{6,15}$/.test(mobileNumber)) rowIssues.push(issue(tab, excelRow, values, 'INVALID_MOBILE', `Mobile must contain 6-15 digits after normalization: ${mobileNumber}.`));
    if (!text(values.category)) rowIssues.push(issue(tab, excelRow, values, 'MISSING_CATEGORY', 'Category/profession is required.'));
    else if (!category) rowIssues.push(issue(tab, excelRow, values, 'UNKNOWN_CATEGORY', `Unknown category: ${text(values.category)}.`));
    else if (!professionTypeIds.has(category.professionTypeId)) rowIssues.push(issue(tab, excelRow, values, 'MISSING_PROFESSION_TYPE', `Profession type ${category.professionTypeId} is not present locally.`));
    if (!genderText) rowIssues.push(issue(tab, excelRow, values, 'MISSING_GENDER', 'Gender is required.'));
    else if (!gender) rowIssues.push(issue(tab, excelRow, values, 'INVALID_GENDER', `Gender must be Male or Female: ${genderText}.`));
    if (!text(values.licensingExam)) rowIssues.push(issue(tab, excelRow, values, 'MISSING_LICENSING_EXAM', 'Licensing exam is required.'));
    const dataFlowText = text(values.dataFlow);
    const dataFlow = parseBoolean(values.dataFlow);
    if (!dataFlowText) rowIssues.push(issue(tab, excelRow, values, 'MISSING_DATAFLOW', 'Dataflow is required and must be YES or NO.'));
    else if (dataFlow === undefined) rowIssues.push(issue(tab, excelRow, values, 'INVALID_DATAFLOW', `Dataflow must be YES or NO: ${dataFlowText}.`));
    if (!text(values.leadSource)) rowIssues.push(issue(tab, excelRow, values, 'MISSING_LEAD_SOURCE', 'Lead source is required. It will be stored as meta.'));
    if (!interestedStatus) rowIssues.push(issue(tab, excelRow, values, 'MISSING_STATUS_LOOKUP', 'Interested candidate status is missing locally.'));
    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      continue;
    }
    const storedLastName = lastName || 'Unknown';
    if (!lastName) {
      issues.push(issue(tab, excelRow, values, 'PLACEHOLDER_LAST_NAME', 'Last name is blank; candidate will be created with "Unknown" for manual correction.'));
    }
    const duplicateKey = `${countryCode}|${mobileNumber}`;
    const previous = seenKeys.get(duplicateKey);
    if (previous) {
      issues.push(issue(tab, excelRow, values, 'DUPLICATE_IN_WORKBOOK', `Duplicate phone; first occurrence is ${previous}.`, duplicateKey, previous));
      continue;
    }
    seenKeys.set(duplicateKey, `${tab}!${excelRow}`);
    if (existingKeys.has(duplicateKey)) {
      issues.push(issue(tab, excelRow, values, 'DUPLICATE_IN_DATABASE', 'A candidate with this country code and mobile already exists locally.', duplicateKey));
      continue;
    }
    valid.push({
      recruiterTab: tab,
      excelRow,
      recruiterId: recruiter.id,
      firstName,
      lastName: storedLastName,
      countryCode,
      mobileNumber,
      professionTypeId: category!.professionTypeId,
      professionSector: category!.professionSector,
      gender,
      licensingExam: text(values.licensingExam) || undefined,
      dataFlow,
      source: 'meta',
      remarks: text(values.remarks) || undefined,
      duplicateKey,
    });
  }
  return { valid, issues };
}

async function writeCandidates(
  local: PrismaClient,
  rows: CandidateImportRow[],
): Promise<void> {
  const interested = await local.candidateStatus.findFirst({
    where: { statusName: { equals: 'Interested', mode: 'insensitive' } },
    select: { id: true },
  });
  if (!interested) throw new Error('Interested candidate status does not exist.');
  await local.$transaction(async (tx) => {
    for (const row of rows) {
      const candidateCodeSequence = await tx.candidateCodeSequence.upsert({
        where: { year: new Date().getUTCFullYear() },
        create: { year: new Date().getUTCFullYear(), lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
        select: { lastNumber: true },
      });
      const candidateCode = `AFFCD${String(candidateCodeSequence.lastNumber).padStart(2, '0')}${new Date().getUTCFullYear()}`;
      const created = await tx.candidate.create({
        data: {
          candidateCode,
          firstName: row.firstName,
          lastName: row.lastName,
          countryCode: row.countryCode,
          mobileNumber: row.mobileNumber,
          gender: row.gender,
          currentStatusId: interested.id,
          professionTypeId: row.professionTypeId,
          professionSector: row.professionSector,
          licensingExam: row.licensingExam,
          dataFlow: row.dataFlow,
          source: 'meta',
          candidateContacts: [],
        },
        select: { id: true },
      });
      await tx.candidateRecruiterAssignment.create({
        data: {
          candidateId: created.id,
          recruiterId: row.recruiterId,
          assignedBy: row.recruiterId,
          createdBy: row.recruiterId,
          assignmentType: 'manual',
          reason: `Imported from ${row.recruiterTab} worksheet row ${row.excelRow}`,
        },
      });
      await tx.candidateStatusHistory.create({
        data: {
          candidateId: created.id,
          changedById: row.recruiterId,
          statusId: interested.id,
          statusNameSnapshot: 'Interested',
          reason: row.remarks ?? null,
        },
      });
    }
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const workbookPath = resolve(args.workbook);
  const databaseUrl = process.env.IMPORT_DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const local = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    console.log(`Workbook: ${basename(workbookPath)}`);
    console.log(`Mode: ${args.write ? 'write' : 'validation-only'}`);
    const parsed = await parseWorkbook(workbookPath);
    const result = await validateRows(parsed, local);
    await writeIssueReport(args.report, result.issues);
    const byRecruiter = new Map<string, number>();
    const byType = new Map<string, number>();
    for (const row of result.issues) {
      byRecruiter.set(row.recruiter, (byRecruiter.get(row.recruiter) ?? 0) + 1);
      byType.set(row.issueType, (byType.get(row.issueType) ?? 0) + 1);
    }
    console.log(`Red-tab rows: ${parsed.rows.length}`);
    console.log(`Blue-tab rows excluded: ${parsed.skippedBlueRows}`);
    console.log(`Valid rows: ${result.valid.length}`);
    console.log(`Report: ${args.report}`);
    console.log(`Issues: ${result.issues.length}`);
    console.log(`Issue types: ${JSON.stringify(Object.fromEntries(byType))}`);
    console.log(`Issues by recruiter: ${JSON.stringify(Object.fromEntries(byRecruiter))}`);
    if (!args.write) {
      console.log(
        'No database writes performed. Review the CSV report before using --write.',
      );
      return;
    }
    await writeCandidates(local, result.valid);
    console.log(
      `Imported ${result.valid.length} candidates with recruiter assignments. ${result.issues.length} rows were skipped and recorded in the report.`,
    );
  } finally {
    await local.$disconnect();
  }
}

if (process.argv[1] && /import-gcc-candidates\.(ts|js)$/.test(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
