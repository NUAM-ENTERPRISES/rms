import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { baseApi } from "@/app/api/baseApi";
import { toast } from "sonner";

export default function NotificationsSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const muted = useAppSelector((state) => state.notificationSettings?.muted);
  const mutedRef = useRef<boolean>(muted);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    if (!accessToken || !user) {
      if (socketRef.current) {
        console.log("[Socket] No token, disconnecting...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current?.connected) return;

    // Using port 3000 as indicated by the active process check
    const baseUrl = (import.meta.env.VITE_WS_URL || "http://localhost:3000").replace(/\/$/, "");
    const socketUrl = `${baseUrl}/notifications`;
    
    console.log("[Socket] Connecting to:", socketUrl);

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      query: { token: accessToken },
      extraHeaders: {
        Authorization: `Bearer ${accessToken}`
      },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: true
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] CONNECTED SUCCESS (Port 3000):", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] CONNECTION ERROR:", error.message);
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
        audioRef.current?.play().catch((err) => {
          // catch autoplay restrictions
          console.warn("Notification sound play failed", err);
        });
      }

      // Only show toast if it's NOT a verification notification (which triggers the bell animation)
      if (notification.type !== "candidate_sent_for_verification") {
        toast(notification.title || "New Notification", {
          description: notification.message || ""
        });
      }
      
      if (notification.type === "candidate_sent_to_screening") {
        console.log("[Socket] Invalidating Screening & Candidate lists");
        dispatch(baseApi.util.invalidateTags([
          { type: "Screening", id: "LIST" },
          { type: "Candidate", id: "LIST" }
        ]));
      }

      if (notification.type === "candidate_sent_for_verification") {
        console.log("[Socket] Invalidating VerificationCandidates & DocumentVerification lists");
        dispatch(baseApi.util.invalidateTags([
          { type: "VerificationCandidates" },
          { type: "DocumentVerification" },
          { type: "DocumentStats" }
        ]));
      }
    });

    socket.on("data:sync", (payload: any) => {
      console.log("[Socket] Sync Received:", payload);
      if (payload.type === "Screening") {
        dispatch(baseApi.util.invalidateTags([
          { type: "Screening", id: "LIST" },
          { type: "Candidate", id: "LIST" }
        ]));
      } else if (payload.type) {
        dispatch(baseApi.util.invalidateTags([{ type: payload.type, id: "LIST" }]));
      }
      if (payload.message) toast.info(payload.message);
    });

    return () => {
      console.log("[Socket] Cleaning up...");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user, dispatch]);

  return <>{children}</>;
}
