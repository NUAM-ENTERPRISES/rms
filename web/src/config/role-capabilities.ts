import { ROLE_NAMES } from "@/config/role-names";

export const PROJECT_COORDINATOR_ROLE = ROLE_NAMES.PROJECT_COORDINATOR;

/** Roles allowed to change project lifecycle status via PATCH /projects/:id/status */
export const PROJECT_STATUS_UPDATE_ROLES = [
  "CEO",
  "Director",
  "Manager",
  "Recruiter Manager",
  "System Admin",
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
  "CEO",
  "Director",
  "Manager",
  "Recruiter Manager",
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
