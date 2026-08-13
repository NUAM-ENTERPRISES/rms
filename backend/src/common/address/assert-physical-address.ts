import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';

export type EffectivePhysicalAddress = {
  addressCountryCode: string | null;
  addressStateId: string | null;
};

/** Empty / whitespace optional FK text becomes `null`; omit stays `undefined`. */
export function normalizeOptionalAddressValue(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableAddressValue(
  value: string | null | undefined,
): string | null {
  return normalizeOptionalAddressValue(value) ?? null;
}

export function mergePhysicalAddress<
  T extends Partial<EffectivePhysicalAddress>,
>(
  existing: T,
  patch: {
    addressCountryCode?: string | null;
    addressStateId?: string | null;
  },
): EffectivePhysicalAddress {
  return {
    addressCountryCode:
      patch.addressCountryCode !== undefined
        ? toNullableAddressValue(patch.addressCountryCode)
        : toNullableAddressValue(existing.addressCountryCode),
    addressStateId:
      patch.addressStateId !== undefined
        ? toNullableAddressValue(patch.addressStateId)
        : toNullableAddressValue(existing.addressStateId),
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
  const countryCode = toNullableAddressValue(effective.addressCountryCode);
  const stateId = toNullableAddressValue(effective.addressStateId);

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
