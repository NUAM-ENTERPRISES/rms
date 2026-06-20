import {
  collectEffectivePermissions,
  documentsControlPermissionKeysToToggles,
  documentsControlTogglesToPermissionKeys,
  DOCUMENTS_CONTROL_PERMISSIONS,
} from '../documents-control-permissions.util';

describe('documents-control-permissions.util', () => {
  describe('documentsControlTogglesToPermissionKeys', () => {
    it('grants intake permissions when intake toggle is enabled', () => {
      const result = documentsControlTogglesToPermissionKeys({
        originalDocumentIntakeEnabled: true,
        courierManagementEnabled: false,
      });

      expect(result).toEqual(
        expect.arrayContaining([
          DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ,
          DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE,
        ]),
      );
      expect(result).not.toContain(DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE);
    });

    it('grants courier permissions and read-only intake when courier toggle is enabled', () => {
      const result = documentsControlTogglesToPermissionKeys({
        originalDocumentIntakeEnabled: false,
        courierManagementEnabled: true,
      });

      expect(result).toEqual(
        expect.arrayContaining([
          DOCUMENTS_CONTROL_PERMISSIONS.COURIER_READ,
          DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE,
          DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ,
        ]),
      );
      expect(result).not.toContain(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE);
    });
  });

  describe('documentsControlPermissionKeysToToggles', () => {
    it('derives toggle state from direct permission keys', () => {
      expect(
        documentsControlPermissionKeysToToggles([
          DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ,
          DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE,
        ]),
      ).toEqual({
        originalDocumentIntakeEnabled: true,
        courierManagementEnabled: false,
      });
    });
  });

  describe('collectEffectivePermissions', () => {
    it('unions role and direct permission keys', () => {
      const result = collectEffectivePermissions(
        ['read:documents', 'write:documents'],
        ['read:original_document_intake'],
      );

      expect(result).toEqual([
        'read:documents',
        'write:documents',
        'read:original_document_intake',
      ]);
    });
  });
});
