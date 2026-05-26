import { BadRequestException } from '@nestjs/common';
import {
  assertOptionalCountryCode,
  normalizeOptionalCountryCode,
} from './assert-optional-country-code';

describe('assertOptionalCountryCode', () => {
  const prisma = {
    country: { findUnique: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when countryCode is omitted', async () => {
    await assertOptionalCountryCode(prisma as any, undefined);
    expect(prisma.country.findUnique).not.toHaveBeenCalled();
  });

  it('does nothing when countryCode is empty string', async () => {
    await assertOptionalCountryCode(prisma as any, '  ');
    expect(prisma.country.findUnique).not.toHaveBeenCalled();
  });

  it('throws when country does not exist', async () => {
    prisma.country.findUnique.mockResolvedValue(null);
    await expect(
      assertOptionalCountryCode(prisma as any, 'ZZ'),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes when country exists', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'IN' });
    await expect(
      assertOptionalCountryCode(prisma as any, 'IN'),
    ).resolves.toBeUndefined();
  });
});

describe('normalizeOptionalCountryCode', () => {
  it('returns undefined when omitted', () => {
    expect(normalizeOptionalCountryCode(undefined)).toBeUndefined();
  });

  it('returns null when explicitly null or blank', () => {
    expect(normalizeOptionalCountryCode(null)).toBeNull();
    expect(normalizeOptionalCountryCode('')).toBeNull();
    expect(normalizeOptionalCountryCode('  ')).toBeNull();
  });

  it('trims valid codes', () => {
    expect(normalizeOptionalCountryCode(' IN ')).toBe('IN');
  });
});
