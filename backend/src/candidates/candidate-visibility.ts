import { userHasAnyRole } from '../common/constants/role-ids';

/**
 * Roles that may see candidates with source === 'agent' in list/consolidated queries.
 * Others get `NOT { source: 'agent' }` applied in CandidatesService.
 */
export const ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES = [
  'Managing Director',
  'Director',
  'Manager',
  'Team Head',
  'Team Lead',
  'Admin',
  'SuperAdmin',
  'System Admin',
  'Agent Coordinator',
] as const;

/** Leadership / admin roles that may view Operations call history for any candidate. */
export const ROLES_THAT_VIEW_OPERATIONS_CALL_HISTORY = [
  'Managing Director',
  'Director',
  'Manager',
  'Team Head',
  'Team Lead',
  'Recruitment Lead',
  'Admin',
  'SuperAdmin',
  'System Admin',
] as const;

export function canSeeAgentSourcedCandidates(roles: string[]): boolean {
  return userHasAnyRole(roles, ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES);
}

export function hasElevatedOperationsCallHistoryAccess(
  roles: string[],
): boolean {
  return userHasAnyRole(roles, ROLES_THAT_VIEW_OPERATIONS_CALL_HISTORY);
}
