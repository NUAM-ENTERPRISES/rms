/** Role names that may have country + profession coverage (matches backend `roleHasProfessionCoverage`). */
export const ROLES_WITH_RECRUITER_CAPABILITIES = [
  "Recruiter",
  "Recruitment Lead",
] as const;

export const ROLES_WITH_RECRUITER_LANGUAGES = ["Recruiter"] as const;

export type RoleWithRecruiterCapabilities =
  (typeof ROLES_WITH_RECRUITER_CAPABILITIES)[number];

export function roleNameHasRecruiterCapabilities(
  roleName: string | undefined | null
): roleName is RoleWithRecruiterCapabilities {
  if (!roleName) return false;
  return (ROLES_WITH_RECRUITER_CAPABILITIES as readonly string[]).includes(roleName);
}

export function roleNameHasRecruiterLanguages(
  roleName: string | undefined | null,
): boolean {
  if (!roleName) return false;
  return (ROLES_WITH_RECRUITER_LANGUAGES as readonly string[]).includes(roleName);
}

export function roleNameRequiresCountryCoverage(
  roleName: string | undefined | null,
): boolean {
  return roleName === "Recruitment Lead";
}
