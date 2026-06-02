import { UnauthorizedException } from '@nestjs/common';
import { UserAccountStatus } from '@prisma/client';
import {
  assertUserNotBlocked,
  BLOCKED_ACCOUNT_MESSAGE,
} from '../assert-user-not-blocked';

describe('assertUserNotBlocked', () => {
  it('allows ACTIVE users', () => {
    expect(() =>
      assertUserNotBlocked({ accountStatus: UserAccountStatus.ACTIVE }),
    ).not.toThrow();
  });

  it('allows INACTIVE users', () => {
    expect(() =>
      assertUserNotBlocked({ accountStatus: UserAccountStatus.INACTIVE }),
    ).not.toThrow();
  });

  it('throws for BLOCKED users with contact admin message', () => {
    expect(() =>
      assertUserNotBlocked({ accountStatus: UserAccountStatus.BLOCKED }),
    ).toThrow(UnauthorizedException);
    expect(() =>
      assertUserNotBlocked({ accountStatus: UserAccountStatus.BLOCKED }),
    ).toThrow(BLOCKED_ACCOUNT_MESSAGE);
  });
});
