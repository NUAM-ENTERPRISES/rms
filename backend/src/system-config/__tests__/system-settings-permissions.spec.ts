import * as fs from 'fs';
import * as path from 'path';
import { PERMISSIONS } from '../../common/constants/permissions';
import { PERMISSIONS_KEY } from '../../auth/rbac/permissions.decorator';
import { SystemConfigController } from '../system-config.controller';
import { ProfessionTypesController } from '../../profession-types/profession-types.controller';
import { RoleDepartmentsController } from '../../role-departments/role-departments.controller';
import { RoleCatalogController } from '../../role-catalog/role-catalog.controller';

describe('system settings area permissions', () => {
  it('defines per-area system settings keys', () => {
    expect(PERMISSIONS.READ_RNR_SETTINGS).toBe('read:rnr_settings');
    expect(PERMISSIONS.MANAGE_RNR_SETTINGS).toBe('manage:rnr_settings');
    expect(PERMISSIONS.READ_HRD_SETTINGS).toBe('read:hrd_settings');
    expect(PERMISSIONS.MANAGE_HRD_SETTINGS).toBe('manage:hrd_settings');
    expect(PERMISSIONS.READ_LEADGEN_CHANNELS).toBe('read:leadgen_channels');
    expect(PERMISSIONS.MANAGE_LEADGEN_CHANNELS).toBe('manage:leadgen_channels');
    expect(PERMISSIONS.READ_OFFICE_ADDRESSES).toBe('read:office_addresses');
    expect(PERMISSIONS.MANAGE_OFFICE_ADDRESSES).toBe('manage:office_addresses');
    expect(PERMISSIONS.READ_MASTER_CATALOG).toBe('read:master_catalog');
    expect(PERMISSIONS.MANAGE_MASTER_CATALOG).toBe('manage:master_catalog');
  });

  it('assigns per-area reads to Recruiter Manager in seed', () => {
    const seedSource = fs.readFileSync(
      path.join(__dirname, '../../../prisma/seed.ts'),
      'utf8',
    );
    const recruiterManagerBlock = seedSource.slice(
      seedSource.indexOf("name: 'Recruiter Manager'"),
      seedSource.indexOf("name: 'Team Head'"),
    );

    expect(recruiterManagerBlock).toContain("'read:rnr_settings'");
    expect(recruiterManagerBlock).toContain("'read:hrd_settings'");
    expect(recruiterManagerBlock).toContain("'read:leadgen_channels'");
    expect(recruiterManagerBlock).toContain("'read:office_addresses'");
    expect(recruiterManagerBlock).toContain("'read:master_catalog'");
    expect(recruiterManagerBlock).toContain("'manage:office_addresses'");
  });

  it('requires RNR manage or legacy manage on RNR update', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        SystemConfigController.prototype.updateRNRSettings,
      ),
    ).toEqual([
      PERMISSIONS.MANAGE_RNR_SETTINGS,
      PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    ]);
  });

  it('allows leadgen read/manage or legacy on leadgen get', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        SystemConfigController.prototype.getLeadgenChannelsSettings,
      ),
    ).toEqual([
      PERMISSIONS.READ_LEADGEN_CHANNELS,
      PERMISSIONS.MANAGE_LEADGEN_CHANNELS,
      PERMISSIONS.READ_SYSTEM_CONFIG,
      PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    ]);
  });

  it('requires master catalog manage or legacy on profession writes', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ProfessionTypesController.prototype.create,
      ),
    ).toEqual([
      PERMISSIONS.MANAGE_MASTER_CATALOG,
      PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        RoleDepartmentsController.prototype.create,
      ),
    ).toEqual([
      PERMISSIONS.MANAGE_MASTER_CATALOG,
      PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        RoleCatalogController.prototype.create,
      ),
    ).toEqual([
      PERMISSIONS.MANAGE_MASTER_CATALOG,
      PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    ]);
  });
});
