import { BadRequestException } from '@nestjs/common';
import {
  assertPhysicalAddressConsistent,
  mergePhysicalAddress,
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
});

describe('mergePhysicalAddress', () => {
  it('prefers patch values when defined', () => {
    expect(
      mergePhysicalAddress(
        { addressCountryCode: 'IN', addressStateId: 'a' },
        { addressCountryCode: 'AE', addressStateId: undefined },
      ),
    ).toEqual({ addressCountryCode: 'AE', addressStateId: 'a' });
  });

  it('applies explicit null from patch', () => {
    expect(
      mergePhysicalAddress(
        { addressCountryCode: 'IN', addressStateId: 'a' },
        { addressCountryCode: null },
      ),
    ).toEqual({ addressCountryCode: null, addressStateId: 'a' });
  });
});
