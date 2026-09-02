import { isRecruiterRole } from "@/config/role-names";

/** Role names that may have languages + country coverage (matches backend users service). */
export const ROLES_WITH_RECRUITER_CAPABILITIES = [
  "Recruitment Executive",
  "Recruiter",
] as const;

export type RoleWithRecruiterCapabilities =
  (typeof ROLES_WITH_RECRUITER_CAPABILITIES)[number];

export function roleNameHasRecruiterCapabilities(
  roleName: string | undefined | null
): roleName is RoleWithRecruiterCapabilities {
  if (!roleName) return false;
  return isRecruiterRole(roleName);
}
