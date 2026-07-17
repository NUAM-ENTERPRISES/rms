import { PERMISSIONS } from '../../common/constants/permissions';

export const BULK_RESUME_CREATE_PERMISSION =
  PERMISSIONS.WRITE_CANDIDATES_BULK_RESUME;

export const BULK_RESUME_CREATE_PERMISSION_KEYS = [
  BULK_RESUME_CREATE_PERMISSION,
] as const;

export type BulkResumeCreatePermissionKey =
  (typeof BULK_RESUME_CREATE_PERMISSION_KEYS)[number];

export interface BulkResumeCreateToggles {
  bulkResumeCreateEnabled: boolean;
}

export function bulkResumeCreateTogglesToPermissionKeys(
  toggles: BulkResumeCreateToggles,
): BulkResumeCreatePermissionKey[] {
  if (!toggles.bulkResumeCreateEnabled) {
    return [];
  }
  return [BULK_RESUME_CREATE_PERMISSION];
}

export function bulkResumeCreatePermissionKeysToToggles(
  directKeys: Iterable<string>,
): BulkResumeCreateToggles {
  const keySet = new Set(directKeys);
  return {
    bulkResumeCreateEnabled: keySet.has(BULK_RESUME_CREATE_PERMISSION),
  };
}
