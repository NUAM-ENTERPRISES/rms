import { BadRequestException } from '@nestjs/common';

function assertEligibilityFieldsRequired(
  eligibility?: boolean | null,
  eligibilityNumber?: string | null,
  eligibilityIssuedAt?: string | Date | null,
  eligibilityExpiryAt?: string | Date | null,
): void {
  if (eligibility !== true) return;

  if (!eligibilityNumber?.trim()) {
    throw new BadRequestException(
      'Eligibility number is required when eligibility is enabled',
    );
  }
  if (!eligibilityIssuedAt) {
    throw new BadRequestException(
      'Eligibility issued date is required when eligibility is enabled',
    );
  }
  if (!eligibilityExpiryAt) {
    throw new BadRequestException(
      'Eligibility expiry date is required when eligibility is enabled',
    );
  }

  const issued = new Date(eligibilityIssuedAt);
  const expiry = new Date(eligibilityExpiryAt);
  if (Number.isNaN(issued.getTime()) || Number.isNaN(expiry.getTime())) {
    throw new BadRequestException('Invalid eligibility issued or expiry date');
  }
  if (expiry < issued) {
    throw new BadRequestException(
      'Eligibility expiry date must be on or after issued date',
    );
  }
}

describe('eligibility field validation', () => {
  it('requires eligibility number when eligibility is true', () => {
    expect(() =>
      assertEligibilityFieldsRequired(true, '', '2024-01-01', '2025-01-01'),
    ).toThrow(BadRequestException);
  });

  it('requires issued and expiry dates when eligibility is true', () => {
    expect(() =>
      assertEligibilityFieldsRequired(true, 'ELIG-1', null, '2025-01-01'),
    ).toThrow(BadRequestException);
    expect(() =>
      assertEligibilityFieldsRequired(true, 'ELIG-1', '2024-01-01', null),
    ).toThrow(BadRequestException);
  });

  it('rejects expiry before issued date', () => {
    expect(() =>
      assertEligibilityFieldsRequired(
        true,
        'ELIG-1',
        '2025-01-01',
        '2024-01-01',
      ),
    ).toThrow(BadRequestException);
  });

  it('allows empty eligibility fields when eligibility is false', () => {
    expect(() =>
      assertEligibilityFieldsRequired(false, '', null, null),
    ).not.toThrow();
  });

  it('accepts valid eligibility fields', () => {
    expect(() =>
      assertEligibilityFieldsRequired(
        true,
        'ELIG-1',
        '2024-01-01',
        '2025-01-01',
      ),
    ).not.toThrow();
  });
});
