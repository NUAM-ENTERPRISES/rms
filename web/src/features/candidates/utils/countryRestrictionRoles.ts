import { ROLE_NAMES, userHasAnyRole } from "@/config/role-names";

export const COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES = [
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.RECRUITMENT_LEAD,
] as const;

export function canEditCandidateCountryRestrictions(
  roles: string[] | undefined,
): boolean {
  return userHasAnyRole(roles ?? [], COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES);
}
