import { BadRequestException } from '@nestjs/common';
import { DOCUMENT_TYPE } from '../../../common/constants';
import {
  isEligibilityLetterType,
  validateEligibilityDocumentFields,
} from '../eligibility-document.util';

describe('eligibility-document.util', () => {
  it('identifies eligibility letter doc type', () => {
    expect(isEligibilityLetterType(DOCUMENT_TYPE.ELIGIBILITY_LETTER)).toBe(
      true,
    );
    expect(isEligibilityLetterType('passport_copy')).toBe(false);
  });

  it('requires eligibility metadata for eligibility letter documents', () => {
    expect(() =>
      validateEligibilityDocumentFields(DOCUMENT_TYPE.ELIGIBILITY_LETTER, {
        documentNumber: '',
        issuedAt: '2024-01-01',
        expiryDate: '2025-01-01',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateEligibilityDocumentFields(DOCUMENT_TYPE.ELIGIBILITY_LETTER, {
        documentNumber: 'ELIG-1',
        issuedAt: '2025-01-01',
        expiryDate: '2024-01-01',
      }),
    ).toThrow('Eligibility expiry date must be after the issued date');
  });

  it('allows valid eligibility letter metadata', () => {
    expect(() =>
      validateEligibilityDocumentFields(DOCUMENT_TYPE.ELIGIBILITY_LETTER, {
        documentNumber: 'ELIG-1',
        issuedAt: '2024-01-01',
        expiryDate: '2025-01-01',
      }),
    ).not.toThrow();
  });

  it('ignores non-eligibility document types', () => {
    expect(() =>
      validateEligibilityDocumentFields('passport_copy', {
        documentNumber: '',
      }),
    ).not.toThrow();
  });
});
