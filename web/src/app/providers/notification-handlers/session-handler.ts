import { baseApi } from "@/app/api/baseApi";
import { AppDispatch } from "@/app/store";

export interface SessionEventPayload {
  type:
    | "session_created"
    | "session_ended"
    | "availability_changed"
    | "sessions_cleaned"
    | "break_reset";
  userId?: string;
  sessionId?: string;
  availability?: string;
  count?: number;
}

/**
 * Invalidates the AdminSessions RTK tag when any session:updated event is received.
 * Debouncing is handled at the call site (notifications-socket.provider.tsx) so that
 * rapid bursts of events (e.g. login + availability change + logout) collapse into a
 * single API refetch.
 */
export const handleSessionUpdated = (
  payload: SessionEventPayload,
  dispatch: AppDispatch,
) => {
  dispatch(baseApi.util.invalidateTags(["AdminSessions"]));
};
