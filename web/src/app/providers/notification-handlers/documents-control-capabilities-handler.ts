import type { AppDispatch, RootState } from "@/app/store";
import { updateUserAuthorization } from "@/features/auth/authSlice";
import { usersApi } from "@/features/admin/api";
import type { NotificationHandlerProps } from "./types";

export const DOCUMENTS_CONTROL_CAPABILITIES_SOCKET_EVENT =
  "user:documents-control-capabilities-changed";

export const DOCUMENTS_CONTROL_CAPABILITIES_SYNC_TYPE =
  "DocumentsControlCapabilitiesUpdated";

export interface DocumentsControlCapabilitiesChangedPayload {
  userId: string;
  originalDocumentIntakeEnabled: boolean;
  courierManagementEnabled: boolean;
  updatedAt: string;
  roles: string[];
  permissions: string[];
  userVersion: number;
}

function applyDocumentsControlCapabilitiesToAuth(
  payload: DocumentsControlCapabilitiesChangedPayload,
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
export function handleDocumentsControlCapabilitiesChanged(
  payload: DocumentsControlCapabilitiesChangedPayload,
  dispatch: AppDispatch,
  getState: () => RootState,
): void {
  applyDocumentsControlCapabilitiesToAuth(payload, dispatch, getState);
}

/** data:sync fallback for the same capability update. */
export function handleDocumentsControlCapabilitiesSync(
  payload: DocumentsControlCapabilitiesChangedPayload & { type?: string },
  dispatch: AppDispatch,
  getState: () => RootState,
): boolean {
  if (payload?.type !== DOCUMENTS_CONTROL_CAPABILITIES_SYNC_TYPE) {
    return false;
  }

  applyDocumentsControlCapabilitiesToAuth(payload, dispatch, getState);
  return true;
}

/** Optional bell notification path if backend sends notification:new later. */
export function handleDocumentsControlCapabilitiesNotifications({
  notification,
  dispatch,
  getState,
}: NotificationHandlerProps & { getState?: () => RootState }): boolean {
  if (notification.type !== DOCUMENTS_CONTROL_CAPABILITIES_SYNC_TYPE) {
    return false;
  }

  const meta = notification.meta as
    | Partial<DocumentsControlCapabilitiesChangedPayload>
    | undefined;

  if (
    getState &&
    meta?.userId &&
    meta.permissions &&
    meta.roles &&
    meta.userVersion !== undefined
  ) {
    applyDocumentsControlCapabilitiesToAuth(
      {
        userId: meta.userId,
        originalDocumentIntakeEnabled: meta.originalDocumentIntakeEnabled ?? false,
        courierManagementEnabled: meta.courierManagementEnabled ?? false,
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
