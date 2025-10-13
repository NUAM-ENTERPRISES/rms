import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/app/hooks";
import { useAppDispatch } from "@/app/hooks";
import { notificationsApi } from "@/features/notifications/data";
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
      console.log("Connected to notifications socket");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from notifications socket");
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
