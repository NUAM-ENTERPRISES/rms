import { isRecruiterRole } from "@/config/role-names";

/** Role names that may have languages + country coverage (matches backend users service). */
export const ROLES_WITH_RECRUITER_CAPABILITIES = [
  "Recruitment Executive",
  "Recruiter",
  "Recruitment Lead",
] as const;

export const ROLES_WITH_RECRUITER_LANGUAGES = [
  "Recruitment Executive",
  "Recruiter",
] as const;

export type RoleWithRecruiterCapabilities =
  (typeof ROLES_WITH_RECRUITER_CAPABILITIES)[number];

export function roleNameHasRecruiterCapabilities(
  roleName: string | undefined | null
): roleName is RoleWithRecruiterCapabilities {
  if (!roleName) return false;
  return isRecruiterRole(roleName) || roleName === "Recruitment Lead";
}

export function roleNameHasRecruiterLanguages(
  roleName: string | undefined | null,
): boolean {
  if (!roleName) return false;
  return isRecruiterRole(roleName);
}

export function roleNameRequiresCountryCoverage(
  roleName: string | undefined | null,
): boolean {
  return roleName === "Recruitment Lead";
}
