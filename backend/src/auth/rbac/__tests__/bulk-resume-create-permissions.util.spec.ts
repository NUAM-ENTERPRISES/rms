import {
  bulkResumeCreatePermissionKeysToToggles,
  bulkResumeCreateTogglesToPermissionKeys,
  hasBulkResumeCreateAccess,
} from '../bulk-resume-create-permissions.util';

describe('bulk-resume-create-permissions.util', () => {
  it('maps toggle to permission key', () => {
    expect(
      bulkResumeCreateTogglesToPermissionKeys({
        bulkResumeCreateEnabled: true,
      }),
    ).toEqual(['write:candidates_bulk_resume']);
    expect(
      bulkResumeCreateTogglesToPermissionKeys({
        bulkResumeCreateEnabled: false,
      }),
    ).toEqual([]);
  });

  it('maps direct keys back to toggle', () => {
    expect(
      bulkResumeCreatePermissionKeysToToggles([
        'write:candidates_bulk_resume',
      ]),
    ).toEqual({ bulkResumeCreateEnabled: true });
    expect(bulkResumeCreatePermissionKeysToToggles([])).toEqual({
      bulkResumeCreateEnabled: false,
    });
  });

  it('treats wildcards and direct grant as access', () => {
    expect(hasBulkResumeCreateAccess(['*'])).toBe(true);
    expect(hasBulkResumeCreateAccess(['manage:all'])).toBe(true);
    expect(
      hasBulkResumeCreateAccess(['write:candidates_bulk_resume']),
    ).toBe(true);
    expect(hasBulkResumeCreateAccess(['read:candidates'], true)).toBe(true);
    expect(hasBulkResumeCreateAccess(['read:candidates'])).toBe(false);
  });
});
