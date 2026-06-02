import { UserAccountStatus } from '@prisma/client';
import {
  ACTIVE_USER_ACCOUNT_WHERE,
  resolveUserListAccountStatusFilter,
  withActiveAccountStatus,
} from '../user-account-status.filter';

describe('user-account-status.filter', () => {
  it('resolveUserListAccountStatusFilter returns ACTIVE for non-admin', () => {
    expect(
      resolveUserListAccountStatusFilter({ listAllAccountStatuses: false }),
    ).toEqual(ACTIVE_USER_ACCOUNT_WHERE);
  });

  it('resolveUserListAccountStatusFilter allows admin to filter by status', () => {
    expect(
      resolveUserListAccountStatusFilter({
        listAllAccountStatuses: true,
        accountStatus: UserAccountStatus.BLOCKED,
      }),
    ).toEqual({ accountStatus: UserAccountStatus.BLOCKED });
  });

  it('resolveUserListAccountStatusFilter allows admin to list all statuses', () => {
    expect(
      resolveUserListAccountStatusFilter({ listAllAccountStatuses: true }),
    ).toEqual({});
  });

  it('withActiveAccountStatus merges role filters', () => {
    expect(
      withActiveAccountStatus({
        userRoles: { some: { role: { name: 'Recruiter' } } },
      }),
    ).toEqual({
      accountStatus: UserAccountStatus.ACTIVE,
      userRoles: { some: { role: { name: 'Recruiter' } } },
    });
  });
});
