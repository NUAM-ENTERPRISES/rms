import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { baseApi } from "@/app/api/baseApi";
import { authApi } from "@/services/authApi";
import { notificationsApi } from "@/features/notifications/data/notifications.endpoints";
import { setMuted } from "@/features/notifications/notificationSettingsSlice";
import { setCredentials, clearCredentials } from "@/features/auth/authSlice";
import { toast } from "sonner";
import { handleDocumentNotifications, registerDocumentSocketEvents, handleDocumentSync } from "./notification-handlers/document-handler";
import { handleIntroductionVideoNotifications, registerIntroductionVideoSocketEvents } from "./notification-handlers/introduction-video-handler";
import { handleScreeningNotifications, handleScreeningSync } from "./notification-handlers/screening-handler";
import { handleInterviewNotifications } from "./notification-handlers/interview-handler";
import { handleOperationsNotifications, handleOperationsSync } from "./notification-handlers/operations-handler";
import { handleProcessingNotifications, handleProcessingSync } from "./notification-handlers/processing-handler";
import { handleSessionUpdated, type SessionEventPayload } from "./notification-handlers/session-handler";
import {
  handleAccountBlocked,
  type AccountBlockedPayload,
} from "./notification-handlers/account-blocked-handler";
import {
  handleAccountStatusChanged,
  handleAccountStatusNotifications,
  type AccountStatusChangedPayload,
} from "./notification-handlers/account-status-handler";
import { handleAgentCandidateRequestNotifications } from "./notification-handlers/agent-candidate-request-handler";
import {
  handleOfferLetterNotifications,
  handleOfferLetterSync,
} from "./notification-handlers/offer-letter-handler";

const invalidateTags = baseApi.util.invalidateTags;

