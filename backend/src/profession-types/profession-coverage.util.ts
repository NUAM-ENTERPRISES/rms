import type { ProfessionSector, Prisma } from '@prisma/client';

export const PROFESSION_COVERAGE_WILDCARD_NAMES = {
  HEALTHCARE: 'any_healthcare',
  NON_HEALTH_CARE: 'any_non_health_care',
} as const;

export type ProfessionCoverageWildcardName =
  (typeof PROFESSION_COVERAGE_WILDCARD_NAMES)[keyof typeof PROFESSION_COVERAGE_WILDCARD_NAMES];

export function isProfessionCoverageWildcard(
  name: string | null | undefined,
): boolean {
  return (
    name === PROFESSION_COVERAGE_WILDCARD_NAMES.HEALTHCARE ||
    name === PROFESSION_COVERAGE_WILDCARD_NAMES.NON_HEALTH_CARE
  );
}

export function wildcardNameForSector(
  sector: ProfessionSector | string | null | undefined,
): ProfessionCoverageWildcardName | null {
  if (sector === 'HEALTHCARE') {
    return PROFESSION_COVERAGE_WILDCARD_NAMES.HEALTHCARE;
  }
  if (sector === 'NON_HEALTH_CARE') {
    return PROFESSION_COVERAGE_WILDCARD_NAMES.NON_HEALTH_CARE;
  }
  return null;
}

/**
 * Prisma filter: recruiters who cover the given profession ID exactly,
 * or who have the sector "Any" wildcard for that profession's sector.
 */
export function buildProfessionScopeWhere(
  professionTypeId: string | null | undefined,
  sector?: ProfessionSector | string | null,
): Prisma.UserWhereInput {
  if (!professionTypeId) {
    return {};
  }
  const wildcardName = wildcardNameForSector(sector ?? null);
  if (!wildcardName) {
    return {
      userProfessionScopes: {
        some: { professionTypeId },
      },
    };
  }
  return {
    userProfessionScopes: {
      some: {
        OR: [
          { professionTypeId },
          { professionType: { name: wildcardName } },
        ],
      },
    },
  };
}

export type ProfessionScopeForMatch = {
  professionTypeId: string;
  professionType?: {
    name?: string | null;
    sector?: ProfessionSector | string | null;
  } | null;
};

export function scopeCoversProfession(
  scopes: ProfessionScopeForMatch[],
  candidateProfessionTypeId: string,
  candidateSector?: ProfessionSector | string | null,
): boolean {
  const wildcardName = wildcardNameForSector(candidateSector ?? null);
  return (scopes ?? []).some((scope) => {
    if (scope.professionTypeId === candidateProfessionTypeId) {
      return true;
    }
    if (wildcardName && scope.professionType?.name === wildcardName) {
      return true;
    }
    if (
      candidateSector &&
      isProfessionCoverageWildcard(scope.professionType?.name) &&
      scope.professionType?.sector === candidateSector
    ) {
      return true;
    }
    return false;
  });
}

export function peerCoversProfession(args: {
  professionTypeIds: Set<string>;
  wildcardSectors: Set<ProfessionSector | string>;
  candidateProfessionTypeId: string;
  candidateSector?: ProfessionSector | string | null;
}): boolean {
  if (args.professionTypeIds.has(args.candidateProfessionTypeId)) {
    return true;
  }
  if (
    args.candidateSector &&
    args.wildcardSectors.has(args.candidateSector)
  ) {
    return true;
  }
  return false;
}
