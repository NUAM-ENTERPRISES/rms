import { ROLE_NAMES } from '../constants/role-ids';

const ELEVATED_ROLES = [
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.SYSTEM_ADMIN,
] as const;

/**
 * Recruiter and CRE users must not see client identity on project detail.
 * Users with management/admin roles retain access.
 */
export function shouldRedactProjectClient(userRoles: string[] = []): boolean {
  if (userRoles.some((role) => ELEVATED_ROLES.includes(role as (typeof ELEVATED_ROLES)[number]))) {
    return false;
  }

  return (
    userRoles.includes(ROLE_NAMES.RECRUITER) ||
    userRoles.includes(ROLE_NAMES.CRE)
  );
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
