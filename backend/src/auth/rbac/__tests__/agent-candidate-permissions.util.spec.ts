import {
  CREATE_AGENT_CANDIDATES_PERMISSION,
  agentCandidateCreatePermissionKeysToToggle,
  agentCandidateCreateToggleToPermissionKeys,
} from '../agent-candidate-permissions.util';

describe('agent-candidate-permissions.util', () => {
  it('maps the enabled toggle to the catalog key', () => {
    expect(agentCandidateCreateToggleToPermissionKeys(true)).toEqual([
      CREATE_AGENT_CANDIDATES_PERMISSION,
    ]);
    expect(agentCandidateCreateToggleToPermissionKeys(false)).toEqual([]);
  });

  it('detects the catalog key on a user permission list', () => {
    expect(
      agentCandidateCreatePermissionKeysToToggle([
        'write:candidates',
        'create:agent_candidates',
      ]),
    ).toBe(true);
    expect(agentCandidateCreatePermissionKeysToToggle(['write:candidates'])).toBe(
      false,
    );
  });
});
