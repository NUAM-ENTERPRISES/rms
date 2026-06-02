import { UserAccountStatus } from '@prisma/client';
import { getAccountStatusNotificationContent } from '../account-status-notifications';

describe('getAccountStatusNotificationContent', () => {
  it('returns content for INACTIVE and ACTIVE', () => {
    expect(getAccountStatusNotificationContent(UserAccountStatus.INACTIVE)).toEqual(
      expect.objectContaining({ title: 'Account inactive' }),
    );
    expect(getAccountStatusNotificationContent(UserAccountStatus.ACTIVE)).toEqual(
      expect.objectContaining({ title: 'Account active' }),
    );
  });

  it('returns null for BLOCKED', () => {
    expect(getAccountStatusNotificationContent(UserAccountStatus.BLOCKED)).toBeNull();
  });
});
