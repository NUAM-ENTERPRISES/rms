import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';
import { PHYSICAL_ADDRESS_INDIA_COUNTRY_CODE } from './physical-address.constants';

export type EffectivePhysicalAddress = {
  addressCountryCode: string | null;
  addressStateId: string | null;
};

/** Treat blank strings as null so optional FK fields are not set to "". */
export function normalizePhysicalAddressPatch(patch: {
  addressCountryCode?: string | null;
  addressStateId?: string | null;
}): {
  addressCountryCode?: string | null;
  addressStateId?: string | null;
} {
  const result: {
    addressCountryCode?: string | null;
    addressStateId?: string | null;
  } = {};

  if (patch.addressCountryCode !== undefined) {
    const code =
      typeof patch.addressCountryCode === 'string'
        ? patch.addressCountryCode.trim()
        : patch.addressCountryCode;
    result.addressCountryCode = code || null;
  }

  if (patch.addressStateId !== undefined) {
    const stateId =
      typeof patch.addressStateId === 'string'
        ? patch.addressStateId.trim()
        : patch.addressStateId;
    result.addressStateId = stateId || null;
  }

  return result;
}

export function mergePhysicalAddress<
  T extends EffectivePhysicalAddress,
>(
  existing: T,
  patch: {
    addressCountryCode?: string | null;
    addressStateId?: string | null;
  },
): EffectivePhysicalAddress {
  const normalized = normalizePhysicalAddressPatch(patch);

  const addressCountryCode =
    normalized.addressCountryCode !== undefined
      ? normalized.addressCountryCode
      : existing.addressCountryCode;

  let addressStateId =
    normalized.addressStateId !== undefined
      ? normalized.addressStateId
      : existing.addressStateId;

  // Country changed without a new state selection — clear stale state FK
  if (
    normalized.addressCountryCode !== undefined &&
    normalized.addressCountryCode !== existing.addressCountryCode &&
    normalized.addressStateId === undefined
  ) {
    addressStateId = null;
  }

  return {
    addressCountryCode,
    addressStateId,
  };
}

/**
 * Ensures optional physical country/state FKs are consistent with the `countries` and `states` tables.
 * — State requires country.
 * — When both are set, state.countryCode must match country.
 */
export async function assertPhysicalAddressConsistent(
  prisma: Pick<PrismaService, 'country' | 'state'>,
  effective: EffectivePhysicalAddress,
): Promise<void> {
  const countryCode = effective.addressCountryCode;
  const stateId = effective.addressStateId;

  if (!countryCode && !stateId) {
    return;
  }

  if (stateId && !countryCode) {
    throw new BadRequestException(
      'addressCountryCode is required when addressStateId is set',
    );
  }

  if (countryCode) {
    const country = await prisma.country.findUnique({
      where: { code: countryCode },
      select: { code: true },
    });
    if (!country) {
      throw new BadRequestException(
        `Country not found for code: ${countryCode}`,
      );
    }
  }

  if (countryCode === PHYSICAL_ADDRESS_INDIA_COUNTRY_CODE && !stateId) {
    throw new BadRequestException(
      'State is required when country is India',
    );
  }

  if (stateId) {
    const state = await prisma.state.findUnique({
      where: { id: stateId },
      select: { id: true, countryCode: true },
    });
    if (!state) {
      throw new BadRequestException(`State not found for id: ${stateId}`);
    }
    if (countryCode && state.countryCode !== countryCode) {
      throw new BadRequestException(
        'Selected state does not belong to the selected country',
      );
    }
  }
}
