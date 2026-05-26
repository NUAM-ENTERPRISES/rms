import { ROLE_NAMES } from '../constants/role-ids';

/** Roles that must not see client identity on project detail (when no other role applies). */
export const ROLES_WITHOUT_PROJECT_CLIENT = [
  ROLE_NAMES.RECRUITER,
  ROLE_NAMES.CRE,
  'Screening Trainer',
] as const;

/**
 * Hide client on project detail only for Recruiter, CRE, and Screening Trainer.
 * Users with any additional role (e.g. Manager + Recruiter) still see the client.
 */
export function shouldRedactProjectClient(userRoles: string[] = []): boolean {
  if (!userRoles.length) {
    return false;
  }

  const hasRestrictedRole = userRoles.some((role) =>
    (ROLES_WITHOUT_PROJECT_CLIENT as readonly string[]).includes(role),
  );
  const hasOtherRole = userRoles.some(
    (role) =>
      !(ROLES_WITHOUT_PROJECT_CLIENT as readonly string[]).includes(role),
  );

  return hasRestrictedRole && !hasOtherRole;
}

export function canViewProjectClient(userRoles: string[] = []): boolean {
  return !shouldRedactProjectClient(userRoles);
}

export function applyProjectClientVisibility<
  T extends { client?: unknown | null; clientId?: string | null },
>(project: T, userRoles?: string[]): T {
  if (!shouldRedactProjectClient(userRoles ?? [])) {
    return project;
  }

  return {
    ...project,
    clientId: null,
    client: null,
  };
}
