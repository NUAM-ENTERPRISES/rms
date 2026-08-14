import { ProfessionSector } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export type ProfessionFocusInput = {
  professionTypeId?: string | null;
  focusesAllProfessions?: boolean | null;
  professionSector?: ProfessionSector | null;
};

export type ResolvedProfessionFocus = {
  professionTypeId: string | null;
  focusesAllProfessions: boolean;
  professionSector: ProfessionSector | null;
};

function trimId(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function anyProfessionFocusLabel(
  sector?: ProfessionSector | null,
): string {
  if (sector === ProfessionSector.HEALTHCARE) return 'Any · Healthcare';
  if (sector === ProfessionSector.NON_HEALTH_CARE) {
    return 'Any · Non-healthcare';
  }
  return 'Any profession';
}

export function resolveProfessionFocus(
  input: ProfessionFocusInput,
): ResolvedProfessionFocus {
  const professionTypeId = trimId(input.professionTypeId ?? null);
  const focusesAllProfessions = input.focusesAllProfessions === true;
  const professionSector = input.professionSector ?? null;

  if (focusesAllProfessions) {
    if (professionTypeId) {
      throw new BadRequestException(
        'Do not send a profession type when focusing on all professions in a sector',
      );
    }
    if (
      professionSector !== ProfessionSector.HEALTHCARE &&
      professionSector !== ProfessionSector.NON_HEALTH_CARE
    ) {
      throw new BadRequestException(
        'professionSector is required when focusing on all professions',
      );
    }
    return {
      professionTypeId: null,
      focusesAllProfessions: true,
      professionSector,
    };
  }

  if (!professionTypeId) {
    throw new BadRequestException('Profession type is required');
  }

  return {
    professionTypeId,
    focusesAllProfessions: false,
    professionSector: null,
  };
}

export function mergeProfessionFocus(
  existing: ProfessionFocusInput,
  patch: ProfessionFocusInput,
): ResolvedProfessionFocus {
  const patchTypeId =
    patch.professionTypeId !== undefined
      ? trimId(patch.professionTypeId)
      : undefined;
  const explicitAny = patch.focusesAllProfessions === true;
  const switchingToSpecific =
    !explicitAny && patchTypeId !== undefined && patchTypeId !== null;

  return resolveProfessionFocus({
    professionTypeId: explicitAny
      ? patch.professionTypeId !== undefined
        ? patch.professionTypeId
        : null
      : patchTypeId !== undefined
        ? patchTypeId
        : existing.professionTypeId,
    focusesAllProfessions: switchingToSpecific
      ? false
      : patch.focusesAllProfessions !== undefined
        ? patch.focusesAllProfessions
        : existing.focusesAllProfessions,
    professionSector:
      patch.professionSector !== undefined
        ? patch.professionSector
        : existing.professionSector,
  });
}
