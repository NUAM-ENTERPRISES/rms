import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';

export type EffectivePhysicalAddress = {
  addressCountryCode: string | null;
  addressStateId: string | null;
};

export function mergePhysicalAddress<
  T extends EffectivePhysicalAddress,
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
        ? patch.addressCountryCode
        : existing.addressCountryCode,
    addressStateId:
      patch.addressStateId !== undefined
        ? patch.addressStateId
        : existing.addressStateId,
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
