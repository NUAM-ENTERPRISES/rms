export const DOCUMENTS_CONTROL_PERMISSIONS = {
  INTAKE_READ: 'read:original_document_intake',
  INTAKE_WRITE: 'write:original_document_intake',
  COURIER_READ: 'read:courier_management',
  COURIER_WRITE: 'write:courier_management',
} as const;

export const DOCUMENTS_CONTROL_PERMISSION_KEYS = [
  DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ,
  DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE,
  DOCUMENTS_CONTROL_PERMISSIONS.COURIER_READ,
  DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE,
] as const;

export type DocumentsControlPermissionKey =
  (typeof DOCUMENTS_CONTROL_PERMISSION_KEYS)[number];

export interface DocumentsControlToggles {
  originalDocumentIntakeEnabled: boolean;
  courierManagementEnabled: boolean;
}

export function collectEffectivePermissions(
  rolePermissionKeys: Iterable<string>,
  directPermissionKeys: Iterable<string>,
): string[] {
  return Array.from(
    new Set([...rolePermissionKeys, ...directPermissionKeys]),
  );
}

export function documentsControlTogglesToPermissionKeys(
  toggles: DocumentsControlToggles,
): DocumentsControlPermissionKey[] {
  const keys = new Set<DocumentsControlPermissionKey>();

  if (toggles.originalDocumentIntakeEnabled) {
    keys.add(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ);
    keys.add(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE);
  }

  if (toggles.courierManagementEnabled) {
    keys.add(DOCUMENTS_CONTROL_PERMISSIONS.COURIER_READ);
    keys.add(DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE);
    keys.add(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ);
  }

  return Array.from(keys);
}

export function documentsControlPermissionKeysToToggles(
  directKeys: Iterable<string>,
): DocumentsControlToggles {
  const keySet = new Set(directKeys);

  const hasIntakeRead = keySet.has(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ);
  const hasIntakeWrite = keySet.has(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE);
  const hasCourierRead = keySet.has(DOCUMENTS_CONTROL_PERMISSIONS.COURIER_READ);
  const hasCourierWrite = keySet.has(
    DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE,
  );

  return {
    originalDocumentIntakeEnabled: hasIntakeRead && hasIntakeWrite,
    courierManagementEnabled: hasCourierRead && hasCourierWrite,
  };
}
