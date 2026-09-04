/**
 * Passport number and expiry printed on resumes, DataFlow reports, and
 * passport bio pages. Used when Vertex classifies the scan but leaves the
 * fields empty.
 */

const LABELED_PASSPORT_NUMBER =
  /passport\s*(?:no\.?|number|#)\s*[:.\-–]?\s*([A-Z][A-Z0-9]{6,8})/i;
/** Indian ordinary passports: one letter + seven digits (e.g. Y4403682). */
const INDIAN_PASSPORT_NUMBER = /\b([A-Z][0-9]{7})\b/;

/** Bio-page wording. Avoids SCFHS / license "Expiry Date" on other pages. */
const PASSPORT_DATE_OF_EXPIRY =
  /date of expiry\s*[:.\-–]?\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/i;
const GENERIC_EXPIRY =
  /(?:expiry date|valid\s*(?:till|until|upto|up to))\s*[:.\-–]?\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/i;

export interface ParsedPassportFields {
  documentNumber: string | null;
  expiryDate: string | null;
}

export function extractPassportFieldsFromText(
  text: string,
  options?: { bioPage?: boolean },
): ParsedPassportFields {
  return {
    documentNumber: extractPassportNumber(text),
    expiryDate: extractPassportExpiry(text, options),
  };
}

export function extractPassportNumber(text: string): string | null {
  if (!text) return null;
  const labeled = text.match(LABELED_PASSPORT_NUMBER);
  if (labeled?.[1]) return labeled[1].toUpperCase();
  const indian = text.match(INDIAN_PASSPORT_NUMBER);
  return indian?.[1]?.toUpperCase() ?? null;
}

export function extractPassportExpiry(
  text: string,
  options?: { bioPage?: boolean },
): string | null {
  if (!text) return null;
  const labeled = text.match(PASSPORT_DATE_OF_EXPIRY);
  if (labeled?.[1]) return toIsoDate(labeled[1]);
  if (!options?.bioPage) return null;
  const generic = text.match(GENERIC_EXPIRY);
  if (!generic?.[1]) return null;
  return toIsoDate(generic[1]);
}

function toIsoDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidIso(trimmed) ? trimmed : null;
  }
  const parts = trimmed.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [day, month, yearPart] = parts;
  const year =
    yearPart.length === 2 ? `20${yearPart}` : yearPart.padStart(4, '0');
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return isValidIso(iso) ? iso : null;
}

function isValidIso(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}
