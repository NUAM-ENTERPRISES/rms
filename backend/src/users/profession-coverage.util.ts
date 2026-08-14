import {
  ProfessionSector,
  RecruiterProfessionScope,
  Prisma,
} from '@prisma/client';

export type RecruiterProfessionCoverage = {
  handlesAllProfessions: boolean;
  recruiterSectorScope: RecruiterProfessionScope | null | undefined;
  professionTypeIds: Iterable<string>;
};

export type ProfessionCoverageTarget = {
  id: string | null;
  sector: ProfessionSector | null;
};

export function sectorToRecruiterScope(
  sector: ProfessionSector,
): RecruiterProfessionScope {
  return sector === ProfessionSector.HEALTHCARE
    ? RecruiterProfessionScope.HEALTHCARE
    : RecruiterProfessionScope.NON_HEALTH_CARE;
}

export function recruiterCoversProfession(
  recruiter: RecruiterProfessionCoverage,
  profession: ProfessionCoverageTarget,
): boolean {
  if (recruiter.handlesAllProfessions) {
    if (recruiter.recruiterSectorScope === RecruiterProfessionScope.BOTH) {
      return true;
    }
    if (!profession.sector || !recruiter.recruiterSectorScope) {
      return false;
    }
    return recruiter.recruiterSectorScope === sectorToRecruiterScope(profession.sector);
  }

  if (!profession.id) {
    return false;
  }

  for (const id of recruiter.professionTypeIds) {
    if (id === profession.id) {
      return true;
    }
  }
  return false;
}

export function sectorCoverageWhere(
  sector: ProfessionSector,
): Prisma.UserWhereInput {
  return {
    OR: [
      {
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.BOTH,
      },
      {
        handlesAllProfessions: true,
        recruiterSectorScope: sectorToRecruiterScope(sector),
      },
    ],
  };
}

export function professionCoverageWhere(
  professionTypeId: string,
  sector: ProfessionSector | null,
): Prisma.UserWhereInput {
  const anyClauses: Prisma.UserWhereInput[] = [
    {
      handlesAllProfessions: true,
      recruiterSectorScope: RecruiterProfessionScope.BOTH,
    },
  ];

  if (
    sector === ProfessionSector.HEALTHCARE ||
    sector === ProfessionSector.NON_HEALTH_CARE
  ) {
    anyClauses.push({
      handlesAllProfessions: true,
      recruiterSectorScope: sectorToRecruiterScope(sector),
    });
  }

  return {
    OR: [
      {
        userProfessionScopes: {
          some: { professionTypeId },
        },
      },
      ...anyClauses,
    ],
  };
}
