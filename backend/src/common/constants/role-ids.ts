/**
 * Role Constants - Affiniks RMS
 *
 * This file defines all roles in the system.
 * Role IDs are stored in the database and retrieved via RolesService.findIdByName()
 *
 * @module common/constants/role-ids
 */

export const ROLE_NAMES = {
  CEO: 'CEO',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  TEAM_HEAD: 'Team Head',
  TEAM_LEAD: 'Team Lead',
  RECRUITER: 'Recruiter',
  DOCUMENTATION_EXECUTIVE: 'Documentation Executive',
  DOCUMENTS_CONTROL_EXECUTIVE: 'Documents Control Executive',
  PROCESSING_EXECUTIVE: 'Processing Executive',
  INTERVIEW_COORDINATOR: 'Interview Coordinator',
  SYSTEM_ADMIN: 'System Admin',
  OPERATIONS: 'Operations',
  AGENT_COORDINATOR: 'Agent Coordinator',
  PROJECT_COORDINATOR: 'Project Coordinator',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

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

/** Elevated roles that bypass Project Coordinator ownership scoping on status updates */
export const PROJECT_STATUS_UPDATE_ELEVATED_ROLES = [
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
  ROLE_NAMES.SYSTEM_ADMIN,
  'Admin',
] as const;

/** Legacy CRE role name retained for one release of backward compatibility. */
export const LEGACY_CRE_ROLE_NAME = 'CRE';

export function isOperationsRole(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.OPERATIONS ||
    roleName.toUpperCase() === LEGACY_CRE_ROLE_NAME
  );
}
