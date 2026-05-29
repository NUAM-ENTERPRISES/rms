/** Project role visa types (RoleNeeded.visaType). */
export const PROJECT_VISA_TYPE = {
  DIRECT_VISA: 'direct_visa',
  COMPANY_VISA: 'company_visa',
} as const;

export type ProjectVisaType =
  (typeof PROJECT_VISA_TYPE)[keyof typeof PROJECT_VISA_TYPE];

export const PROJECT_VISA_TYPE_VALUES: ProjectVisaType[] = [
  PROJECT_VISA_TYPE.DIRECT_VISA,
  PROJECT_VISA_TYPE.COMPANY_VISA,
];

/** Legacy DB/API values mapped to current visa types. */
const LEGACY_VISA_TYPE_MAP: Record<string, ProjectVisaType> = {
  contract: PROJECT_VISA_TYPE.DIRECT_VISA,
  permanent: PROJECT_VISA_TYPE.COMPANY_VISA,
};

export const PROJECT_VISA_TYPE_LABELS: Record<ProjectVisaType, string> = {
  [PROJECT_VISA_TYPE.DIRECT_VISA]: 'Direct Visa',
  [PROJECT_VISA_TYPE.COMPANY_VISA]: 'Company Visa',
};

export function normalizeProjectVisaType(
  value?: string | null,
): ProjectVisaType {
  if (!value) {
    return PROJECT_VISA_TYPE.DIRECT_VISA;
  }
  const legacy = LEGACY_VISA_TYPE_MAP[value];
  if (legacy) {
    return legacy;
  }
  if (
    (PROJECT_VISA_TYPE_VALUES as string[]).includes(value)
  ) {
    return value as ProjectVisaType;
  }
  return PROJECT_VISA_TYPE.DIRECT_VISA;
}

export function getProjectVisaTypeLabel(value?: string | null): string {
  return PROJECT_VISA_TYPE_LABELS[normalizeProjectVisaType(value)];
}

/** Direct Visa replaces legacy "contract" for duration / contract-specific rules. */
export function isDirectVisaType(value?: string | null): boolean {
  return (
    normalizeProjectVisaType(value) === PROJECT_VISA_TYPE.DIRECT_VISA
  );
}
