import * as fs from 'fs';
import * as path from 'path';
import { PERMISSIONS } from '../../common/constants/permissions';
import { PERMISSIONS_KEY } from '../../auth/rbac/permissions.decorator';
import { QualificationsController } from '../qualifications.controller';

describe('qualification permissions', () => {
  it('defines read and manage qualification keys', () => {
    expect(PERMISSIONS.READ_QUALIFICATIONS).toBe('read:qualifications');
    expect(PERMISSIONS.MANAGE_QUALIFICATIONS).toBe('manage:qualifications');
  });

  it('assigns qualification permissions to Recruiter Manager in seed', () => {
    const seedSource = fs.readFileSync(
      path.join(__dirname, '../../../prisma/seed.ts'),
      'utf8',
    );
    const recruiterManagerBlock = seedSource.slice(
      seedSource.indexOf("name: 'Recruiter Manager'"),
      seedSource.indexOf("name: 'Team Head'"),
    );

    expect(recruiterManagerBlock).toContain("'read:qualifications'");
    expect(recruiterManagerBlock).toContain("'manage:qualifications'");
  });

  it('requires manage:qualifications on write endpoints', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        QualificationsController.prototype.create,
      ),
    ).toEqual([PERMISSIONS.MANAGE_QUALIFICATIONS]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        QualificationsController.prototype.update,
      ),
    ).toEqual([PERMISSIONS.MANAGE_QUALIFICATIONS]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        QualificationsController.prototype.softDelete,
      ),
    ).toEqual([PERMISSIONS.MANAGE_QUALIFICATIONS]);
  });

  it('allows read or manage qualifications on admin list', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        QualificationsController.prototype.findAllForAdmin,
      ),
    ).toEqual([
      PERMISSIONS.READ_QUALIFICATIONS,
      PERMISSIONS.MANAGE_QUALIFICATIONS,
    ]);
  });
});
