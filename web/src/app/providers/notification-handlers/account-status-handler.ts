import { profileApi, type UserAccountStatus } from "@/features/profile/api";
import { setSessionAccountStatus } from "@/features/auth/authSlice";
import { AppDispatch } from "@/app/store";
import type { NotificationHandlerProps } from "./types";

export const ACCOUNT_STATUS_NOTIFICATION_TYPE = "account_status_changed";

export const PROFILE_ACCOUNT_STATUS_TAG = {
  type: "User" as const,
  id: "PROFILE",
};

export interface AccountStatusChangedPayload {
  accountStatus: UserAccountStatus;
  previousStatus?: UserAccountStatus;
  message?: string;
  updatedAt?: string;
}

/**
 * Keeps navbar status in sync immediately (Redux) and updates profile cache when loaded.
 */
export function syncProfileAccountStatus(
  dispatch: AppDispatch,
  payload: Pick<AccountStatusChangedPayload, "accountStatus" | "updatedAt">,
): void {
  const { accountStatus, updatedAt } = payload;

  dispatch(setSessionAccountStatus(accountStatus));

  const patchResult = dispatch(
    profileApi.util.updateQueryData("getProfile", undefined, (draft) => {
      if (!draft?.data) return;
      draft.data.accountStatus = accountStatus;
      if (updatedAt !== undefined) {
        draft.data.accountStatusUpdatedAt = updatedAt;
      }
    }),
  );

  if (patchResult.patches.length === 0) {
    void dispatch(
      profileApi.endpoints.getProfile.initiate(undefined, {
        forceRefetch: true,
      }),
    );
  }
}

/** Direct socket event — instant navbar status update. */
export function handleAccountStatusChanged(
  payload: AccountStatusChangedPayload,
  dispatch: AppDispatch,
): void {
  syncProfileAccountStatus(dispatch, payload);
}

/** Bell notification via notification:new — same cache sync. */
export function handleAccountStatusNotifications({
  notification,
  dispatch,
}: NotificationHandlerProps): boolean {
  if (notification.type !== ACCOUNT_STATUS_NOTIFICATION_TYPE) {
    return false;
  }

  const meta = notification.meta as AccountStatusChangedPayload | undefined;
  const accountStatus = meta?.accountStatus;

  if (accountStatus) {
    syncProfileAccountStatus(dispatch, {
      accountStatus,
      updatedAt: meta?.updatedAt,
    });
  } else {
    void dispatch(
      profileApi.endpoints.getProfile.initiate(undefined, {
        forceRefetch: true,
      }),
    );
  }

  return true;
}
