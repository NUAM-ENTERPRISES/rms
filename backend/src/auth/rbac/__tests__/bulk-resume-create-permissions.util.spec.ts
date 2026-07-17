import {
  bulkResumeCreatePermissionKeysToToggles,
  bulkResumeCreateTogglesToPermissionKeys,
  BULK_RESUME_CREATE_PERMISSION,
} from '../bulk-resume-create-permissions.util';

describe('bulk-resume-create-permissions.util', () => {
  describe('bulkResumeCreateTogglesToPermissionKeys', () => {
    it('returns the permission key when enabled', () => {
      expect(
        bulkResumeCreateTogglesToPermissionKeys({
          bulkResumeCreateEnabled: true,
        }),
      ).toEqual([BULK_RESUME_CREATE_PERMISSION]);
    });

    it('returns empty when disabled', () => {
      expect(
        bulkResumeCreateTogglesToPermissionKeys({
          bulkResumeCreateEnabled: false,
        }),
      ).toEqual([]);
    });
  });

  describe('bulkResumeCreatePermissionKeysToToggles', () => {
    it('maps direct keys to toggle', () => {
      expect(
        bulkResumeCreatePermissionKeysToToggles([
          BULK_RESUME_CREATE_PERMISSION,
        ]),
      ).toEqual({ bulkResumeCreateEnabled: true });

      expect(bulkResumeCreatePermissionKeysToToggles([])).toEqual({
        bulkResumeCreateEnabled: false,
      });
    });
  });
});
