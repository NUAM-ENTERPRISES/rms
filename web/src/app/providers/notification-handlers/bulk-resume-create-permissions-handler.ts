import type { AppDispatch, RootState } from "@/app/store";
import { updateUserAuthorization } from "@/features/auth/authSlice";
import { usersApi } from "@/features/admin/api";
import type { NotificationHandlerProps } from "./types";

export const BULK_RESUME_CREATE_PERMISSIONS_SOCKET_EVENT =
  "user:bulk-resume-create-permissions-changed";

export const BULK_RESUME_CREATE_PERMISSIONS_SYNC_TYPE =
  "BulkResumeCreatePermissionsUpdated";

export interface BulkResumeCreatePermissionsChangedPayload {
  userId: string;
  updatedAt: string;
  roles: string[];
  permissions: string[];
  userVersion: number;
}

function applyBulkResumeCreatePermissionsToAuth(
  payload: BulkResumeCreatePermissionsChangedPayload,
  dispatch: AppDispatch,
  getState: () => RootState,
): void {
  const state = getState();
  const currentUser = state.auth?.user;
  if (!currentUser || currentUser.id !== payload.userId) {
    return;
  }

  dispatch(
    updateUserAuthorization({
      permissions: payload.permissions,
      roles: payload.roles,
      userVersion: payload.userVersion,
    }),
  );
}

export function handleBulkResumeCreatePermissionsChanged(
  payload: BulkResumeCreatePermissionsChangedPayload,
  dispatch: AppDispatch,
  getState: () => RootState,
): void {
  applyBulkResumeCreatePermissionsToAuth(payload, dispatch, getState);
}

export function handleBulkResumeCreatePermissionsSync(
  payload: BulkResumeCreatePermissionsChangedPayload & { type?: string },
  dispatch: AppDispatch,
  getState: () => RootState,
): boolean {
  if (payload?.type !== BULK_RESUME_CREATE_PERMISSIONS_SYNC_TYPE) {
    return false;
  }

  applyBulkResumeCreatePermissionsToAuth(payload, dispatch, getState);
  return true;
}

export function handleBulkResumeCreatePermissionsNotifications({
  notification,
  dispatch,
  getState,
}: NotificationHandlerProps & { getState?: () => RootState }): boolean {
  if (notification.type !== BULK_RESUME_CREATE_PERMISSIONS_SYNC_TYPE) {
    return false;
  }

  const meta = notification.meta as
    | Partial<BulkResumeCreatePermissionsChangedPayload>
    | undefined;

  if (
    getState &&
    meta?.userId &&
    meta.permissions &&
    meta.roles &&
    typeof meta.userVersion === "number"
  ) {
    applyBulkResumeCreatePermissionsToAuth(
      {
        userId: meta.userId,
        updatedAt: meta.updatedAt ?? new Date().toISOString(),
        roles: meta.roles,
        permissions: meta.permissions,
        userVersion: meta.userVersion,
      },
      dispatch,
      getState,
    );
  }

  dispatch(usersApi.util.invalidateTags(["User"]));
  return true;
}
