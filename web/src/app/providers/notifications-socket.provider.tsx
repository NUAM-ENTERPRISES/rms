import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { baseApi } from "@/app/api/baseApi";
import { notificationsApi } from "@/features/notifications/data/notifications.endpoints";
import { setMuted } from "@/features/notifications/notificationSettingsSlice";
import { toast } from "sonner";

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
        const sentCandidateId = notification.data?.candidateId || notification.candidateId;
        const tags: Array<any> = [
          { type: "VerificationCandidates" },
          { type: "DocumentStats" },
        ];
        if (sentCandidateId) {
          tags.push({ type: "DocumentVerification", id: sentCandidateId });
        } else {
          tags.push({ type: "DocumentVerification" });
        }
        dispatch(baseApi.util.invalidateTags(tags));
      }

      // when a document is verified/rejected/resubmission or a generic update comes through,
      // trigger the same set of invalidations so that any open verification
      // pages refresh automatically. many notifications carry candidateId in
      // `notification.data` but fall back to `notification.candidateId`.
      if (
        notification.type === "candidate_document_updated" ||
        notification.type === "document_verified" ||
        notification.type === "document_rejected" ||
        notification.type === "document_resubmission_requested" ||
        notification.type === "document_resubmitted" ||
        notification.type === "documentation_notification" ||
        notification.type === "recruiter_notification"
      ) {
        console.log("[Socket] document update notification, invalidating caches", notification);
        const candidateId =
          notification.data?.candidateId || notification.candidateId || notification.meta?.candidateId || undefined;
        const tags: Array<any> = [
          { type: "VerificationCandidates" },
          { type: "DocumentStats" },
        ];
        if (candidateId) {
          tags.push({ type: "DocumentVerification", id: candidateId });
        } else {
          tags.push({ type: "DocumentVerification" });
        }
        tags.push({ type: "RecruiterDocuments" });
        dispatch(baseApi.util.invalidateTags(tags));
      }
    });

    socket.on("data:sync", (payload: any) => {
      console.log("[Socket] Sync Received:", payload);
      if (payload.type === "Screening") {
        dispatch(baseApi.util.invalidateTags([
          { type: "Screening", id: "LIST" },
          { type: "Candidate", id: "LIST" }
        ]));
      } else if (payload.type === "RecruiterDocuments") {
        dispatch(baseApi.util.invalidateTags([{ type: "RecruiterDocuments" }]));
      } else if (payload.type) {
        dispatch(baseApi.util.invalidateTags([{ type: payload.type, id: "LIST" }]));
      }
      if (payload.message) toast.info(payload.message);
    });

    // direct socket events that bypass notification wrapping
    socket.on("candidate_document_updated", (data: { candidateId?: string }) => {
      console.log("[Socket] direct event candidate_document_updated", data);
      const tags: Array<any> = [
        { type: "VerificationCandidates" },
        { type: "DocumentStats" },
        { type: "RecruiterDocuments" },
      ];
      if (data.candidateId) {
        tags.push({ type: "DocumentVerification", id: data.candidateId });
      } else {
        tags.push({ type: "DocumentVerification" });
      }
      dispatch(baseApi.util.invalidateTags(tags));
    });

    socket.on("document_verified", (data: { candidateId?: string }) => {
      console.log("[Socket] direct event document_verified", data);
      const tags: Array<any> = [
        { type: "VerificationCandidates" },
        { type: "DocumentStats" },
        { type: "RecruiterDocuments" },
      ];
      if (data.candidateId) {
        tags.push({ type: "DocumentVerification", id: data.candidateId });
      } else {
        tags.push({ type: "DocumentVerification" });
      }
      dispatch(baseApi.util.invalidateTags(tags));
    });

    socket.on("document_rejected", (data: { candidateId?: string }) => {
      console.log("[Socket] direct event document_rejected", data);
      const tags: Array<any> = [
        { type: "VerificationCandidates" },
        { type: "DocumentStats" },
        { type: "RecruiterDocuments" },
      ];
      if (data.candidateId) {
        tags.push({ type: "DocumentVerification", id: data.candidateId });
      } else {
        tags.push({ type: "DocumentVerification" });
      }
      dispatch(baseApi.util.invalidateTags(tags));
    });

    socket.on("document_resubmission_requested", (data: { candidateId?: string }) => {
      console.log("[Socket] direct event document_resubmission_requested", data);
      const tags: Array<any> = [
        { type: "VerificationCandidates" },
        { type: "DocumentStats" },
        { type: "RecruiterDocuments" },
      ];
      if (data.candidateId) {
        tags.push({ type: "DocumentVerification", id: data.candidateId });
      } else {
        tags.push({ type: "DocumentVerification" });
      }
      dispatch(baseApi.util.invalidateTags(tags));
    });

    socket.on("document_resubmitted", (data: { candidateId?: string }) => {
      console.log("[Socket] direct event document_resubmitted", data);
      const tags: Array<any> = [
        { type: "VerificationCandidates" },
        { type: "DocumentStats" },
        { type: "RecruiterDocuments" },
      ];
      if (data.candidateId) {
        tags.push({ type: "DocumentVerification", id: data.candidateId });
      } else {
        tags.push({ type: "DocumentVerification" });
      }
      dispatch(baseApi.util.invalidateTags(tags));
    });

    return () => {
      console.log("[Socket] Cleaning up...");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user, dispatch]);

  return <>{children}</>;
}
