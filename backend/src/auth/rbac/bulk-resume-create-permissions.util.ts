import { PERMISSIONS } from '../../common/constants/permissions';

export const BULK_RESUME_CREATE_PERMISSION =
  PERMISSIONS.WRITE_CANDIDATES_BULK_RESUME;

export const BULK_RESUME_CREATE_PERMISSION_DESCRIPTION =
  'Create candidates in bulk by uploading and parsing resume PDFs';

/** Roles that receive this permission via seed (keep in sync with prisma/seed.ts). */
export const BULK_RESUME_CREATE_SEEDED_ROLE_NAMES = [
  'Recruiter Manager',
] as const;

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

/** Effective access for UI: explicit key, wildcard, or direct user grant. */
export function hasBulkResumeCreateAccess(
  effectivePermissionKeys: Iterable<string>,
  directGrantEnabled = false,
): boolean {
  if (directGrantEnabled) return true;
  const keys = new Set(effectivePermissionKeys);
  return (
    keys.has(BULK_RESUME_CREATE_PERMISSION) ||
    keys.has('*') ||
    keys.has('manage:all')
  );
}
