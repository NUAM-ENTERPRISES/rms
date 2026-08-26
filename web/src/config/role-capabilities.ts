/**
 * Role capability helpers — use ROLE_NAMES + alias-aware matching.
 */
import {
  expandRoleNames,
  ROLE_NAMES,
  userHasAnyRole,
} from "@/config/role-names";

export const PROJECT_COORDINATOR_ROLE = ROLE_NAMES.PROJECT_COORDINATOR;

/** Roles allowed to change project lifecycle status via PATCH /projects/:id/status */
export const PROJECT_STATUS_UPDATE_ROLES = [
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  "Recruiter Manager",
  ROLE_NAMES.SYSTEM_ADMIN,
  "Admin",
  PROJECT_COORDINATOR_ROLE,
] as const;

export function canUpdateProjectStatus(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return userHasAnyRole(roles, PROJECT_STATUS_UPDATE_ROLES);
}

export const ALL_CANDIDATES_VIEW_ROLES = [
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  "Recruiter Manager",
  ROLE_NAMES.TEAM_HEAD,
  ROLE_NAMES.TEAM_LEAD,
  PROJECT_COORDINATOR_ROLE,
] as const;

export function isProjectCoordinatorRole(role: string): boolean {
  return role === PROJECT_COORDINATOR_ROLE;
}

export function hasAllCandidatesView(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return userHasAnyRole(roles, ALL_CANDIDATES_VIEW_ROLES);
}

export function hasProjectCoordinatorRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some(isProjectCoordinatorRole);
}

/** Roles allowed to set or change user employee codes */
export const EMPLOYEE_CODE_EDIT_ROLES = [
  ROLE_NAMES.MANAGER,
  "Recruiter Manager",
  ROLE_NAMES.SYSTEM_ADMIN,
  "Admin",
] as const;

export function canEditEmployeeCode(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return userHasAnyRole(roles, EMPLOYEE_CODE_EDIT_ROLES);
}

/** Expanded role list for nav hiddenForRoles checks. */
export function matchesAnyRole(
  userRoles: readonly string[],
  required: readonly string[],
): boolean {
  const expanded = expandRoleNames(required);
  return userRoles.some((role) => expanded.includes(role));
}
