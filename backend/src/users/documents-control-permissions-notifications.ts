export const DOCUMENTS_CONTROL_PERMISSIONS_SOCKET_EVENT =
  'user:documents-control-permissions-changed';

export const DOCUMENTS_CONTROL_PERMISSIONS_SYNC_TYPE =
  'DocumentsControlPermissionsUpdated';

export interface DocumentsControlPermissionsChangedPayload {
  userId: string;
  updatedAt: string;
  roles: string[];
  permissions: string[];
  userVersion: number;
}
