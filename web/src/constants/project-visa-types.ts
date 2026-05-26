/** Project role visa types — must match backend project-visa-types constants. */
export const PROJECT_VISA_TYPE = {
  DIRECT_VISA: "direct_visa",
  COMPANY_VISA: "company_visa",
} as const;

export type ProjectVisaType =
  (typeof PROJECT_VISA_TYPE)[keyof typeof PROJECT_VISA_TYPE];

export const PROJECT_VISA_TYPE_VALUES: ProjectVisaType[] = [
  PROJECT_VISA_TYPE.DIRECT_VISA,
  PROJECT_VISA_TYPE.COMPANY_VISA,
];

const LEGACY_VISA_TYPE_MAP: Record<string, ProjectVisaType> = {
  contract: PROJECT_VISA_TYPE.DIRECT_VISA,
  permanent: PROJECT_VISA_TYPE.COMPANY_VISA,
};

export const PROJECT_VISA_TYPE_LABELS: Record<ProjectVisaType, string> = {
  [PROJECT_VISA_TYPE.DIRECT_VISA]: "Direct Visa",
  [PROJECT_VISA_TYPE.COMPANY_VISA]: "Company Visa",
};

export function normalizeProjectVisaType(
  value?: string | null
): ProjectVisaType {
  if (!value) {
    return PROJECT_VISA_TYPE.DIRECT_VISA;
  }
  const legacy = LEGACY_VISA_TYPE_MAP[value];
  if (legacy) {
    return legacy;
  }
  if ((PROJECT_VISA_TYPE_VALUES as string[]).includes(value)) {
    return value as ProjectVisaType;
  }
  return PROJECT_VISA_TYPE.DIRECT_VISA;
}

/** Human-readable label for UI (never shows snake_case values). */
export function getProjectVisaTypeLabel(value?: string | null): string {
  return PROJECT_VISA_TYPE_LABELS[normalizeProjectVisaType(value)];
}

/** Short label for compact selects (role cards). */
export function getProjectVisaTypeShortLabel(value?: string | null): string {
  const normalized = normalizeProjectVisaType(value);
  return normalized === PROJECT_VISA_TYPE.COMPANY_VISA ? "Company" : "Direct";
}

export function isDirectVisaType(value?: string | null): boolean {
  return (
    normalizeProjectVisaType(value) === PROJECT_VISA_TYPE.DIRECT_VISA
  );
}
