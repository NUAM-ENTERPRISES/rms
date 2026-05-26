import {
  applyProjectClientVisibility,
  shouldRedactProjectClient,
} from '../project-client-visibility.util';
import { ROLE_NAMES } from '../../constants/role-ids';

describe('project-client-visibility.util', () => {
  describe('shouldRedactProjectClient', () => {
    it('redacts for Recruiter without management override', () => {
      expect(shouldRedactProjectClient([ROLE_NAMES.RECRUITER])).toBe(true);
    });

    it('redacts for CRE without management override', () => {
      expect(shouldRedactProjectClient([ROLE_NAMES.CRE])).toBe(true);
    });

    it('does not redact for Recruiter with Manager role', () => {
      expect(
        shouldRedactProjectClient([ROLE_NAMES.RECRUITER, ROLE_NAMES.MANAGER]),
      ).toBe(false);
    });

    it('does not redact for unrelated roles', () => {
      expect(
        shouldRedactProjectClient([ROLE_NAMES.DOCUMENTATION_EXECUTIVE]),
      ).toBe(false);
    });
  });

  describe('applyProjectClientVisibility', () => {
    const project = {
      id: 'p1',
      clientId: 'c1',
      client: { id: 'c1', name: 'Acme Corp', type: 'hospital' },
    };

    it('clears client fields when redacted', () => {
      const result = applyProjectClientVisibility(project, [
        ROLE_NAMES.RECRUITER,
      ]);
      expect(result.client).toBeNull();
      expect(result.clientId).toBeNull();
    });

    it('preserves client when not redacted', () => {
      const result = applyProjectClientVisibility(project, [
        ROLE_NAMES.MANAGER,
      ]);
      expect(result).toEqual(project);
    });
  });
});
