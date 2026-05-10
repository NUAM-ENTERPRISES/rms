import { useEffect, useRef } from "react";
import { usePingCurrentSessionActivityMutation } from "@/features/admin/api";

const IDLE_THRESHOLD_MS = 15 * 60 * 1000;
/** Throttled to 5 minutes — significantly reduces DB writes vs. the previous 2-minute interval */
const ACTIVITY_PING_INTERVAL_MS = 5 * 60 * 1000;
const HEARTBEAT_CHECK_MS = 60 * 1000;

const BROADCAST_CHANNEL_NAME = "session-activity-leader";

/**
 * Elect a "leader" tab using BroadcastChannel so only ONE tab sends heartbeat pings.
 * All other tabs broadcast their activity to the leader tab which aggregates and pings.
 * Falls back to independent pinging when BroadcastChannel is not supported.
 */
function useLeaderElection(
  onLeaderChange: (isLeader: boolean) => void,
  onRemoteActivity: () => void,
) {
  const tabId = useRef(`tab-${Math.random().toString(36).slice(2)}`);
  const isLeaderRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const leaderHeartbeatRef = useRef<number | null>(null);
  const leaderTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      // Fallback: every tab acts as leader
      isLeaderRef.current = true;
      onLeaderChange(true);
      return;
    }

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    const claimLeadership = () => {
      isLeaderRef.current = true;
      onLeaderChange(true);
      // Broadcast leadership so other tabs yield
      channel.postMessage({ type: "leader", tabId: tabId.current });
    };

    const releaseLeadership = () => {
      if (isLeaderRef.current) {
        isLeaderRef.current = false;
        onLeaderChange(false);
        channel.postMessage({ type: "leader_resigned", tabId: tabId.current });
      }
    };

    channel.onmessage = (e: MessageEvent) => {
      const { type, tabId: senderTabId } = e.data ?? {};
      if (type === "leader" && senderTabId !== tabId.current) {
        // Another tab claimed leadership — yield
        if (isLeaderRef.current) {
          isLeaderRef.current = false;
          onLeaderChange(false);
        }
        // Reset timeout: leader is alive
        if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current);
        leaderTimeoutRef.current = window.setTimeout(claimLeadership, HEARTBEAT_CHECK_MS * 2);
      }
      if (type === "activity" && isLeaderRef.current) {
        // Follower tab had activity — leader records it
        onRemoteActivity();
      }
      if (type === "leader_resigned") {
        // Previous leader resigned — try to claim leadership
        if (!isLeaderRef.current) claimLeadership();
      }
    };

    // Broadcast a "ping" and wait briefly to see if a leader responds
    channel.postMessage({ type: "who_is_leader", tabId: tabId.current });
    leaderTimeoutRef.current = window.setTimeout(claimLeadership, 300);

    // Broadcast that we're leader every HEARTBEAT_CHECK_MS to keep follower timeouts alive
    leaderHeartbeatRef.current = window.setInterval(() => {
      if (isLeaderRef.current) {
        channel.postMessage({ type: "leader", tabId: tabId.current });
      }
    }, HEARTBEAT_CHECK_MS);

    return () => {
      releaseLeadership();
      channel.close();
      if (leaderHeartbeatRef.current) clearInterval(leaderHeartbeatRef.current);
      if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const broadcastActivity = () => {
    channelRef.current?.postMessage({ type: "activity", tabId: tabId.current });
  };

  return { isLeaderRef, broadcastActivity };
}

export function useSessionActivityTracker(enabled: boolean) {
  const [pingCurrentSessionActivity] = usePingCurrentSessionActivityMutation();
  const lastPingRef = useRef<number>(0);
  const isPingingRef = useRef(false);
  const lastActivityAtRef = useRef<number>(Date.now());
  const isLeaderRef = useRef(true); // true until leader election concludes
  const setIsLeader = (v: boolean) => { isLeaderRef.current = v; };

  const { broadcastActivity } = useLeaderElection(setIsLeader, () => {
    // Remote tab had activity — update our timestamp so the heartbeat sends a ping
    lastActivityAtRef.current = Date.now();
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const sendPing = async (force: boolean = false) => {
      // Only the leader tab sends pings to avoid duplicate DB writes
      if (!isLeaderRef.current) return;
      if (isPingingRef.current) return;

      const now = Date.now();
      const shouldPing =
        force || now - lastPingRef.current >= ACTIVITY_PING_INTERVAL_MS;
      if (!shouldPing) return;

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
      // If we're not the leader, broadcast so the leader can decide to ping
      if (!isLeaderRef.current) {
        broadcastActivity();
        return;
      }
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
  }, [enabled, pingCurrentSessionActivity, broadcastActivity]);
}
