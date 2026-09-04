/**
 * Shared parsing and normalization for recruiter candidate workbooks.
 *
 * These functions were proven against the real `GCC_LIVE DATA.xlsx` inside
 * `scripts/import-gcc-candidates.ts`; that script now imports from here so the
 * CLI and the API can never disagree about what a sheet means.
 */
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export type CellValue = string | number | boolean | Date | null | undefined;
export type SheetRow = Record<string, CellValue>;

/** Recruiter tabs in use. Blue tabs are archived and skipped wholesale. */
export const RED_TAB = 'FFFF0000';
export const BLUE_TAB = 'FF0000FF';

/**
 * Recruiter sheets label the same column many ways, including outright typos
 * ("CATAGORY", "COUNTRY PREFENCE"). Keys are compared upper-cased and trimmed.
 */
export const HEADER_ALIASES: Record<string, string> = {
  'SL NO': 'serial',
  'SL NO\\': 'serial',
  'S NO': 'serial',
  'SL.NO': 'serial',
  'FIRST NAME': 'firstName',
  FIRSTNAME: 'firstName',
  NAME: 'firstName',
  'CANDIDATE NAME': 'firstName',
  'LAST NAME': 'lastName',
  LASTNAME: 'lastName',
  CATAGORY: 'category',
  CATEGORY: 'category',
  PROFESSION: 'category',
  'COUNTRY CODE': 'countryCode',
  CODE: 'countryCode',
  MOBILE: 'mobile',
  'MOBILE NUMBER': 'mobile',
  PHONE: 'mobile',
  'CONTACT NUMBER': 'mobile',
  WHATSAPP: 'mobile',
  EMAIL: 'email',
  'EMAIL ID': 'email',
  QUALIFICATION: 'qualification',
  QUALIFICATIONS: 'qualification',
  EDUCATION: 'qualification',
  DEPARTMENT: 'department',
  DEPT: 'department',
  SPECIALITY: 'department',
  SPECIALTY: 'department',
  GENDER: 'gender',
  SEX: 'gender',
  COUNTRY: 'countryPreference',
  'COUNTRY PREFENCE': 'countryPreference',
  'COUNTRY PREFERENCE': 'countryPreference',
  'PREFERRED COUNTRY': 'countryPreference',
  'LICENSING EXAM': 'licensingExam',
  'LICENCING EXAM': 'licensingExam',
  LICENSE: 'licensingExam',
  DATAFLOW: 'dataFlow',
  'DATA FLOW': 'dataFlow',
  'LEAD SOURCE': 'leadSource',
  SOURCE: 'leadSource',
  REMARKS: 'remarks',
  REMARK: 'remarks',
  NOTES: 'remarks',
  PASSPORT: 'passportNumber',
  'PASSPORT NO': 'passportNumber',
  'PASSPORT NUMBER': 'passportNumber',
  EXPERIENCE: 'experience',
  'TOTAL EXPERIENCE': 'experience',
};

/** Every recruiter candidate is a Meta lead regardless of what the cell says. */
export const FORCED_LEAD_SOURCE = 'meta';

export function text(value: CellValue): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizePersonName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeOptionalLastName(value: CellValue): string | null {
  return text(value) || null;
}

