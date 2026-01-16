import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/app/hooks";
import { useAppDispatch } from "@/app/hooks";
import { notificationsApi } from "@/features/notifications/data";
import { documentsApi } from "@/features/documents/api";
import { hrdRemindersApi } from "@/services/hrdRemindersApi";
import { rnrRemindersApi } from "@/services/rnrRemindersApi";
import { toast } from "sonner";

interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export default function NotificationsSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const { accessToken, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!accessToken || !user) {
      // Disconnect if no auth
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to WebSocket
    const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:3000", {
      auth: {
        token: accessToken,
      },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // Handle connection
    socket.on("connect", () => {
      console.log("Connected to notifications socket", { socketId: socket.id, user: user?.id });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from notifications socket", { socketId: socket.id, user: user?.id });
    });

    // Handle new notifications
    socket.on("notification:new", (notification: NotificationEvent) => {
      console.log("New notification received:", notification);

      // Show toast
      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? {
              label: "Open",
              onClick: () => {
                // Navigate to link if provided
                window.location.href = notification.link!;
              },
            }
          : undefined,
      });

      // Optimistically update cache
      dispatch(
        notificationsApi.util.updateQueryData(
          "getBadge",
          undefined,
          (draft) => {
            draft.data.unread += 1;
          }
        )
      );

      // Add to notifications list cache
      dispatch(
        notificationsApi.util.updateQueryData(
          "listNotifications",
          {},
          (draft) => {
            const newNotification = {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              link: notification.link || null,
              meta: notification.meta || null,
              status: "unread" as const,
              readAt: null,
              createdAt: notification.createdAt,
              updatedAt: notification.createdAt,
            };

            // Add to beginning of list
            draft.data.notifications.unshift(newNotification);

            // Update pagination
            draft.data.pagination.total += 1;
          }
        )
      );

      // If notification relates to documents or verification, invalidate doc verification cache
      // The notification.meta may contain context such as candidateProjectMapId or a type like 'document:verified'
      const typeLower = notification.type?.toLowerCase?.() || "";
      const meta = notification.meta as Record<string, any> | undefined;

      // Always try to refresh verification candidates when any notification arrives.
      // This is defensive: server notifications may be inconsistent in `type`/`meta` naming
      // and it's better for the UI to be updated than to miss an important verification change.
      if (true) {
        // Invalidate the verification candidates query so the list refetches in real-time
        try {
          console.debug("Invalidating VerificationCandidates due to notification", notification.id, notification.type, meta);
          // Invalidate tag so active queries refetch
          dispatch(documentsApi.util.invalidateTags([{ type: "VerificationCandidates" }]));

          // As an extra defensive measure, trigger an explicit refetch for the common default args
          // used by the Document Verification page (page:1, limit:50). This ensures the UI refreshes
          // even if the query key/args differ slightly or invalidation isn't picked up immediately.
          dispatch(
            documentsApi.endpoints.getVerificationCandidates.initiate(
              { page: 1, limit: 50 },
              { forceRefetch: true }
            )
          );
        } catch (err) {
          console.warn("Failed to refresh VerificationCandidates cache:", err);
        }
      }
    });

    // Handle HRD reminder socket events (real-time)
    socket.on("hrdReminder.sent", (payload: any) => {
      try {
        // Log loudly so it's visible in browser console
        console.log("HRD reminder event received:", payload);

        // Normalize payload to include the actual reminder object if nested
        const normalized = payload?.payload || payload?.reminder || payload || {};

        // Show toast with Open action (navigates to route if provided)
        toast(payload?.title || normalized?.title || "HRD Reminder", {
          description: payload?.body || normalized?.body || payload?.message || "HRD action required",
          action: (payload?.route || normalized?.route)
            ? {
                label: "Open",
                onClick: () => {
                  window.location.href = payload?.route || normalized?.route!;
                },
              }
            : undefined,
        });

        // Only refetch HRD reminders for authenticated processing users
        const isProcessingUser = !!user && (
          Array.isArray(user.roles)
            ? user.roles.some((r: string) => r.toLowerCase().includes("processing"))
            : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("processing")
        );

        if (accessToken && isProcessingUser) {
          dispatch(hrdRemindersApi.endpoints.getHRDReminders.initiate(undefined, { forceRefetch: true }));
        }

        // Dispatch a window event so hooks/components can open modal immediately if desired
        try {
          // Add a show flag to ensure the hook will open modal for this event
          const detail = { ...normalized, type: payload?.type || 'hrdReminder.sent', show: true };
          console.log('Dispatching hrd:reminder with detail:', detail);
          window.dispatchEvent(new CustomEvent("hrd:reminder", { detail }));
        } catch (err) {
          console.error("Could not dispatch hrd:reminder event", err);
        }
      } catch (err) {
        console.warn("Failed to handle hrdReminder.sent event:", err);
      }
    });

    // Handle RNR reminder socket events (real-time)
    socket.on("rnrReminder.sent", (payload: any) => {
      try {
        console.log("RNR reminder event received:", payload);
        const normalized = payload?.payload || payload?.reminder || payload || {};

        toast(payload?.title || normalized?.title || "RNR Reminder", {
          description: payload?.body || normalized?.body || payload?.message || "RNR action required",
          action: (payload?.route || normalized?.route)
            ? {
                label: "Open",
                onClick: () => {
                  window.location.href = payload?.route || normalized?.route!;
                },
              }
            : undefined,
        });

        // Only refetch RNR reminders if current user is a recruiter and authenticated
        const isRecruiterUser = !!user && (
          Array.isArray(user.roles)
            ? user.roles.some((r: string) => r.toLowerCase().includes("recruiter"))
            : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("recruiter")
        );

        if (accessToken && isRecruiterUser) {
          dispatch(rnrRemindersApi.endpoints.getMyRNRReminders.initiate(undefined, { forceRefetch: true }) as any);
        }

        try {
          const detail = { ...normalized, type: payload?.type || 'rnrReminder.sent', show: true };
          console.log('Dispatching rnr:reminder with detail:', detail);
          window.dispatchEvent(new CustomEvent("rnr:reminder", { detail }));
        } catch (err) {
          console.error("Could not dispatch rnr:reminder event", err);
        }
      } catch (err) {
        console.warn("Failed to handle rnrReminder.sent event:", err);
      }
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Cleanup on unmount or auth change
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user, dispatch]);

  // Handle token refresh
  useEffect(() => {
    if (socketRef.current && accessToken) {
      socketRef.current.auth.token = accessToken;
      socketRef.current.disconnect().connect();
    }
  }, [accessToken]);

  return <>{children}</>;
}
