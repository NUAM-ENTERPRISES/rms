import { useCallback, useEffect, useState } from "react";

const storageKey = (userId: string) =>
  `rms:idleSessionsDismissed:${userId}`;

function loadSet(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistSet(userId: string, next: Set<string>) {
  localStorage.setItem(storageKey(userId), JSON.stringify([...next]));
}

/**
 * Tracks which idle session rows the current user dismissed ("mark as read").
 * Call {@link syncPrune} after each successful fetch with current session ids
 * so dismissed entries for sessions that are no longer idle are removed.
 */
export function useIdleSessionsDismissed(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setDismissed(new Set());
      return;
    }
    setDismissed(loadSet(userId));
  }, [userId]);

  const syncPrune = useCallback(
    (activeSessionIds: string[]) => {
      if (!userId) return;
      setDismissed((prev) => {
        const next = new Set(
          [...prev].filter((id) => activeSessionIds.includes(id))
        );
        if (next.size !== prev.size) {
          persistSet(userId, next);
        }
        return next;
      });
    },
    [userId]
  );

  const dismissOne = useCallback(
    (sessionId: string) => {
      if (!userId) return;
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(sessionId);
        persistSet(userId, next);
        return next;
      });
    },
    [userId]
  );

  const dismissAll = useCallback(
    (sessionIds: string[]) => {
      if (!userId || sessionIds.length === 0) return;
      setDismissed((prev) => {
        const next = new Set(prev);
        sessionIds.forEach((id) => next.add(id));
        persistSet(userId, next);
        return next;
      });
    },
    [userId]
  );

  const visibleSessions = useCallback(
    <T extends { id: string }>(sessions: T[]) =>
      sessions.filter((s) => !dismissed.has(s.id)),
    [dismissed]
  );

  return { dismissOne, dismissAll, visibleSessions, syncPrune };
}
