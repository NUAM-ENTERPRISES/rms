/**
 * Role Constants - Affiniks RMS
 *
 * This file defines all roles in the system.
 * Role IDs are stored in the database and retrieved via RolesService.findIdByName()
 *
 * @module common/constants/role-ids
 */

export const ROLE_NAMES = {
  CEO: 'Managing Director',
  DIRECTOR: 'Director',
  MANAGER: 'Department Head',
  TEAM_HEAD: 'Team Head',
  TEAM_LEAD: 'Team Lead',
  RECRUITER: 'Recruitment Executive',
  RECRUITER_MANAGER: 'Recruitment Team Lead',
  PROCESSING_MANAGER: 'Processing Team Lead',
  DOCUMENTATION_EXECUTIVE: 'Documentation Executive',
  DOCUMENTS_CONTROL_EXECUTIVE: 'Document Control Executive',
  PROCESSING_EXECUTIVE: 'Processing Executive',
  INTERVIEW_COORDINATOR: 'Interview Coordinator',
  SCREENING_TRAINER: 'Screening & Training Executive',
  SYSTEM_ADMIN: 'Admin',
  OPERATIONS: 'Operations Executive',
  AGENT_COORDINATOR: 'Agent Coordinator',
  PROJECT_COORDINATOR: 'Project Coordinator',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

/** Legacy role names retained for one release of JWT / string-check compatibility. */
export const LEGACY_ROLE_NAMES = {
  CEO: 'CEO',
  MANAGER: 'Manager',
  RECRUITER: 'Recruiter',
  RECRUITER_MANAGER: 'Recruiter Manager',
  PROCESSING_MANAGER: 'Processing Manager',
  DOCUMENTS_CONTROL_EXECUTIVE: 'Documents Control Executive',
  SCREENING_TRAINER: 'Screening Trainer',
  SYSTEM_ADMIN: 'System Admin',
  OPERATIONS: 'Operations',
  CRE: 'CRE',
} as const;

/** Legacy CRE role name retained for one release of backward compatibility. */
export const LEGACY_CRE_ROLE_NAME = LEGACY_ROLE_NAMES.CRE;

export function withLegacyAliases(
  ...names: readonly (RoleName | string)[]
): string[] {
  const aliases: Record<string, string[]> = {
    [ROLE_NAMES.CEO]: [LEGACY_ROLE_NAMES.CEO],
    [ROLE_NAMES.MANAGER]: [LEGACY_ROLE_NAMES.MANAGER],
    [ROLE_NAMES.RECRUITER]: [LEGACY_ROLE_NAMES.RECRUITER],
    [ROLE_NAMES.RECRUITER_MANAGER]: [LEGACY_ROLE_NAMES.RECRUITER_MANAGER],
    [ROLE_NAMES.PROCESSING_MANAGER]: [LEGACY_ROLE_NAMES.PROCESSING_MANAGER],
    [ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE]: [
      LEGACY_ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE,
    ],
    [ROLE_NAMES.SCREENING_TRAINER]: [LEGACY_ROLE_NAMES.SCREENING_TRAINER],
    [ROLE_NAMES.SYSTEM_ADMIN]: [LEGACY_ROLE_NAMES.SYSTEM_ADMIN],
    [ROLE_NAMES.OPERATIONS]: [
      LEGACY_ROLE_NAMES.OPERATIONS,
      LEGACY_ROLE_NAMES.CRE,
    ],
  };

  const result: string[] = [];
  for (const name of names) {
    result.push(name);
    const legacy = aliases[name];
    if (legacy) {
      result.push(...legacy);
    }
  }
  return result;
}

/** Roles allowed to change project lifecycle status via PATCH /projects/:id/status */
export const PROJECT_STATUS_UPDATE_ROLES = withLegacyAliases(
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.RECRUITER_MANAGER,
  ROLE_NAMES.SYSTEM_ADMIN,
  ROLE_NAMES.PROJECT_COORDINATOR,
);

/** Roles allowed to approve/reject candidate project withdrawn/on-hold requests */
export const CANDIDATE_PROJECT_STATUS_CHANGE_APPROVER_ROLES = withLegacyAliases(
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.RECRUITER_MANAGER,
  ROLE_NAMES.SYSTEM_ADMIN,
);

/** Roles that may apply Withdrawn/On Hold directly without approval workflow */
export const CANDIDATE_PROJECT_STATUS_CHANGE_DIRECT_ROLES = withLegacyAliases(
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.RECRUITER_MANAGER,
);

/** Roles allowed to approve/reject processing cancel/hold requests */
export const PROCESSING_STATUS_CHANGE_APPROVER_ROLES = withLegacyAliases(
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.PROCESSING_MANAGER,
);

/** Roles that may apply processing cancel/hold directly without approval */
export const PROCESSING_STATUS_CHANGE_DIRECT_ROLES = withLegacyAliases(
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.PROCESSING_MANAGER,
);

/** Roles that may lift country restrictions from the candidate profile */
export const COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES = withLegacyAliases(
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.RECRUITER_MANAGER,
);

/** Roles allowed to set or change user employee codes */
export const EMPLOYEE_CODE_EDIT_ROLES = withLegacyAliases(
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.RECRUITER_MANAGER,
  ROLE_NAMES.SYSTEM_ADMIN,
);

/** Elevated roles that bypass Project Coordinator ownership scoping on status updates */
export const PROJECT_STATUS_UPDATE_ELEVATED_ROLES = withLegacyAliases(
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.RECRUITER_MANAGER,
  ROLE_NAMES.SYSTEM_ADMIN,
);

export function isOperationsRole(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.OPERATIONS ||
    roleName === LEGACY_ROLE_NAMES.OPERATIONS ||
    roleName.toUpperCase() === LEGACY_CRE_ROLE_NAME
  );
}

export function isSystemAdminRole(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.SYSTEM_ADMIN ||
    roleName === LEGACY_ROLE_NAMES.SYSTEM_ADMIN
  );
}

export function isRecruiterRole(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.RECRUITER ||
    roleName === LEGACY_ROLE_NAMES.RECRUITER
  );
}

export function isDocumentsControlRole(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE ||
    roleName === LEGACY_ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE
  );
}

export function matchesAnyRole(
  userRoles: readonly string[] | undefined | null,
  allowed: readonly string[],
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((r) => allowed.includes(r));
}