export function normalizeCountryCode(value: CellValue): string {
  const digits = text(value)
    .replace(/\.0+$/, '')
    .replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

/**
 * Recovers a mobile number from whatever Excel decided to store.
 *
 * Long numeric cells are frequently saved as scientific notation
 * (`7.893578949E9`) or with a trailing `.0`; both must round-trip back to the
 * original digits rather than being stripped to nonsense.
 */
export function normalizeMobile(value: CellValue): string {
  const raw = text(value);
  if (!raw) return '';

  let candidate = raw;
  if (/^[+-]?\d*\.?\d+e[+-]?\d+$/i.test(raw.replace(/\s/g, ''))) {
    const parsed = Number(raw.replace(/\s/g, ''));
    if (Number.isFinite(parsed)) {
      candidate = BigInt(Math.round(parsed)).toString();
    }
  } else if (/^\d+\.0+$/.test(raw)) {
    candidate = raw.replace(/\.0+$/, '');
  }

  return candidate.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export function parseGender(value: CellValue): 'MALE' | 'FEMALE' | undefined {
  const normalized = text(value).toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'MALE';
  if (normalized === 'female' || normalized === 'f') return 'FEMALE';
  return undefined;
}

export function parseBoolean(value: CellValue): boolean | undefined {
  const normalized = text(value).toLowerCase();
  if (['yes', 'y', 'true', '1', 'done', 'completed'].includes(normalized))
    return true;
  if (['no', 'n', 'false', '0', 'not done', 'pending'].includes(normalized))
    return false;
  return undefined;
}

/**
 * Normalizes a licensing exam cell onto the slugs in `LICENSING_EXAMS`.
 * Unrecognised values are lower-cased and returned so review can see them.
 */
export function normalizeLicensingExam(value: CellValue): string | undefined {
  const raw = text(value).toLowerCase().replace(/[\s.\-_]/g, '');
  if (!raw) return undefined;
  const direct: Record<string, string> = {
    prometric: 'prometric',
    dha: 'dha',
    haad: 'haad',
    moh: 'moh',
    scfhs: 'scfhs',
    qchp: 'qchp',
    omsb: 'omsb',
    nhra: 'nhra',
    nmcuk: 'nmc_uk',
    nmc: 'nmc_uk',
    cbt: 'cbt',
    oet: 'oet',
    ielts: 'ielts',
    usmle: 'usmle',
    nclexrn: 'nclex_rn',
    nclex: 'nclex_rn',
  };
  return direct[raw] ?? text(value).toLowerCase();
}

const GCC_COUNTRIES = ['SA', 'AE', 'OM', 'QA', 'KW', 'BH'] as const;

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
  for (const [pattern, code] of aliases) {
    if (pattern.test(normalized)) result.add(code);
  }
  return [...result];
}

export function rowFromArray(headers: string[], values: CellValue[]): SheetRow {
  const row: SheetRow = {};
  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[header.trim().toUpperCase()];
    if (key) row[key] = values[index];
  });
  return row;
}

/** Reads worksheet tab colours, which encode whether a recruiter is active. */
export async function readTabColors(
  workbook: Buffer,
): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(workbook);
  const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
  const colors = new Map<string, string>();
  if (!workbookXml) return colors;

  const sheetMatches = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)];
  for (const match of sheetMatches) {
    const attributes = match[1];
    const name = /name="([^"]*)"/.exec(attributes)?.[1];
    const sheetId = /sheetId="([^"]*)"/.exec(attributes)?.[1];
    if (!name || !sheetId) continue;
    const sheetXml = await zip
      .file(`xl/worksheets/sheet${sheetId}.xml`)
      ?.async('text');
    const tabColor = sheetXml?.match(/<tabColor\b[^>]*rgb="([^"]+)"/)?.[1];
    if (tabColor) colors.set(name, tabColor.toUpperCase());
  }
  return colors;
}

export interface ParsedSheetRow {
  sheetName: string;
  /** 1-based Excel row number, so reviewers can find it in the original file. */
  rowNumber: number;
  values: SheetRow;
  tabColor?: string;
}

export interface ParsedWorkbook {
  rows: ParsedSheetRow[];
  sheetNames: string[];
  skippedArchivedRows: number;
  /** Sheets whose header row matched no known alias. */
  unrecognizedSheets: string[];
}

export interface ParseWorkbookOptions {
  /**
   * When true only red (active) tabs are read. CSV uploads and single-sheet
   * recruiter files have no colours at all, so this defaults to false.
   */
  activeTabsOnly?: boolean;
  excludedSheets?: string[];
}

