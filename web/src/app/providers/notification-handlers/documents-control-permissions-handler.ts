import type { AppDispatch, RootState } from "@/app/store";
import { updateUserAuthorization } from "@/features/auth/authSlice";
import { usersApi } from "@/features/admin/api";
import type { NotificationHandlerProps } from "./types";

export const DOCUMENTS_CONTROL_PERMISSIONS_SOCKET_EVENT =
  "user:documents-control-permissions-changed";

export const DOCUMENTS_CONTROL_PERMISSIONS_SYNC_TYPE =
  "DocumentsControlPermissionsUpdated";

export interface DocumentsControlPermissionsChangedPayload {
  userId: string;
  updatedAt: string;
  roles: string[];
  permissions: string[];
  userVersion: number;
}

function applyDocumentsControlPermissionsToAuth(
  payload: DocumentsControlPermissionsChangedPayload,
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

/** Direct socket event — apply merged permissions immediately for sidebar/nav. */
export function handleDocumentsControlPermissionsChanged(
  payload: DocumentsControlPermissionsChangedPayload,
  dispatch: AppDispatch,
  getState: () => RootState,
): void {
  applyDocumentsControlPermissionsToAuth(payload, dispatch, getState);
}

/** data:sync fallback for the same permission update. */
export function handleDocumentsControlPermissionsSync(
  payload: DocumentsControlPermissionsChangedPayload & { type?: string },
  dispatch: AppDispatch,
  getState: () => RootState,
): boolean {
  if (payload?.type !== DOCUMENTS_CONTROL_PERMISSIONS_SYNC_TYPE) {
    return false;
  }

  applyDocumentsControlPermissionsToAuth(payload, dispatch, getState);
  return true;
}

/** Optional bell notification path if backend sends notification:new later. */
export function handleDocumentsControlPermissionsNotifications({
  notification,
  dispatch,
  getState,
}: NotificationHandlerProps & { getState?: () => RootState }): boolean {
  if (notification.type !== DOCUMENTS_CONTROL_PERMISSIONS_SYNC_TYPE) {
    return false;
  }

  const meta = notification.meta as
    | Partial<DocumentsControlPermissionsChangedPayload>
    | undefined;

  if (
    getState &&
    meta?.userId &&
    meta.permissions &&
    meta.roles &&
    meta.userVersion !== undefined
  ) {
    applyDocumentsControlPermissionsToAuth(
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

  if (meta?.userId) {
    dispatch(
      usersApi.util.invalidateTags([{ type: "User", id: meta.userId }, "User"]),
    );
  }

  return true;
}
