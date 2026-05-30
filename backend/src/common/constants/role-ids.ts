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
  PROCESSING_EXECUTIVE: 'Processing Executive',
  INTERVIEW_COORDINATOR: 'Interview Coordinator',
  SYSTEM_ADMIN: 'System Admin',
  OPERATIONS: 'Operations',
  AGENT_COORDINATOR: 'Agent Coordinator',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

/** Legacy CRE role name retained for one release of backward compatibility. */
export const LEGACY_CRE_ROLE_NAME = 'CRE';

export function isOperationsRole(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.OPERATIONS ||
    roleName.toUpperCase() === LEGACY_CRE_ROLE_NAME
  );
}
