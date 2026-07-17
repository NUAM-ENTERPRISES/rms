export const BULK_RESUME_CREATE_PERMISSIONS_SOCKET_EVENT =
  'user:bulk-resume-create-permissions-changed';

export const BULK_RESUME_CREATE_PERMISSIONS_SYNC_TYPE =
  'BulkResumeCreatePermissionsUpdated';

export interface BulkResumeCreatePermissionsChangedPayload {
  userId: string;
  updatedAt: string;
  roles: string[];
  permissions: string[];
  userVersion: number;
}
