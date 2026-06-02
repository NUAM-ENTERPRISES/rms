import { UnauthorizedException } from '@nestjs/common';
import { UserAccountStatus } from '@prisma/client';

export const BLOCKED_ACCOUNT_MESSAGE =
  'Your account is blocked. Please contact admin.';

export function assertUserNotBlocked(
  user: { accountStatus?: UserAccountStatus } | null | undefined,
): void {
  if (!user) {
    return;
  }
  if (user.accountStatus === UserAccountStatus.BLOCKED) {
    throw new UnauthorizedException(BLOCKED_ACCOUNT_MESSAGE);
  }
}
