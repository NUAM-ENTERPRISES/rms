export const BLOCKED_ACCOUNT_MESSAGE =
  "Your account is blocked. Please contact admin.";

export const INACTIVE_ACCOUNT_MESSAGE =
  "Your account has been set to inactive. Please contact your administrator.";

export const ACTIVE_ACCOUNT_MESSAGE =
  "Your account has been reactivated. You have full access again.";

export const BLOCKED_ACCOUNT_SESSION_KEY = "rms:blocked-account-message";

export const BLOCKED_ACCOUNT_QUERY_PARAM = "accountBlocked";

export function isBlockedAccountMessage(message: string | undefined): boolean {
  if (!message) return false;
  return message.trim() === BLOCKED_ACCOUNT_MESSAGE;
}

/** Normalize NestJS error payloads (`message` string or string[]). */
export function extractApiErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const message = (data as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") {
    return message[0];
  }
  return undefined;
}
