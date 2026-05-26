/** Mirrors backend project-client-visibility.util — project detail UI only. */

export const ROLES_WITHOUT_PROJECT_CLIENT = [
  'Recruiter',
  'CRE',
  'Screening Trainer',
] as const;

export function canViewProjectClientOnDetail(userRoles: string[] = []): boolean {
  if (!userRoles.length) {
    return true;
  }

  const hasRestrictedRole = userRoles.some((role) =>
    (ROLES_WITHOUT_PROJECT_CLIENT as readonly string[]).includes(role),
  );
  const hasOtherRole = userRoles.some(
    (role) =>
      !(ROLES_WITHOUT_PROJECT_CLIENT as readonly string[]).includes(role),
  );

  return !hasRestrictedRole || hasOtherRole;
}
