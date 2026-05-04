import {
  canSeeAgentSourcedCandidates,
  ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES,
} from '../candidate-visibility';

describe('candidate-visibility', () => {
  describe('canSeeAgentSourcedCandidates', () => {
    it('returns true when Client Coordinator is among roles', () => {
      expect(
        canSeeAgentSourcedCandidates([
          'Interview Coordinator',
          'Client Coordinator',
        ]),
      ).toBe(true);
      expect(canSeeAgentSourcedCandidates(['Client Coordinator'])).toBe(true);
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

    it('documents Client Coordinator in exported allowlist', () => {
      expect(
        ROLES_THAT_SEE_AGENT_SOURCED_CANDIDATES.includes('Client Coordinator'),
      ).toBe(true);
    });
  });
});
