/** Role names that may have languages + country coverage (matches backend users service). */
export const ROLES_WITH_RECRUITER_CAPABILITIES = ["Recruiter", "Manager"] as const;

export type RoleWithRecruiterCapabilities =
  (typeof ROLES_WITH_RECRUITER_CAPABILITIES)[number];

export function roleNameHasRecruiterCapabilities(
  roleName: string | undefined | null
): roleName is RoleWithRecruiterCapabilities {
  if (!roleName) return false;
  return (ROLES_WITH_RECRUITER_CAPABILITIES as readonly string[]).includes(roleName);
}
