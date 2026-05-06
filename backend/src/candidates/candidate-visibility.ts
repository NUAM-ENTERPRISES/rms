/**
 * Roles that may see candidates with source === 'agent' in list/consolidated queries.
 * Others get `NOT { source: 'agent' }` applied in CandidatesService.
 */
export const ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES = [
  'CEO',
  'Director',
  'Manager',
  'Team Head',
  'Team Lead',
  'Admin',
  'SuperAdmin',
  'System Admin',
  'Client Coordinator',
] as const;

export function canSeeAgentSourcedCandidates(roles: string[]): boolean {
  const allowed = ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES as readonly string[];
  return roles.some((r) => allowed.includes(r));
}
