import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from '../permissions.guard';

describe('PermissionsGuard send-for-processing', () => {
  const rbacUtil = { hasPermission: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new PermissionsGuard(reflector as any, rbacUtil as any);

  const makeContext = (user: { id?: string; roles?: string[] } | undefined) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue([
      'write:interviews',
      'transfer:processing',
    ]);
  });

  it('allows when rbac reports transfer:processing (or write:interviews)', async () => {
    rbacUtil.hasPermission.mockResolvedValue(true);

    await expect(guard.canActivate(makeContext({ id: 'u1' }))).resolves.toBe(
      true,
    );

    expect(rbacUtil.hasPermission).toHaveBeenCalledWith('u1', [
      'write:interviews',
      'transfer:processing',
    ]);
  });

  it('forbids when rbac reports no matching permission even if named something else', async () => {
    rbacUtil.hasPermission.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        makeContext({ id: 'u2', roles: ['Something Else'] }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
