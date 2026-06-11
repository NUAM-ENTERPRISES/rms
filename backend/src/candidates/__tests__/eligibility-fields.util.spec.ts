import { BadRequestException } from '@nestjs/common';

function assertEligibilityNumberRequired(
  eligibility?: boolean | null,
  eligibilityNumber?: string | null,
): void {
  if (eligibility === true && !eligibilityNumber?.trim()) {
    throw new BadRequestException(
      'Eligibility number is required when eligibility is enabled',
    );
  }
}

describe('eligibility field validation', () => {
  it('requires eligibility number when eligibility is true', () => {
    expect(() => assertEligibilityNumberRequired(true, '')).toThrow(
      BadRequestException,
    );
  });

  it('allows empty eligibility number when eligibility is false', () => {
    expect(() => assertEligibilityNumberRequired(false, '')).not.toThrow();
  });
});
