import { ROLE_NAMES } from "@/config/role-names";

export const PROJECT_COORDINATOR_ROLE = ROLE_NAMES.PROJECT_COORDINATOR;

/** Roles allowed to change project lifecycle status via PATCH /projects/:id/status */
export const PROJECT_STATUS_UPDATE_ROLES = [
  "Managing Director",
  "Director",
  "Department Head",
  "Recruitment Team Lead",
  "Admin",
  PROJECT_COORDINATOR_ROLE,
] as const;

export function canUpdateProjectStatus(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((role) =>
    (PROJECT_STATUS_UPDATE_ROLES as readonly string[]).includes(role)
  );
}

export const ALL_CANDIDATES_VIEW_ROLES = [
  "Managing Director",
  "Director",
  "Department Head",
  "Recruitment Team Lead",
  "Team Head",
  "Team Lead",
  PROJECT_COORDINATOR_ROLE,
] as const;

export function isProjectCoordinatorRole(role: string): boolean {
  return role === PROJECT_COORDINATOR_ROLE;
}

export function hasAllCandidatesView(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((role) =>
    (ALL_CANDIDATES_VIEW_ROLES as readonly string[]).includes(role)
  );
}

export function hasProjectCoordinatorRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some(isProjectCoordinatorRole);
}

/** Roles allowed to set or change user employee codes */
export const EMPLOYEE_CODE_EDIT_ROLES = [
  "Department Head",
  "Recruitment Team Lead",
  "Admin",
] as const;

export function canEditEmployeeCode(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((role) =>
    (EMPLOYEE_CODE_EDIT_ROLES as readonly string[]).includes(role),
  );
}
