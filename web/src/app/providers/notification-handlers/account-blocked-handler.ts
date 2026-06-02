import { AppDispatch } from "@/app/store";
import { baseApi } from "@/app/api/baseApi";
import { clearCredentials } from "@/features/auth/authSlice";
import {
  BLOCKED_ACCOUNT_MESSAGE,
  BLOCKED_ACCOUNT_SESSION_KEY,
  BLOCKED_ACCOUNT_QUERY_PARAM,
} from "@/shared/constants/account-status";
import { toast } from "sonner";

export interface AccountBlockedPayload {
  message?: string;
}

export function handleAccountBlocked(
  payload: AccountBlockedPayload,
  dispatch: AppDispatch,
): void {
  const message = payload.message?.trim() || BLOCKED_ACCOUNT_MESSAGE;
  sessionStorage.setItem(BLOCKED_ACCOUNT_SESSION_KEY, message);
  dispatch(clearCredentials());
  dispatch(baseApi.util.resetApiState());
  toast.error(message);
  if (window.location.pathname !== "/login") {
    window.location.href = `/login?${BLOCKED_ACCOUNT_QUERY_PARAM}=1`;
  }
}
