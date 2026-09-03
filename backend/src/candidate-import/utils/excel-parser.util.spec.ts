import {
  FORCED_LEAD_SOURCE,
  HEADER_ALIASES,
  mapPreferredCountries,
  normalizeCountryCode,
  normalizeLicensingExam,
  normalizeMobile,
  normalizeRow,
  parseBoolean,
  parseGender,
  rowFromArray,
} from './excel-parser.util';

describe('excel-parser.util', () => {
  describe('normalizeMobile', () => {
    it('recovers digits from the scientific notation Excel writes for long numbers', () => {
      expect(normalizeMobile('7.893578949E9')).toBe('7893578949');
      expect(normalizeMobile('9.876543210E9')).toBe('9876543210');
    });

    it('drops the trailing .0 Excel adds to numeric cells', () => {
      expect(normalizeMobile('9876543210.0')).toBe('9876543210');
    });

    it('strips separators recruiters type by hand', () => {
      expect(normalizeMobile(' 98765 43210 ')).toBe('9876543210');
      expect(normalizeMobile('98765-43210')).toBe('9876543210');
    });

    it('removes a leading zero so the number matches the stored form', () => {
      expect(normalizeMobile('09876543210')).toBe('9876543210');
    });

    it('returns empty for blank cells rather than throwing', () => {
      expect(normalizeMobile(null)).toBe('');
      expect(normalizeMobile(undefined)).toBe('');
      expect(normalizeMobile('')).toBe('');
    });
  });

  describe('normalizeCountryCode', () => {
    it('adds the plus and drops the Excel float suffix', () => {
      expect(normalizeCountryCode('91')).toBe('+91');
      expect(normalizeCountryCode('91.0')).toBe('+91');
      expect(normalizeCountryCode('+91')).toBe('+91');
    });

    it('returns empty when there are no digits at all', () => {
      expect(normalizeCountryCode('')).toBe('');
      expect(normalizeCountryCode('n/a')).toBe('');
    });
  });

  describe('rowFromArray', () => {
    it('maps the real header typos in the recruiter workbook', () => {
      // These four are the actual spellings found in GCC_LIVE DATA.xlsx.
      const headers = [
        'SL NO`',
        'CATAGORY',
        'COUNTRY PREFENCE',
        'FIRST NAME',
      ];
      const row = rowFromArray(headers, [1, 'NURSE', 'DUBAI', 'ABHI']);

      expect(row[HEADER_ALIASES['CATAGORY']]).toBe('NURSE');
      expect(row[HEADER_ALIASES['COUNTRY PREFENCE']]).toBe('DUBAI');
      expect(row[HEADER_ALIASES['FIRST NAME']]).toBe('ABHI');
    });

    it('ignores columns that are not in the alias table', () => {
      const row = rowFromArray(['FIRST NAME', 'SOME EXTRA COLUMN'], [
        'ABHI',
        'ignored',
      ]);

      expect(Object.values(row)).not.toContain('ignored');
    });

    it('is case and whitespace insensitive about headers', () => {
      const row = rowFromArray(['  first name  '], ['ABHI']);
      expect(row[HEADER_ALIASES['FIRST NAME']]).toBe('ABHI');
    });
  });

  describe('parseGender', () => {
    it.each([
      ['Male', 'MALE'],
      ['M', 'MALE'],
      ['female', 'FEMALE'],
      ['F', 'FEMALE'],
    ])('reads %s as %s', (input, expected) => {
      expect(parseGender(input)).toBe(expected);
    });

    it('leaves anything unrecognised undefined for review', () => {
      expect(parseGender('other')).toBeUndefined();
      expect(parseGender('')).toBeUndefined();
    });
  });

  describe('parseBoolean', () => {
    it('reads the words recruiters actually type', () => {
      expect(parseBoolean('YES')).toBe(true);
      expect(parseBoolean('done')).toBe(true);
      expect(parseBoolean('No')).toBe(false);
      expect(parseBoolean('pending')).toBe(false);
    });

    it('leaves anything else undefined', () => {
      expect(parseBoolean('maybe')).toBeUndefined();
    });
  });

  describe('normalizeLicensingExam', () => {
    it('slugifies exams regardless of punctuation and case', () => {
      expect(normalizeLicensingExam('Prometric')).toBe('prometric');
      expect(normalizeLicensingExam('D.H.A')).toBe('dha');
      expect(normalizeLicensingExam('NMC UK')).toBe('nmc_uk');
      expect(normalizeLicensingExam('NCLEX')).toBe('nclex_rn');
    });

    it('passes through an unknown exam so review can see it', () => {
      expect(normalizeLicensingExam('Some New Exam')).toBe('some new exam');
    });
  });

  describe('mapPreferredCountries', () => {
    it('expands the catch-all values to the whole GCC', () => {
      expect(mapPreferredCountries('any gcc').sort()).toEqual(
        ['AE', 'BH', 'KW', 'OM', 'QA', 'SA'].sort(),
      );
    });

    it('maps city names onto their country', () => {
      expect(mapPreferredCountries('dubai')).toEqual(['AE']);
      expect(mapPreferredCountries('abudhabi')).toEqual(['AE']);
    });

    it('handles the misspelling present in the sheet', () => {
      expect(mapPreferredCountries('behrain')).toEqual(['BH']);
    });

    it('collects several countries from one cell without duplicating', () => {
      expect(mapPreferredCountries('saudi, dubai, uae').sort()).toEqual([
        'AE',
        'SA',
      ]);
    });

    it('returns nothing for a blank cell', () => {
      expect(mapPreferredCountries('')).toEqual([]);
    });
  });

  describe('normalizeRow', () => {
    it('forces every lead source to meta, including the METAA typo', () => {
      const fromTypo = normalizeRow({ source: 'METAA' });
      const fromBlank = normalizeRow({});
      const fromSomethingElse = normalizeRow({ source: 'Referral' });

      expect(fromTypo.source).toBe(FORCED_LEAD_SOURCE);
      expect(fromBlank.source).toBe(FORCED_LEAD_SOURCE);
      // Recruiter sheets are entirely Meta leads, so this is deliberate.
      expect(fromSomethingElse.source).toBe(FORCED_LEAD_SOURCE);
    });

    it('normalizes the phone pair used as the duplicate key', () => {
      const row = normalizeRow({
        countryCode: '91.0',
        mobile: '7.893578949E9',
      });

      expect(row.countryCode).toBe('+91');
      expect(row.mobileNumber).toBe('7893578949');
    });
  });
});