export default function NotificationsSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const muted = useAppSelector((state) => state.notificationSettings?.muted);
  // Debounce timer for session:updated events — collapses rapid bursts into one refetch
  const sessionInvalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep slice in sync with server setting on login
  const { data: settings } = notificationsApi.useGetSettingsQuery(undefined, {
    skip: !accessToken || process.env.NODE_ENV === 'test',
  });
  useEffect(() => {
    if (settings?.data) {
      dispatch(setMuted(settings.data.muted));
    }
  }, [settings, dispatch]);
  const mutedRef = useRef<boolean>(muted);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const refreshInProgressRef = useRef(false);

  const updateSocketAuthToken = (token: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    if (socket.auth && typeof socket.auth === "object") {
      (socket.auth as any).token = token;
    }

    if (socket.io?.opts && "auth" in socket.io.opts) {
      (socket.io.opts as any).auth.token = token;
    }
  };

  // keep ref up to date without restarting socket listener
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/notification.mp3");
      audioRef.current.preload = "auto";
      audioRef.current.volume = 0.5;
    }
  }, []);

  // unlock audio on user interaction to bypass browser autoplay restrictions
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current && !unlockedRef.current && !mutedRef.current) {
        audioRef.current.play()
          .then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
            unlockedRef.current = true;
            console.log('[Socket] Audio unlocked by user interaction');
          })
          .catch((err) => {
            console.warn('[Socket] Audio unlock attempt failed', err);
          });
      }
    };

    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, []);

  useEffect(() => {
    if (!accessToken || !user) {
      if (socketRef.current) {
        console.log("[Socket] No token, disconnecting...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    updateSocketAuthToken(accessToken);

    if (socketRef.current?.connected) return;

    // Determine the base WebSocket URL based on environment and current location
    const WS_BASE_URL =
      import.meta.env.VITE_WS_URL ||
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : window.location.origin);

    const baseUrl = WS_BASE_URL.replace(/\/$/, "");
    const socketUrl = `${baseUrl}/notifications`;
    
    console.log("[Socket] Connecting to:", socketUrl);

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"], // Use websocket first, then poll for compatibility
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] CONNECTED SUCCESS (Port 3000):", socket.id);
      
      // Force refresh on initial connection or reconnection to sync state from database
      window.dispatchEvent(new CustomEvent("notifications:refresh"));

      // Trigger global data refresh on login/reconnect
      dispatch(baseApi.util.invalidateTags([
        "Candidate",
        "Project",
        "DocumentVerification",
        "VerificationCandidates",
        "RecruiterAssignment",
        "Processing",
        "Screening"
      ]));
    });

    socket.on("connect_error", async (error) => {
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message || (error as any)?.data?.message || "Unknown socket error";

      console.error("[Socket] CONNECTION ERROR:", errorMessage);

      if (errorMessage.includes("jwt expired") && !refreshInProgressRef.current) {
        refreshInProgressRef.current = true;
        try {
          console.log("[Socket] Access token expired, refreshing before reconnect...");
          const refreshResponse = await dispatch(
            authApi.endpoints.refresh.initiate()
          ).unwrap();

          const newAccessToken = refreshResponse.data.accessToken;
          const newRefreshToken = refreshResponse.data.refreshToken;
          const newUser = refreshResponse.data.user;

          if (newAccessToken && newUser) {
            dispatch(
              setCredentials({
                user: newUser,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              })
            );

            updateSocketAuthToken(newAccessToken);
            socket.connect();
            console.log("[Socket] Reconnected with refreshed token");
            return;
          }
        } catch (refreshError) {
          console.error(
            "[Socket] Token refresh failed during reconnect:",
            refreshError,
          );
        } finally {
          refreshInProgressRef.current = false;
        }

        dispatch(clearCredentials());
        socket.disconnect();
        socketRef.current = null;
      }
    });

    socket.on("reconnect_attempt", (attempt) => {
      updateSocketAuthToken(accessToken);
      console.log(`[Socket] RECONNECT ATTEMPT ${attempt}`);
    });

    socket.on("reconnect_error", (error) => {
      console.warn("[Socket] RECONNECT ERROR:", error?.message || error);
    });

    socket.on("reconnect_failed", () => {
      console.error("[Socket] RECONNECT FAILED, connection is down");
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket] DISCONNECTED:", reason);
    });

    socket.on("notification:new", (notification: any) => {
      console.log("[Socket] Notif Received:", notification);
      
      const isProcessingReminder = 
        notification.type === "processing.reminder" || 
        notification.type?.endsWith("_REMINDER") ||
        notification.isSilent;

      // Notify components to refresh data
      window.dispatchEvent(new CustomEvent("notifications:refresh"));
      
      // Only open bell and invalidate badge if it's NOT a silent processing reminder
      if (!isProcessingReminder) {
        window.dispatchEvent(new CustomEvent("notifications:open"));
        
        dispatch(baseApi.util.invalidateTags([
          { type: "NotificationBadge" },
          { type: "Notification", id: "LIST" }
        ]));

        // play sound if not muted and this is a new notification
        if (!mutedRef.current) {
          if (audioRef.current) {
            audioRef.current.play()
              .then(() => {
                unlockedRef.current = true;
              })
              .catch((err) => {
                // If failed, try to unlock it now by force on the next user interaction
                console.warn("Notification sound play failed, browser blocked it", err);
              });
          }
        }
      }

      // Dispatch a specific event for RNR reminders so the RNR modal opens immediately
      if (notification.type === "RNR_REMINDER") {
        window.dispatchEvent(new CustomEvent("rnr:reminder", {
          detail: { reminder: { ...notification, candidate: notification.meta?.candidate } , show: true }
        }));
      }

      if (notification.type === "CALLBACK_REMINDER") {
        const meta = notification.meta ?? {};
        const metaCandidate = meta.candidate as Record<string, unknown> | undefined;
        const nameParts = String(meta.candidateName ?? "").trim().split(/\s+/);

        dispatch(
          baseApi.util.invalidateTags(["CallbackReminder", "Notification"]),
        );

        window.dispatchEvent(
          new CustomEvent("callback:reminder", {
            detail: {
              show: true,
              reminder: {
                id: meta.reminderId ?? notification.id,
                candidateId: meta.candidateId,
                statusHistoryId: meta.statusHistoryId,
                scheduledFor: meta.scheduledFor,
                sentAt: notification.createdAt,
                status: "sent",
                createdAt: notification.createdAt,
                updatedAt: notification.createdAt,
                statusHistory: meta.statusHistory ?? {
                  statusUpdatedAt: meta.scheduledFor,
                  reason:
                    (meta.statusHistory as { reason?: string } | undefined)
                      ?.reason ??
                    (typeof meta.reason === "string" ? meta.reason : undefined),
                },
                candidate: metaCandidate
                  ? {
                      id: metaCandidate.id ?? meta.candidateId,
                      firstName: metaCandidate.firstName,
                      lastName: metaCandidate.lastName,
                      countryCode: metaCandidate.countryCode ?? meta.countryCode,
                      mobileNumber:
                        metaCandidate.mobileNumber ?? meta.mobileNumber,
                      currentStatus: metaCandidate.currentStatus,
                    }
                  : {
                      id: meta.candidateId,
                      firstName: nameParts[0] ?? "",
                      lastName: nameParts.slice(1).join(" ") ?? "",
                      countryCode: meta.countryCode,
                      mobileNumber: meta.mobileNumber,
                    },
              },
            },
          }),
        );
      }

      // Dispatch a specific event for processing reminders so the processing followup modal opens
      if (notification.type === "processing.reminder" || isProcessingReminder) {
        window.dispatchEvent(new CustomEvent("processing:reminder", {
          detail: { reminder: notification.payload || notification, show: true }
        }));
      }

      // Only show toast if it's NOT a verification notification (which triggers the bell animation)
      if (
        notification.type !== "candidate_sent_for_verification" &&
        notification.type !== "processing.reminder" &&
        notification.type !== "account_status_changed" &&
        !notification.type?.endsWith("_REMINDER")
      ) {
        toast(notification.title || "New Notification", {
          description: notification.message || ""
        });
      }
      
      const context = { notification, dispatch, invalidateTags };
      
      // Handle domain-specific notifications
      handleScreeningNotifications(context);
      handleDocumentNotifications(context);
      handleIntroductionVideoNotifications(context);
      handleInterviewNotifications(context);
      handleOperationsNotifications(context);
      handleProcessingNotifications(context);
      handleAccountStatusNotifications(context);
      handleAgentCandidateRequestNotifications(context);
      handleOfferLetterNotifications(context);
    });

    socket.on("data:sync", (payload: any) => {
      console.log("[Socket] Sync Received:", payload);
      
      const context = { dispatch, invalidateTags };
      
      if (handleScreeningSync(payload, context)) return;
      if (handleDocumentSync(payload, context)) return;
      if (handleOperationsSync(payload, context)) return;
      if (handleOfferLetterSync(payload, context)) return;
      if (handleProcessingSync(payload, context)) return;

      if (payload.type) {
        dispatch(baseApi.util.invalidateTags([{ type: payload.type, id: "LIST" }]));
      }
      if (payload.message) toast.info(payload.message);
    });

    // Handle domain-specific direct socket events
    registerDocumentSocketEvents(socket, { dispatch, invalidateTags });
    registerIntroductionVideoSocketEvents(socket, { dispatch, invalidateTags });

    socket.on("INTERVIEW_STATS_UPDATE", (payload: any) => {
      console.log("[Socket] Interview stats update received:", payload);
      dispatch(baseApi.util.invalidateTags([{ type: "Interview", id: "LIST" }]));
    });

    socket.on("account:blocked", (payload: AccountBlockedPayload) => {
      handleAccountBlocked(payload, dispatch);
    });

    socket.on("account:status-changed", (payload: AccountStatusChangedPayload) => {
      handleAccountStatusChanged(payload, dispatch);
      if (payload.message) {
        const isInactive = payload.accountStatus === "INACTIVE";
        if (isInactive) {
          toast.warning(payload.message);
        } else {
          toast.success(payload.message);
        }
      }
    });

    // Session monitoring — debounced to prevent refetch storms on rapid events
    socket.on("session:updated", (payload: SessionEventPayload) => {
      if (sessionInvalidateTimerRef.current) {
        clearTimeout(sessionInvalidateTimerRef.current);
      }
      sessionInvalidateTimerRef.current = setTimeout(() => {
        handleSessionUpdated(payload, dispatch);
        sessionInvalidateTimerRef.current = null;
      }, 400);
    });

    return () => {
      console.log("[Socket] Cleaning up...");
      if (sessionInvalidateTimerRef.current) {
        clearTimeout(sessionInvalidateTimerRef.current);
        sessionInvalidateTimerRef.current = null;
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user, dispatch]);

  return <>{children}</>;
}
