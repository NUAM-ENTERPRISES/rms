const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Parse a document calendar date (issuedAt, expiryDate) for Postgres DATE columns.
 * Accepts YYYY-MM-DD or ISO timestamps; always returns a UTC midnight Date.
 */
export function parseDocumentDate(
  value?: string | Date | null,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const dateOnly = DATE_ONLY_PATTERN.exec(raw);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
}
