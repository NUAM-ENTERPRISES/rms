export const CREATE_AGENT_CANDIDATES_PERMISSION = 'create:agent_candidates';

export function agentCandidateCreateToggleToPermissionKeys(
  createAgentCandidatesEnabled: boolean,
): string[] {
  return createAgentCandidatesEnabled
    ? [CREATE_AGENT_CANDIDATES_PERMISSION]
    : [];
}

export function agentCandidateCreatePermissionKeysToToggle(
  keys: readonly string[],
): boolean {
  return keys.includes(CREATE_AGENT_CANDIDATES_PERMISSION);
}
