import { parseDocumentDate } from '../document-date.util';

describe('parseDocumentDate', () => {
  it('returns undefined for undefined', () => {
    expect(parseDocumentDate(undefined)).toBeUndefined();
  });

  it('returns null for null', () => {
    expect(parseDocumentDate(null)).toBeNull();
  });

  it('parses YYYY-MM-DD as UTC midnight', () => {
    const result = parseDocumentDate('2027-03-18');
    expect(result).toEqual(new Date(Date.UTC(2027, 2, 18)));
  });

  it('extracts calendar date from ISO timestamp', () => {
    const result = parseDocumentDate('2027-03-18T15:30:00.000Z');
    expect(result).toEqual(new Date(Date.UTC(2027, 2, 18)));
  });

  it('normalizes Date instances to UTC date-only', () => {
    const result = parseDocumentDate(new Date('2024-06-10T22:00:00.000Z'));
    expect(result).toEqual(new Date(Date.UTC(2024, 5, 10)));
  });

  it('returns null for invalid strings', () => {
    expect(parseDocumentDate('not-a-date')).toBeNull();
    expect(parseDocumentDate('')).toBeNull();
  });

  it('returns null for invalid Date instances', () => {
    expect(parseDocumentDate(new Date('invalid'))).toBeNull();
  });
});
