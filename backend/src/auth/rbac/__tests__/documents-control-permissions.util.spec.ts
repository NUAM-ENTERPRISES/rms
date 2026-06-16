import {
  applyDocumentsControlCapabilityPermissions,
  DOCUMENTS_CONTROL_PERMISSIONS,
} from '../documents-control-permissions.util';

describe('applyDocumentsControlCapabilityPermissions', () => {
  it('grants intake permissions when intake flag is enabled', () => {
    const result = applyDocumentsControlCapabilityPermissions([], {
      originalDocumentIntakeEnabled: true,
      courierManagementEnabled: false,
    });

    expect(result).toEqual(
      expect.arrayContaining([
        DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ,
        DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE,
      ]),
    );
    expect(result).not.toContain('read:candidates');
    expect(result).not.toContain(DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE);
  });

  it('grants courier permissions and read-only intake when courier flag is enabled', () => {
    const result = applyDocumentsControlCapabilityPermissions(['read:projects'], {
      originalDocumentIntakeEnabled: false,
      courierManagementEnabled: true,
    });

    expect(result).toEqual(
      expect.arrayContaining([
        'read:projects',
        DOCUMENTS_CONTROL_PERMISSIONS.COURIER_READ,
        DOCUMENTS_CONTROL_PERMISSIONS.COURIER_WRITE,
        DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_READ,
      ]),
    );
    expect(result).not.toContain('read:candidates');
    expect(result).not.toContain(DOCUMENTS_CONTROL_PERMISSIONS.INTAKE_WRITE);
  });

  it('returns role permissions unchanged when no flags are enabled', () => {
    const result = applyDocumentsControlCapabilityPermissions(
      ['read:documents', 'write:documents'],
      {
        originalDocumentIntakeEnabled: false,
        courierManagementEnabled: false,
      },
    );

    expect(result).toEqual(['read:documents', 'write:documents']);
  });
});
