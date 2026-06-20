/**
 * Project domain constants
 */

export const PROJECT_SECTOR = {
  HEALTHCARE: 'healthcare',
  NON_HEALTHCARE: 'non-healthcare',
} as const;

export type ProjectSector = (typeof PROJECT_SECTOR)[keyof typeof PROJECT_SECTOR];

/** Visa types for project role requirements (Requirement Criteria step). */
export const PROJECT_ROLE_VISA_TYPE = {
  COMPANY_VISA: 'company_visa',
  DIRECT_VISA: 'direct_visa',
} as const;

export const PROJECT_ROLE_VISA_TYPES = [
  PROJECT_ROLE_VISA_TYPE.COMPANY_VISA,
  PROJECT_ROLE_VISA_TYPE.DIRECT_VISA,
] as const;

export type ProjectRoleVisaType =
  (typeof PROJECT_ROLE_VISA_TYPE)[keyof typeof PROJECT_ROLE_VISA_TYPE];

const LEGACY_PROJECT_ROLE_VISA_TYPE: Record<string, ProjectRoleVisaType> = {
  contract: PROJECT_ROLE_VISA_TYPE.COMPANY_VISA,
  permanent: PROJECT_ROLE_VISA_TYPE.DIRECT_VISA,
};

export function normalizeProjectRoleVisaType(
  value?: string | null,
): ProjectRoleVisaType {
  if (!value) {
    return PROJECT_ROLE_VISA_TYPE.COMPANY_VISA;
  }
  if (
    value === PROJECT_ROLE_VISA_TYPE.COMPANY_VISA ||
    value === PROJECT_ROLE_VISA_TYPE.DIRECT_VISA
  ) {
    return value;
  }
  return LEGACY_PROJECT_ROLE_VISA_TYPE[value] ?? PROJECT_ROLE_VISA_TYPE.COMPANY_VISA;
}
