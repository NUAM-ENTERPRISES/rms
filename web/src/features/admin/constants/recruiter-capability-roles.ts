/** Role names that may have languages + country coverage (matches backend users service). */
export const ROLES_WITH_RECRUITER_CAPABILITIES = [
  "Recruiter",
  "Recruitment Executive",
] as const;

export type RoleWithRecruiterCapabilities =
  (typeof ROLES_WITH_RECRUITER_CAPABILITIES)[number];

export function roleNameHasRecruiterCapabilities(
  roleName: string | undefined | null
): roleName is RoleWithRecruiterCapabilities {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  return (ROLES_WITH_RECRUITER_CAPABILITIES as readonly string[]).some(
    (name) => name.toLowerCase() === normalized,
  );
}
