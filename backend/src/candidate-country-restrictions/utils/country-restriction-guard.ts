import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  COUNTRY_RESTRICTION_TYPE_LABELS,
  COUNTRY_RESTRICTION_TYPES,
  ProcessingStepCancelSourceMeta,
} from '../../common/constants/country-restriction-types';

export type ActiveCountryRestriction = Prisma.CandidateCountryRestrictionGetPayload<{
  include: { country: true };
}>;

function buildRestrictionMessage(restriction: ActiveCountryRestriction): string {
  const countryName = restriction.country?.name ?? restriction.countryCode;
  const meta = restriction.sourceMeta as ProcessingStepCancelSourceMeta | null;

  if (
    restriction.restrictionType === COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL &&
    meta?.stepKey === 'data_flow'
  ) {
    const projectPart = meta.projectTitle ? ` on project "${meta.projectTitle}"` : '';
    return `Candidate is restricted from ${countryName} projects due to a Data Flow issue${projectPart}.`;
  }

  if (restriction.restrictionType === COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL) {
    const stepPart = meta?.stepKey ? ` (${meta.stepKey})` : '';
    const projectPart = meta?.projectTitle ? ` on project "${meta.projectTitle}"` : '';
    return `Candidate is restricted from ${countryName} projects due to a processing cancellation${stepPart}${projectPart}.`;
  }

  const typeLabel =
    COUNTRY_RESTRICTION_TYPE_LABELS[
      restriction.restrictionType as keyof typeof COUNTRY_RESTRICTION_TYPE_LABELS
    ] ?? restriction.restrictionType;

  return `Candidate is restricted from ${countryName} projects (${typeLabel}).`;
}

export function buildCountryRestrictionBlockMessage(
  restriction: ActiveCountryRestriction,
): string {
  return buildRestrictionMessage(restriction);
}

export function getCountryRestrictionEligibilityHardReason(
  restriction: ActiveCountryRestriction | null | undefined,
): string | null {
  if (!restriction) {
    return null;
  }
  return buildRestrictionMessage(restriction);
}

export async function findActiveCountryRestriction(
  prisma: { candidateCountryRestriction: Prisma.CandidateCountryRestrictionDelegate },
  candidateId: string,
  countryCode: string,
): Promise<ActiveCountryRestriction | null> {
  return prisma.candidateCountryRestriction.findFirst({
    where: {
      candidateId,
      countryCode,
      isActive: true,
    },
    include: { country: true },
  });
}

export async function assertCandidateNotRestrictedForCountry(
  prisma: { candidateCountryRestriction: Prisma.CandidateCountryRestrictionDelegate },
  candidateId: string,
  countryCode: string | null | undefined,
): Promise<void> {
  if (!countryCode) {
    return;
  }

  const restriction = await findActiveCountryRestriction(
    prisma,
    candidateId,
    countryCode,
  );

  if (restriction) {
    throw new BadRequestException(buildCountryRestrictionBlockMessage(restriction));
  }
}
