/**
 * Roles that may see candidates with source === 'agent' in list/consolidated queries.
 * Others get `NOT { source: 'agent' }` applied in CandidatesService.
 */
export const ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES = [
  'Managing Director',
  'Director',
  'Department Head',
  'Team Head',
  'Team Lead',
  'Admin',
  'SuperAdmin',
  'Agent Coordinator',
] as const;

/** Leadership / admin roles that may view Operations call history for any candidate. */
export const ROLES_THAT_VIEW_OPERATIONS_CALL_HISTORY = [
  'Managing Director',
  'Director',
  'Department Head',
  'Team Head',
  'Team Lead',
  'Recruitment Team Lead',
  'Admin',
  'SuperAdmin',
] as const;

export function canSeeAgentSourcedCandidates(roles: string[]): boolean {
  const allowed = ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES as readonly string[];
  return roles.some((r) => allowed.includes(r));
}

export function hasElevatedOperationsCallHistoryAccess(
  roles: string[],
): boolean {
  const allowed = ROLES_THAT_VIEW_OPERATIONS_CALL_HISTORY as readonly string[];
  return roles.some((r) => allowed.includes(r));
}
