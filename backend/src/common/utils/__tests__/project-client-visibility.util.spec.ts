import {
  applyProjectClientVisibility,
  canViewProjectClient,
  shouldRedactProjectClient,
} from '../project-client-visibility.util';
import { ROLE_NAMES } from '../../constants/role-ids';

describe('project-client-visibility.util', () => {
  describe('shouldRedactProjectClient', () => {
    it('redacts for Recruiter only', () => {
      expect(shouldRedactProjectClient([ROLE_NAMES.RECRUITER])).toBe(true);
    });

    it('redacts for CRE only', () => {
      expect(shouldRedactProjectClient([ROLE_NAMES.CRE])).toBe(true);
    });

    it('redacts for Screening Trainer only', () => {
      expect(shouldRedactProjectClient(['Screening Trainer'])).toBe(true);
    });

    it('does not redact for Documentation Executive', () => {
      expect(
        shouldRedactProjectClient([ROLE_NAMES.DOCUMENTATION_EXECUTIVE]),
      ).toBe(false);
    });

    it('does not redact when Recruiter also has Manager', () => {
      expect(
        shouldRedactProjectClient([ROLE_NAMES.RECRUITER, ROLE_NAMES.MANAGER]),
      ).toBe(false);
    });

    it('does not redact for Team Head', () => {
      expect(shouldRedactProjectClient([ROLE_NAMES.TEAM_HEAD])).toBe(false);
    });
  });

  describe('canViewProjectClient', () => {
    it('allows managers and specialists', () => {
      expect(canViewProjectClient([ROLE_NAMES.MANAGER])).toBe(true);
      expect(
        canViewProjectClient([ROLE_NAMES.PROCESSING_EXECUTIVE]),
      ).toBe(true);
    });
  });

  describe('applyProjectClientVisibility', () => {
    const project = {
      id: 'p1',
      clientId: 'c1',
      client: { id: 'c1', name: 'Acme Corp', type: 'hospital' },
    };

    it('clears client for restricted-only roles', () => {
      const result = applyProjectClientVisibility(project, [
        ROLE_NAMES.RECRUITER,
      ]);
      expect(result.client).toBeNull();
      expect(result.clientId).toBeNull();
    });

    it('preserves client for unrestricted roles', () => {
      const result = applyProjectClientVisibility(project, [
        ROLE_NAMES.DOCUMENTATION_EXECUTIVE,
      ]);
      expect(result).toEqual(project);
    });
  });
});
