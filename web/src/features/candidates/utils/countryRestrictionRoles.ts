export const COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES = [
  "Manager",
  "Recruiter Manager",
] as const;

export function canEditCandidateCountryRestrictions(
  roles: string[] | undefined,
): boolean {
  return (roles ?? []).some((role) =>
    (COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES as readonly string[]).includes(
      role,
    ),
  );
}
