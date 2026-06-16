export const DOCUMENTS_CONTROL_PERMISSIONS = {
  INTAKE_READ: 'read:original_document_intake',
  INTAKE_WRITE: 'write:original_document_intake',
  COURIER_READ: 'read:courier_management',
  COURIER_WRITE: 'write:courier_management',
} as const;

export interface DocumentsControlCapabilityFlags {
  originalDocumentIntakeEnabled?: boolean;
  courierManagementEnabled?: boolean;
}

export function applyDocumentsControlCapabilityPermissions(
  permissions: Iterable<string>,
  flags: DocumentsControlCapabilityFlags,
): string[] {
  const set = new Set(permissions);

  if (flags.originalDocumentIntakeEnabled) {
    set.add(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ);
    set.add(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE);
  }

  if (flags.courierManagementEnabled) {
    set.add(DOCUMENTS_CONTROL_PERMISSIONS.COURIER_READ);
    set.add(DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE);
    set.add(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ);
  }

  return Array.from(set);
}