/**
 * Parses an xlsx/csv buffer into flat rows keyed by normalized header.
 *
 * Values are read as text (`raw: false`) so Excel cannot silently reformat
 * phone numbers before we get a chance to repair them.
 */
export async function parseWorkbook(
  buffer: Buffer,
  options: ParseWorkbookOptions = {},
): Promise<ParsedWorkbook> {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellText: true,
    cellDates: true,
    raw: false,
  });

  let tabColors = new Map<string, string>();
  if (options.activeTabsOnly) {
    try {
      tabColors = await readTabColors(buffer);
    } catch {
      // CSV and some generated xlsx files have no workbook.xml; colour data is
      // optional, so fall through and treat every sheet as active.
      tabColors = new Map();
    }
  }

  const excluded = new Set(
    (options.excludedSheets ?? []).map((name) => name.trim().toUpperCase()),
  );

  const rows: ParsedSheetRow[] = [];
  const unrecognizedSheets: string[] = [];
  let skippedArchivedRows = 0;

  for (const sheetName of workbook.SheetNames) {
    if (excluded.has(sheetName.trim().toUpperCase())) continue;

    const color = tabColors.get(sheetName);
    const data = XLSX.utils.sheet_to_json<CellValue[]>(
      workbook.Sheets[sheetName],
      { header: 1, defval: '', raw: false },
    );
    if (data.length === 0) continue;

    const headers = (data[0] ?? []).map((value) => text(value));
    const recognized = headers.some(
      (header) => HEADER_ALIASES[header.trim().toUpperCase()],
    );
    if (!recognized) {
      unrecognizedSheets.push(sheetName);
      continue;
    }

    for (let index = 1; index < data.length; index += 1) {
      const values = rowFromArray(headers, data[index]);
      const isBlank =
        !text(values.firstName) &&
        !text(values.lastName) &&
        !text(values.mobile);
      if (isBlank) continue;

      if (options.activeTabsOnly && color === BLUE_TAB) {
        skippedArchivedRows += 1;
        continue;
      }
      if (options.activeTabsOnly && color !== RED_TAB) continue;

      rows.push({
        sheetName,
        rowNumber: index + 1,
        values,
        tabColor: color,
      });
    }
  }

  return {
    rows,
    sheetNames: workbook.SheetNames,
    skippedArchivedRows,
    unrecognizedSheets,
  };
}

/** A row after cleaning, before catalog mapping resolves names to IDs. */
export interface NormalizedRow {
  firstName: string;
  lastName: string | null;
  countryCode: string;
  mobileNumber: string;
  email: string | null;
  passportNumber: string | null;
  gender: 'MALE' | 'FEMALE' | undefined;
  category: string;
  qualification: string;
  department: string;
  licensingExam: string | undefined;
  dataFlow: boolean | undefined;
  preferredCountries: string[];
  remarks: string | undefined;
  /** Always `meta`; the sheet value is kept in `rawLeadSource` for audit. */
  source: string;
  rawLeadSource: string;
}

export function normalizeRow(values: SheetRow): NormalizedRow {
  return {
    firstName: text(values.firstName),
    lastName: normalizeOptionalLastName(values.lastName),
    countryCode: normalizeCountryCode(values.countryCode),
    mobileNumber: normalizeMobile(values.mobile),
    email: text(values.email).toLowerCase() || null,
    passportNumber: text(values.passportNumber).toUpperCase() || null,
    gender: parseGender(values.gender),
    category: text(values.category),
    qualification: text(values.qualification),
    department: text(values.department),
    licensingExam: normalizeLicensingExam(values.licensingExam),
    dataFlow: parseBoolean(values.dataFlow),
    preferredCountries: mapPreferredCountries(text(values.countryPreference)),
    remarks: text(values.remarks) || undefined,
    source: FORCED_LEAD_SOURCE,
    rawLeadSource: text(values.leadSource),
  };
}
