export const DOCUMENTS_CONTROL_CAPABILITIES_SOCKET_EVENT =
  'user:documents-control-capabilities-changed';

export const DOCUMENTS_CONTROL_CAPABILITIES_SYNC_TYPE =
  'DocumentsControlCapabilitiesUpdated';

export interface DocumentsControlCapabilitiesChangedPayload {
  userId: string;
  originalDocumentIntakeEnabled: boolean;
  courierManagementEnabled: boolean;
  updatedAt: string;
  roles: string[];
  permissions: string[];
  userVersion: number;
}
