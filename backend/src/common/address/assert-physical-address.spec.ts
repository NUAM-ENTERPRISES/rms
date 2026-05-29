import { BadRequestException } from '@nestjs/common';
import {
  assertPhysicalAddressConsistent,
  mergePhysicalAddress,
  normalizePhysicalAddressPatch,
} from './assert-physical-address';

describe('assertPhysicalAddressConsistent', () => {
  const prisma = {
    country: { findUnique: jest.fn() },
    state: { findUnique: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows both null', async () => {
    await assertPhysicalAddressConsistent(prisma as any, {
      addressCountryCode: null,
      addressStateId: null,
    });
    expect(prisma.country.findUnique).not.toHaveBeenCalled();
    expect(prisma.state.findUnique).not.toHaveBeenCalled();
  });

  it('rejects state without country', async () => {
    await expect(
      assertPhysicalAddressConsistent(prisma as any, {
        addressCountryCode: null,
        addressStateId: 'st1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unknown country code', async () => {
    prisma.country.findUnique.mockResolvedValue(null);
    await expect(
      assertPhysicalAddressConsistent(prisma as any, {
        addressCountryCode: 'ZZ',
        addressStateId: null,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects state in wrong country', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'IN' });
    prisma.state.findUnique.mockResolvedValue({
      id: 'st1',
      countryCode: 'AE',
    });
    await expect(
      assertPhysicalAddressConsistent(prisma as any, {
        addressCountryCode: 'IN',
        addressStateId: 'st1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes when state matches country', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'IN' });
    prisma.state.findUnique.mockResolvedValue({
      id: 'st1',
      countryCode: 'IN',
    });
    await assertPhysicalAddressConsistent(prisma as any, {
      addressCountryCode: 'IN',
      addressStateId: 'st1',
    });
  });

  it('rejects India without state', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'IN' });
    await expect(
      assertPhysicalAddressConsistent(prisma as any, {
        addressCountryCode: 'IN',
        addressStateId: null,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.state.findUnique).not.toHaveBeenCalled();
  });

  it('allows non-India country without state', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'AE' });
    await assertPhysicalAddressConsistent(prisma as any, {
      addressCountryCode: 'AE',
      addressStateId: null,
    });
    expect(prisma.state.findUnique).not.toHaveBeenCalled();
  });
});

describe('normalizePhysicalAddressPatch', () => {
  it('converts blank strings to null', () => {
    expect(
      normalizePhysicalAddressPatch({
        addressCountryCode: ' IN ',
        addressStateId: '',
      }),
    ).toEqual({
      addressCountryCode: 'IN',
      addressStateId: null,
    });
  });
});

describe('mergePhysicalAddress', () => {
  it('prefers patch country and clears stale state when country changes', () => {
    expect(
      mergePhysicalAddress(
        { addressCountryCode: 'IN', addressStateId: 'a' },
        { addressCountryCode: 'AE', addressStateId: undefined },
      ),
    ).toEqual({ addressCountryCode: 'AE', addressStateId: null });
  });

  it('applies explicit null country and clears state', () => {
    expect(
      mergePhysicalAddress(
        { addressCountryCode: 'IN', addressStateId: 'a' },
        { addressCountryCode: null },
      ),
    ).toEqual({ addressCountryCode: null, addressStateId: null });
  });

  it('clears state when country changes without a new state', () => {
    expect(
      mergePhysicalAddress(
        { addressCountryCode: 'US', addressStateId: 'st-us' },
        { addressCountryCode: 'IN' },
      ),
    ).toEqual({ addressCountryCode: 'IN', addressStateId: null });
  });

  it('treats empty state id as null when country is set', () => {
    expect(
      mergePhysicalAddress(
        { addressCountryCode: null, addressStateId: null },
        { addressCountryCode: 'IN', addressStateId: '' },
      ),
    ).toEqual({ addressCountryCode: 'IN', addressStateId: null });
  });
});
