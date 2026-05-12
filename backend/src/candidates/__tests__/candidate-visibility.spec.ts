import {
  canSeeAgentSourcedCandidates,
  ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES,
} from '../candidate-visibility';
import { ROLE_NAMES } from '../../common/constants/role-ids';

describe('candidate-visibility', () => {
  describe('canSeeAgentSourcedCandidates', () => {
    it('returns true when Agent Coordinator is among roles', () => {
      expect(
        canSeeAgentSourcedCandidates([
          'Interview Coordinator',
          ROLE_NAMES.AGENT_COORDINATOR,
        ]),
      ).toBe(true);
      expect(
        canSeeAgentSourcedCandidates([ROLE_NAMES.AGENT_COORDINATOR]),
      ).toBe(true);
    });

    it('returns false when viewer lacks privileged roles', () => {
      expect(
        canSeeAgentSourcedCandidates(['Interview Coordinator']),
      ).toBe(false);
      expect(
        canSeeAgentSourcedCandidates(['Documentation Executive']),
      ).toBe(false);
      expect(canSeeAgentSourcedCandidates([])).toBe(false);
    });

    it('returns true for leadership roles used in source filtering', () => {
      expect(canSeeAgentSourcedCandidates(['CEO'])).toBe(true);
      expect(canSeeAgentSourcedCandidates(['Team Lead'])).toBe(true);
      expect(canSeeAgentSourcedCandidates(['System Admin'])).toBe(true);
    });

    it('documents Agent Coordinator in exported allowlist', () => {
      expect(
        ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES.includes(
          ROLE_NAMES.AGENT_COORDINATOR,
        ),
      ).toBe(true);
    });
  });
});
