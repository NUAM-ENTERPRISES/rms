import { useEffect, useRef } from "react";
import { usePingCurrentSessionActivityMutation } from "@/features/admin/api";

const IDLE_THRESHOLD_MS = 15 * 60 * 1000;
const ACTIVITY_PING_INTERVAL_MS = 2 * 60 * 1000;
const HEARTBEAT_CHECK_MS = 60 * 1000;

export function useSessionActivityTracker(enabled: boolean) {
  const [pingCurrentSessionActivity] = usePingCurrentSessionActivityMutation();
  const lastPingRef = useRef<number>(0);
  const isPingingRef = useRef(false);
  const lastActivityAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const sendPing = async (force: boolean = false) => {
      if (isPingingRef.current) {
        return;
      }

      const now = Date.now();
      const shouldPing =
        force || now - lastPingRef.current >= ACTIVITY_PING_INTERVAL_MS;
      if (!shouldPing) {
        return;
      }

      isPingingRef.current = true;
      try {
        await pingCurrentSessionActivity().unwrap();
        lastPingRef.current = Date.now();
      } catch (error) {
        // Swallow failures - session tracking should not block app behavior.
        console.warn("Session activity ping failed", error);
      } finally {
        isPingingRef.current = false;
      }
    };

    const recordActivity = () => {
      const previousActivity = lastActivityAtRef.current;
      lastActivityAtRef.current = Date.now();
      const wasIdle = Date.now() - previousActivity > IDLE_THRESHOLD_MS;
      void sendPing(wasIdle);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        recordActivity();
      }
    };

    const handleWindowFocus = () => {
      recordActivity();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    const heartbeat = window.setInterval(() => {
      const now = Date.now();
      const hasRecentActivity = now - lastActivityAtRef.current < IDLE_THRESHOLD_MS;
      if (hasRecentActivity) {
        void sendPing();
      }
    }, HEARTBEAT_CHECK_MS);

    // Immediately register the session as active at mount
    recordActivity();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.clearInterval(heartbeat);
    };
  }, [enabled, pingCurrentSessionActivity]);
}
