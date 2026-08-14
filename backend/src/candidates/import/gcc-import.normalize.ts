import { Gender } from '@prisma/client';

export type PhoneNormalizeResult =
  | { ok: true; countryCode: string; mobileNumber: string }
  | {
      ok: false;
      reason: string;
      raw: string;
      normalizedDigits: string;
      digitLength: number;
    };

export type NameNormalizeResult =
  | { ok: true; firstName: string; lastName: string }
  | { ok: false; reason: string };

export type DataFlowNormalizeResult =
  | { ok: true; value: boolean }
  | { ok: false; raw: string };

const COUNTRY_CODE_RE = /^\+[1-9]\d{0,3}$/;
const MOBILE_RE = /^\d{6,15}$/;
const GCC_PREFIXES = ['971', '966', '968', '974', '973', '965'] as const;
const QUALIFICATION_PHONE = /\b(bsc|gnm|pbsc)\b/i;
const MULTI_PHONE = /[,/;|]|\band\b/i;
const SCIENTIFIC = /[eE]/;

export function excelCellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    const asInt = Math.round(value);
    if (Math.abs(value - asInt) < 1e-4) return String(asInt);
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value).trim();
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Digit run for diagnostics. Does not strip commas (those are multi-number)
 * and does not expand scientific notation.
 */
export function coerceExcelPhoneDigits(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (!Number.isInteger(value)) return '';
    return Math.round(value).toString();
  }
  const text = excelCellToString(value);
  if (!text) return '';
  if (SCIENTIFIC.test(text)) return '';
  return digitsOnly(text);
}

export function normalizeGccPhone(value: unknown): PhoneNormalizeResult {
  const raw = excelCellToString(value);
  const digits = coerceExcelPhoneDigits(value);
  const fail = (reason: string): PhoneNormalizeResult => ({
    ok: false,
    reason,
    raw,
    normalizedDigits: digits,
    digitLength: digits.length,
  });

  if (typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value)) {
    return fail('scientific notation is not a valid phone');
  }
  if (typeof value === 'string' && SCIENTIFIC.test(value.trim())) {
    return fail('scientific notation is not a valid phone');
  }
  if (MULTI_PHONE.test(raw)) {
    return fail('multiple phone numbers in one cell');
  }
  if (QUALIFICATION_PHONE.test(raw) || /[a-zA-Z]/.test(raw)) {
    return fail('phone column is not a number');
  }

  if (!digits) {
    return fail('empty or non-numeric phone');
  }

  let mobile = digits;
  if (mobile.length === 11 && mobile.startsWith('0')) {
    mobile = mobile.slice(1);
  }

  let countryCode: string | null = null;
  if (mobile.length === 10) {
    countryCode = '+91';
  } else if (mobile.length === 12 && mobile.startsWith('91')) {
    countryCode = '+91';
    mobile = mobile.slice(2);
  } else {
    const gccPrefix = GCC_PREFIXES.find((prefix) => mobile.startsWith(prefix));
    if (gccPrefix && mobile.length > gccPrefix.length) {
      countryCode = `+${gccPrefix}`;
      mobile = mobile.slice(gccPrefix.length);
    } else {
      return fail(`unsupported phone digit length ${digits.length}`);
    }
  }

  if (!countryCode || !COUNTRY_CODE_RE.test(countryCode) || !MOBILE_RE.test(mobile)) {
    return fail('phone failed DTO regex');
  }

  return { ok: true, countryCode, mobileNumber: mobile };
}

export function normalizeGccName(value: unknown): NameNormalizeResult {
  const raw = excelCellToString(value).replace(/\s+/g, ' ').trim();
  if (!raw) {
    return { ok: false, reason: 'empty NAME' };
  }
  const parts = raw.split(' ');
  const firstName = parts[0];
  if (!firstName) {
    return { ok: false, reason: 'empty NAME' };
  }
  const lastName = parts.slice(1).join(' ') || 'UNKNOWN';
  return { ok: true, firstName, lastName };
}

export function normalizeGccGender(value: unknown): Gender | undefined {
  const raw = excelCellToString(value).toLowerCase().replace(/[^a-z]/g, '');
  if (!raw) return undefined;
  if (raw === 'm' || raw === 'male' || raw === 'man' || raw === 'boy') {
    return Gender.MALE;
  }
  if (
    raw === 'f' ||
    raw === 'female' ||
    raw === 'femal' ||
    raw === 'femail' ||
    raw === 'woman' ||
    raw === 'girl'
  ) {
    return Gender.FEMALE;
  }
  if (raw === 'other' || raw === 'o') {
    return Gender.OTHER;
  }
  return undefined;
}

const DATAFLOW_TRUE = new Set([
  'yes',
  'y',
  'yea',
  'true',
  '1',
  'done',
  'completed',
  'complete',
  'started',
  'inprogress',
  'ongoing',
  'completed(deg)',
  'saudi-completed',
]);
const DATAFLOW_FALSE = new Set([
  'no',
  'n',
  'false',
  '0',
  'nil',
  'ni',
  'na',
  'n/a',
  'none',
  '-',
  'notdone',
]);

function isYesWithOptionalNote(compact: string): boolean {
  if (compact === 'yes') return true;
  if (!compact.startsWith('yes')) return false;
  const rest = compact.slice(3);
  return rest.startsWith('(') && rest.endsWith(')');
}

export function normalizeGccDataFlow(value: unknown): DataFlowNormalizeResult {
  const raw = excelCellToString(value);
  if (!raw) {
    return { ok: true, value: false };
  }
  const compact = raw.toLowerCase().replace(/\s+/g, '');
  if (DATAFLOW_FALSE.has(compact)) return { ok: true, value: false };
  if (DATAFLOW_TRUE.has(compact) || isYesWithOptionalNote(compact)) {
    return { ok: true, value: true };
  }
  return { ok: false, raw };
}

export function normalizeHeaderKey(header: string): string {
  return header.trim().toUpperCase().replace(/\s+/g, ' ').replace(/\.$/, '');
}

export function headerToField(header: string): string | null {
  const key = normalizeHeaderKey(header);
  if (key === 'NAME') return 'name';
  if (key === 'MOBILE' || key === 'CONTACT') return 'mobile';
  if (key === 'GENDER') return 'gender';
  if (key === 'DATAFLOW' || key === 'DF') return 'dataFlow';
  if (key === 'REMARKS') return 'remarks';
  return null;
}
