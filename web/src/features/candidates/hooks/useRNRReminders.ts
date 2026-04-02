import { useState, useEffect, useRef } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useAppSelector } from "@/app/hooks";
import { useHasRole } from "@/hooks/useCan";
import { useGetMyRNRRemindersQuery } from "@/services/rnrRemindersApi";
import type { RNRReminder } from "@/services/rnrRemindersApi";

const SHOWN_REMINDERS_KEY = "rnr_shown_reminders";

// Store both reminder ID and count to track which attempts have been shown
interface ShownReminder {
  id: string;
  count: number;
}

// Load shown reminders from localStorage
const loadShownReminders = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(SHOWN_REMINDERS_KEY);
    if (stored) {
      const items: ShownReminder[] = JSON.parse(stored);
      return new Map(items.map(item => [item.id, item.count]));
    }
  } catch (error) {
    console.error("Failed to load shown reminders:", error);
  }
  return new Map();
};

// Save shown reminders to localStorage
const saveShownReminders = (reminders: Map<string, number>) => {
  try {
    const items: ShownReminder[] = Array.from(reminders.entries()).map(
      ([id, count]) => ({ id, count })
    );
    localStorage.setItem(SHOWN_REMINDERS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save shown reminders:", error);
  }
};

/**
 * Hook to manage RNR (Ring Not Response) reminders
 * Polls for pending reminders and provides modal state management
 */
export function useRNRReminders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<RNRReminder | null>(
    null
  );
  const [shownReminderIds, setShownReminderIds] = useState<Map<string, number>>(
    loadShownReminders
  );
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const hasCheckedInitialRef = useRef(false);

  const { accessToken, user } = useAppSelector((s) => s.auth);
  const isRecruiterUser = useHasRole("recruiter") || (!!user && (
    Array.isArray(user.roles)
      ? user.roles.some((r: string) => r.toLowerCase().includes("recruiter"))
      : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("recruiter")
  ));

  // Socket-first operation, no periodic polling. Skip if not logged in or not recruiter.
  const queryArg = accessToken && isRecruiterUser ? {} : skipToken;
  const { data: remindersData, isLoading, refetch } = useGetMyRNRRemindersQuery(queryArg as any, {
    pollingInterval: 0, // disable auto polling for event-driven flow
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    refetchOnFocus: false,
  });

  // Fetch once on mount and on visibility change (only if query active)
  useEffect(() => {
    if (accessToken && isRecruiterUser && typeof refetch === "function") {
      refetch().catch(() => {});
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && accessToken && isRecruiterUser && typeof refetch === "function") {
        refetch().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch, accessToken, isRecruiterUser]);

  const reminders = remindersData?.data || [];
  
  // Show ALL reminders with dailyCount > 0 (which means they have been sent at least once)
  const activeReminders = reminders.filter((r) => {
    const hasDailyCount = r.dailyCount && r.dailyCount > 0;
    const wasSent = !!r.sentAt;
    return hasDailyCount || wasSent;
  });
  
  // Clean up shown reminders that are no longer active
  useEffect(() => {
    const reminderIds = new Set(activeReminders.map((r) => r.id));
    const cleanedShownIds = new Map(
      Array.from(shownReminderIds.entries()).filter(([id]) => reminderIds.has(id))
    );
    
    if (cleanedShownIds.size !== shownReminderIds.size) {
      setShownReminderIds(cleanedShownIds);
      saveShownReminders(cleanedShownIds);
    }
  }, [activeReminders.length]);

  useEffect(() => {
    // Don't check if we don't have data
    if (!remindersData) return;

    // On initial load, don't show modal for already-shown reminders
    if (!hasCheckedInitialRef.current) {
      hasCheckedInitialRef.current = true;
      // Just check if there are any new reminders, don't show immediately
      return;
    }

    // Only check for new reminders when modal is closed
    if (isModalOpen) return;

    // Find first active reminder that hasn't been shown at this count yet
    const newReminder = activeReminders.find((r) => {
      const shownCount = shownReminderIds.get(r.id);
      // Show if never shown, or if reminderCount has increased
      return shownCount === undefined || r.reminderCount > shownCount;
    });

    if (newReminder) {
      console.log(`[RNR] Showing reminder for candidate ${newReminder.candidateId}, count: ${newReminder.reminderCount}`);
      setCurrentReminder(newReminder);
      setIsModalOpen(true);
      // Mark as shown with current count
      setShownReminderIds((prev) => {
        const updated = new Map(prev);
        updated.set(newReminder.id, newReminder.reminderCount);
        saveShownReminders(updated);
        return updated;
      });
    }
  }, [activeReminders.map(r => `${r.id}:${r.reminderCount}`).join(','), isModalOpen, remindersData]);

  // Real-time support: open modal immediately when a socket event is dispatched
  useEffect(() => {
    // Only listen when user is authenticated recruiter
    if (!accessToken || !isRecruiterUser) return;

    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent<any>;
        const payload = custom.detail;
        const reminderPayload = payload?.payload || payload?.reminder || payload;

        if (!payload && !reminderPayload) return;

        const isSent = (reminderPayload && (reminderPayload.dailyCount > 0 || reminderPayload.sentAt)) || payload?.type === 'rnrReminder.sent' || payload?.show === true || payload?.immediate === true;
        if (!isSent) return;

        const reminderObj: RNRReminder = reminderPayload?.reminder || reminderPayload || ({ id: payload?.reminderId || payload?.id } as RNRReminder);

        if (!reminderObj.candidate) {
          // wait for refetch to supply full object
          setPendingReminderId(reminderObj.id);
          setTimeout(() => setPendingReminderId((cur) => (cur === reminderObj.id ? null : cur)), 30000);
          return;
        }

        if (isModalOpen) return;

        setCurrentReminder(reminderObj);
        setIsModalOpen(true);

        setShownReminderIds((prev) => {
          const updated = new Map(prev);
          const count = reminderObj.reminderCount ?? reminderPayload?.reminderCount ?? 0;
          updated.set(reminderObj.id, count);
          saveShownReminders(updated);
          return updated;
        });
      } catch (err) {
        console.warn("Error handling real-time RNR event:", err);
      }
    };

    window.addEventListener("rnr:reminder", handler as EventListener);
    window.addEventListener("rnrReminder.sent", handler as EventListener);
    return () => {
      window.removeEventListener("rnr:reminder", handler as EventListener);
      window.removeEventListener("rnrReminder.sent", handler as EventListener);
    };
  }, [isModalOpen, accessToken, isRecruiterUser]);

  // Pending id handler: when refetch returns full reminder, open modal
  useEffect(() => {
    if (!pendingReminderId || !remindersData) return;

    const found = remindersData.data?.find((r) => r.id === pendingReminderId);
    if (found) {
      if (!isModalOpen) {
        setCurrentReminder(found);
        setIsModalOpen(true);
      }

      setShownReminderIds((prev) => {
        const updated = new Map(prev);
        updated.set(found.id, found.reminderCount ?? 0);
        saveShownReminders(updated);
        return updated;
      });

      setPendingReminderId(null);
    }
  }, [pendingReminderId, remindersData, isModalOpen]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentReminder(null);
  };

  const clearShownReminders = () => {
    setShownReminderIds(new Map());
    saveShownReminders(new Map());
  };

  return {
    isModalOpen,
    currentReminder,
    pendingRemindersCount: activeReminders.length,
    allReminders: activeReminders,
    isLoading,
    handleCloseModal,
    clearShownReminders,
  };
}
