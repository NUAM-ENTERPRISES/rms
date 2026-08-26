/**
 * Role Constants - Affiniks RMS
 *
 * Canonical role *display names* stored in `roles.name`.
 * Legacy names remain accepted for JWT / DB compatibility until re-login / re-seed.
 *
 * @module common/constants/role-ids
 */

export const ROLE_NAMES = {
  /** Canonical: Managing Director (legacy JWT/DB: CEO) */
  CEO: 'Managing Director',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  TEAM_HEAD: 'Team Head',
  TEAM_LEAD: 'Team Lead',
  /** Canonical: Recruitment Executive (legacy: Recruiter) */
  RECRUITER: 'Recruitment Executive',
  DOCUMENTATION_EXECUTIVE: 'Documentation Executive',
  /** Canonical: Document Control Executive (legacy: Documents Control Executive) */
  DOCUMENTS_CONTROL_EXECUTIVE: 'Document Control Executive',
  PROCESSING_EXECUTIVE: 'Processing Executive',
  INTERVIEW_COORDINATOR: 'Interview Coordinator',
  SYSTEM_ADMIN: 'System Admin',
  /** Canonical: Operations Executive (legacy: Operations, CRE) */
  OPERATIONS: 'Operations Executive',
  AGENT_COORDINATOR: 'Agent Coordinator',
  PROJECT_COORDINATOR: 'Project Coordinator',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

/** Previous role names kept for one release of JWT / query compatibility. */
export const LEGACY_ROLE_NAMES = {
  CEO: 'CEO',
  RECRUITER: 'Recruiter',
  DOCUMENTS_CONTROL_EXECUTIVE: 'Documents Control Executive',
  OPERATIONS: 'Operations',
} as const;

/** @deprecated Legacy CRE role name — prefer ROLE_NAMES.OPERATIONS */
export const LEGACY_CRE_ROLE_NAME = 'CRE';

const ROLE_ALIAS_GROUPS: readonly (readonly string[])[] = [
  [ROLE_NAMES.CEO, LEGACY_ROLE_NAMES.CEO],
  [ROLE_NAMES.RECRUITER, LEGACY_ROLE_NAMES.RECRUITER],
  [
    ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE,
    LEGACY_ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE,
  ],
  [ROLE_NAMES.OPERATIONS, LEGACY_ROLE_NAMES.OPERATIONS, LEGACY_CRE_ROLE_NAME],
];

/** All accepted names for a role (canonical + legacy aliases). */
export function roleNameAliases(roleName: string): string[] {
  const group = ROLE_ALIAS_GROUPS.find((names) => names.includes(roleName));
  if (group) return [...group];
  return [roleName];
}

/** Expand a list of role names to include legacy aliases (for nav / guards / Prisma `in`). */
export function expandRoleNames(roleNames: readonly string[]): string[] {
  const out = new Set<string>();
  for (const name of roleNames) {
    for (const alias of roleNameAliases(name)) {
      out.add(alias);
    }
  }
  return [...out];
}

export function roleNameEquals(left: string, right: string): boolean {
  return roleNameAliases(left).includes(right) || roleNameAliases(right).includes(left);
}

export function userHasAnyRole(
  userRoles: readonly string[],
  requiredRoles: readonly string[],
): boolean {
  const expandedRequired = expandRoleNames(requiredRoles);
  return userRoles.some((role) => expandedRequired.includes(role));
}

/** Roles allowed to change project lifecycle status via PATCH /projects/:id/status */
export const PROJECT_STATUS_UPDATE_ROLES = [
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
  ROLE_NAMES.SYSTEM_ADMIN,
  'Admin',
  ROLE_NAMES.PROJECT_COORDINATOR,
] as const;

/** Roles allowed to approve/reject candidate project withdrawn/on-hold requests */
export const CANDIDATE_PROJECT_STATUS_CHANGE_APPROVER_ROLES = [
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
  ROLE_NAMES.SYSTEM_ADMIN,
  'Admin',
] as const;

/** Roles that may apply Withdrawn/On Hold directly without approval workflow */
export const CANDIDATE_PROJECT_STATUS_CHANGE_DIRECT_ROLES = [
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
] as const;

/** Roles allowed to approve/reject processing cancel/hold requests */
export const PROCESSING_STATUS_CHANGE_APPROVER_ROLES = [
  ROLE_NAMES.MANAGER,
  'Processing Manager',
] as const;

/** Roles that may apply processing cancel/hold directly without approval */
export const PROCESSING_STATUS_CHANGE_DIRECT_ROLES = [
  ROLE_NAMES.MANAGER,
  'Processing Manager',
] as const;

/** Roles that may lift country restrictions from the candidate profile */
export const COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES = [
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
] as const;

/** Roles allowed to set or change user employee codes */
export const EMPLOYEE_CODE_EDIT_ROLES = [
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
  ROLE_NAMES.SYSTEM_ADMIN,
  'Admin',
] as const;

/** Elevated roles that bypass Project Coordinator ownership scoping on status updates */
export const PROJECT_STATUS_UPDATE_ELEVATED_ROLES = [
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
  ROLE_NAMES.SYSTEM_ADMIN,
  'Admin',
] as const;

export function isOperationsRole(roleName: string): boolean {
  return roleNameAliases(ROLE_NAMES.OPERATIONS).includes(roleName);
}

export function isRecruiterRole(roleName: string): boolean {
  return roleNameAliases(ROLE_NAMES.RECRUITER).includes(roleName);
}

export function isDocumentsControlExecutiveRole(roleName: string): boolean {
  return roleNameAliases(ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE).includes(
    roleName,
  );
}
