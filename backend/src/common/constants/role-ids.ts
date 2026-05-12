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
  CRE: 'CRE',
  AGENT_COORDINATOR: 'Agent Coordinator',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
