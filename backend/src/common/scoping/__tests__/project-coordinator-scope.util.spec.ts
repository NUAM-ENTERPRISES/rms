import {
  isProjectCoordinator,
  isProjectCoordinatorOnly,
} from '../project-coordinator-scope.util';

describe('project-coordinator-scope.util', () => {
  describe('isProjectCoordinatorOnly', () => {
    it('returns false when user is not a project coordinator', () => {
      expect(isProjectCoordinatorOnly(['Manager'])).toBe(false);
    });

    it('returns true for project coordinator without elevated roles', () => {
      expect(isProjectCoordinatorOnly(['Project Coordinator'])).toBe(true);
    });

    it('returns false when project coordinator also has manager role', () => {
      expect(
        isProjectCoordinatorOnly(['Project Coordinator', 'Manager']),
      ).toBe(false);
    });

    it('returns false when project coordinator also has recruiter manager role', () => {
      expect(
        isProjectCoordinatorOnly(['Project Coordinator', 'Recruiter Manager']),
      ).toBe(false);
    });
  });

  describe('isProjectCoordinator', () => {
    it('detects project coordinator role', () => {
      expect(isProjectCoordinator(['Project Coordinator'])).toBe(true);
      expect(isProjectCoordinator(['Recruiter'])).toBe(false);
    });
  });
});
