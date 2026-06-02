import { Prisma, UserAccountStatus } from '@prisma/client';

/** Prisma fragment: only users eligible for operational listings (assignments, dropdowns, etc.). */
export const ACTIVE_USER_ACCOUNT_WHERE: Pick<
  Prisma.UserWhereInput,
  'accountStatus'
> = {
  accountStatus: UserAccountStatus.ACTIVE,
};

export function withActiveAccountStatus<T extends Prisma.UserWhereInput>(
  where: T,
): T & Pick<Prisma.UserWhereInput, 'accountStatus'> {
  return {
    ...where,
    ...ACTIVE_USER_ACCOUNT_WHERE,
  };
}

/**
 * Admin user management may list every status; all other callers only see ACTIVE users.
 */
export function resolveUserListAccountStatusFilter(options: {
  listAllAccountStatuses: boolean;
  accountStatus?: UserAccountStatus;
}): Pick<Prisma.UserWhereInput, 'accountStatus'> | Record<string, never> {
  if (options.listAllAccountStatuses) {
    return options.accountStatus
      ? { accountStatus: options.accountStatus }
      : {};
  }
  return { ...ACTIVE_USER_ACCOUNT_WHERE };
}
