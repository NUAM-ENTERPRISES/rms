import { UserAccountStatus } from '@prisma/client';

export const ACCOUNT_STATUS_SOCKET_EVENT = 'account:status-changed';

export const ACCOUNT_STATUS_NOTIFICATION_TYPE = 'account_status_changed';

export function getAccountStatusNotificationContent(status: UserAccountStatus): {
  title: string;
  message: string;
} | null {
  switch (status) {
    case UserAccountStatus.INACTIVE:
      return {
        title: 'Account inactive',
        message:
          'Your account has been set to inactive. Please contact your administrator.',
      };
    case UserAccountStatus.ACTIVE:
      return {
        title: 'Account active',
        message: 'Your account has been reactivated. You have full access again.',
      };
    default:
      return null;
  }
}
