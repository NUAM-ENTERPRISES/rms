import {
  extractPassportExpiry,
  extractPassportFieldsFromText,
  extractPassportNumber,
} from './passport-fields.util';

describe('extractPassportFieldsFromText', () => {
  it('reads a labeled Indian passport number from a DataFlow report', () => {
    expect(
      extractPassportNumber(
        'Applicant Name THATTIL LENIN LAYA Passport Number Y4403682 SCHS License Number NA',
      ),
    ).toBe('Y4403682');
  });

  it('reads Passport No. with a dotted label', () => {
    expect(extractPassportNumber('Passport No.: Y4403682')).toBe('Y4403682');
  });

  it('falls back to the Indian one-letter-plus-seven-digits shape', () => {
    expect(extractPassportNumber('Holder Y4403682 issued in India')).toBe(
      'Y4403682',
    );
  });

  it('parses Date of Expiry printed as DD/MM/YYYY', () => {
    expect(extractPassportExpiry('Date of Expiry 29/05/2028')).toBe(
      '2028-05-29',
    );
  });

  it('does not treat a council Expiry Date as the passport expiry', () => {
    expect(
      extractPassportExpiry(
        'Expiry Date: 29/05/2028 Issue Date: 30/05/2026 Profile Number: 26911647',
      ),
    ).toBeNull();
  });

  it('reads Expiry Date only on the passport bio page itself', () => {
    expect(
      extractPassportExpiry('Expiry Date 29/05/2031', { bioPage: true }),
    ).toBe('2031-05-29');
  });

  it('returns both fields together', () => {
    expect(
      extractPassportFieldsFromText(
        'Passport Number Y4403682 Date of Expiry 29/05/2028',
      ),
    ).toEqual({
      documentNumber: 'Y4403682',
      expiryDate: '2028-05-29',
    });
  });

  it('returns nulls when nothing passport-like is printed', () => {
    expect(extractPassportFieldsFromText('Staff Nurse Ahalia')).toEqual({
      documentNumber: null,
      expiryDate: null,
    });
  });
});
