export const GCC_NURSE_SHEETS = [
  'RAHUL',
  'FERNANDEZ',
  'ASHIK VINOD',
  'VARUNDAS',
  'PRAVEEN',
  'TABASUM',
  'SREELEKSHMI',
  'AJEESH',
  'TANIKA',
  'DILJITH',
  'SUVARNA',
  'SURYAMAYA',
  'NIKHILA RAJ',
  'VISHNUPRIYA',
  'LEKSHMI',
  'AJAS',
  'SARATH',
  'ANOOP',
  'JESSICA',
  'PARVATHY',
  'MEHARBAN',
] as const;

export const GCC_EXCLUDED_SHEETS = [
  'SANDEEP',
  'ATHULYA',
  'SNEHA',
  'DIVYA',
  'ISNA',
] as const;

export type GccNurseSheet = (typeof GCC_NURSE_SHEETS)[number];

export const ALLOWED_DB_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'postgres',
]);

export function normalizeSheetName(name: string): string {
  return name.trim();
}

export function classifySheet(
  name: string,
): 'nurse' | 'excluded' | 'unknown' {
  const normalized = normalizeSheetName(name);
  if ((GCC_NURSE_SHEETS as readonly string[]).includes(normalized)) {
    return 'nurse';
  }
  if ((GCC_EXCLUDED_SHEETS as readonly string[]).includes(normalized)) {
    return 'excluded';
  }
  return 'unknown';
}
