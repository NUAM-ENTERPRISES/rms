import { BadRequestException } from '@nestjs/common';
import { validatePassportDocumentFields } from '../passport-document.util';

describe('validatePassportDocumentFields', () => {
  const futureExpiry = new Date();
  futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);
  const futureExpiryIso = futureExpiry.toISOString();

  it('skips validation for non-passport doc types', () => {
    expect(() =>
      validatePassportDocumentFields('resume', {
        documentNumber: undefined,
        expiryDate: undefined,
      }),
    ).not.toThrow();
  });

  it('requires passport number for passport_copy', () => {
    expect(() =>
      validatePassportDocumentFields('passport_copy', {
        documentNumber: '',
        expiryDate: futureExpiryIso,
      }),
    ).toThrow(BadRequestException);
  });

  it('requires expiry date for passport_copy', () => {
    expect(() =>
      validatePassportDocumentFields('passport_copy', {
        documentNumber: 'A1234567',
        expiryDate: undefined,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects past expiry dates', () => {
    expect(() =>
      validatePassportDocumentFields('passport_original', {
        documentNumber: 'A1234567',
        expiryDate: '2020-01-01T00:00:00.000Z',
      }),
    ).toThrow('Passport expiry date must be in the future');
  });

  it('accepts valid passport metadata', () => {
    expect(() =>
      validatePassportDocumentFields('passport_cover_bio', {
        documentNumber: 'A1234567',
        expiryDate: futureExpiryIso,
      }),
    ).not.toThrow();
  });
});
