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
import { handleScreeningNotifications, handleScreeningSync } from "./notification-handlers/screening-handler";
import { handleInterviewNotifications } from "./notification-handlers/interview-handler";
import { handleCRENotifications, handleCRESync } from "./notification-handlers/cre-handler";
import { handleProcessingNotifications, handleProcessingSync } from "./notification-handlers/processing-handler";

const invalidateTags = baseApi.util.invalidateTags;

export default function NotificationsSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const muted = useAppSelector((state) => state.notificationSettings?.muted);

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
      socket.auth.token = token;
    }

    if (socket.io?.opts?.auth && typeof socket.io.opts.auth === "object") {
      socket.io.opts.auth.token = token;
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
    });

    socket.on("connect_error", async (error) => {
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message || error?.data?.message || "Unknown socket error";

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
      
      // Notify components to refresh data and open bell
      window.dispatchEvent(new CustomEvent("notifications:refresh"));
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

      // Dispatch a specific event for RNR reminders so the RNR modal opens immediately
      if (notification.type === "RNR_REMINDER") {
        window.dispatchEvent(new CustomEvent("rnr:reminder", {
          detail: { reminder: { ...notification, candidate: notification.meta?.candidate } , show: true }
        }));
      }

      // Only show toast if it's NOT a verification notification (which triggers the bell animation)
      if (notification.type !== "candidate_sent_for_verification") {
        toast(notification.title || "New Notification", {
          description: notification.message || ""
        });
      }
      
      const context = { notification, dispatch, invalidateTags };
      
      // Handle domain-specific notifications
      handleScreeningNotifications(context);
      handleDocumentNotifications(context);
      handleInterviewNotifications(context);
      handleCRENotifications(context);
      handleProcessingNotifications(context);
    });

    socket.on("data:sync", (payload: any) => {
      console.log("[Socket] Sync Received:", payload);
      
      const context = { dispatch, invalidateTags };
      
      if (handleScreeningSync(payload, context)) return;
      if (handleDocumentSync(payload, context)) return;
      if (handleCRESync(payload, context)) return;
      if (handleProcessingSync(payload, context)) return;
      
      if (payload.type) {
        dispatch(baseApi.util.invalidateTags([{ type: payload.type, id: "LIST" }]));
      }
      if (payload.message) toast.info(payload.message);
    });

    // Handle domain-specific direct socket events
    registerDocumentSocketEvents(socket, { dispatch, invalidateTags });

    socket.on("INTERVIEW_STATS_UPDATE", (payload: any) => {
      console.log("[Socket] Interview stats update received:", payload);
      dispatch(baseApi.util.invalidateTags([{ type: "Interview", id: "LIST" }]));
    });

    return () => {
      console.log("[Socket] Cleaning up...");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user, dispatch]);

  return <>{children}</>;
}
