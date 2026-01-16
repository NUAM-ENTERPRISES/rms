import { useState, useEffect, useRef } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useAppSelector } from "@/app/hooks";
import { useHasRole } from "@/hooks/useCan";
import { useGetHRDRemindersQuery } from "@/services/hrdRemindersApi";
import type { HRDReminder } from "@/services/hrdRemindersApi";

const SHOWN_REMINDERS_KEY = "hrd_shown_reminders";

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
    console.error("Failed to load shown HRD reminders:", error);
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
    console.error("Failed to save shown HRD reminders:", error);
  }
};

/**
 * Hook to manage HRD (Hard Copy) reminders
 * Polls for pending reminders and provides modal state management
 */
export function useHRDReminders() {
  // Only fetch for authenticated processing users (no need to call when logged out)
  const { accessToken, user } = useAppSelector((s) => s.auth);
  const isProcessingUser = useHasRole("processing") || (!!user && (
    Array.isArray(user.roles)
      ? user.roles.some((r: string) => r.toLowerCase().includes("processing"))
      : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("processing")
  ));

  const queryArg = accessToken && isProcessingUser ? { dueOnly: true } : skipToken;

  // Socket-first + light-polling fallback (5 minutes)
  const { data: remindersData, isLoading, refetch, isUninitialized } = useGetHRDRemindersQuery(queryArg, {
    pollingInterval: 300000, // 5 minutes fallback poll
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    refetchOnFocus: false,
  });

  // Fetch once on mount and on visibility change (when tab becomes visible)
  useEffect(() => {
    // Only call refetch when the query has been started (not uninitialized)
    if (!isUninitialized && typeof refetch === "function") {
      refetch().catch(() => {});
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !isUninitialized && typeof refetch === "function") {
        refetch().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch, accessToken, isUninitialized]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<HRDReminder | null>(
    null
  );
  const [shownReminderIds, setShownReminderIds] = useState<Map<string, number>>(
    loadShownReminders
  );
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const hasCheckedInitialRef = useRef(false);

  const reminders = remindersData?.data || [];
  
  // Show reminders that have been sent or updated recently
  // Consider sentAt, dailyCount, or reminderCount to be eligible for showing
  const activeReminders = reminders.filter((r) => {
    const hasDailyCount = r.dailyCount && r.dailyCount > 0;
    const wasSent = !!r.sentAt;
    const hasReminders = r.reminderCount && r.reminderCount > 0;
    return hasDailyCount || wasSent || hasReminders;
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
      console.log(`[HRD] Showing reminder for processing ${newReminder.processingStep.processingId}, count: ${newReminder.reminderCount}`);
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
    // Only listen when user is authenticated processing user
    if (!accessToken || !isProcessingUser) return;

    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent<any>;
        const payload = custom.detail;
        // Payload shape may vary; support both top-level and payload.payload
        const reminderPayload = payload?.payload || payload?.reminder || payload;

        // If we don't have a payload at all, ignore
        if (!payload && !reminderPayload) return;

        // Determine whether to open immediately:
        // - If payload explicitly indicates it's a sent event (`type === 'hrdReminder.sent'`) OR
        // - If payload includes an explicit show/immediate flag OR
        // - If the reminder payload itself indicates it was sent (dailyCount > 0 || sentAt)
        const isSent = (reminderPayload && (reminderPayload.dailyCount > 0 || reminderPayload.sentAt)) || payload?.type === 'hrdReminder.sent' || payload?.show === true || payload?.immediate === true;

        if (!isSent) return;

        // Construct minimal HRDReminder shape if possible
        const reminderObj: HRDReminder = reminderPayload?.reminder || reminderPayload || ({ id: payload?.reminderId || payload?.id } as HRDReminder);

        // If server didn't send full reminder object, wait for refetch to supply it
        if (!reminderObj.processingStep) {
          console.debug("[HRD] Real-time reminder received without details, will wait for refetch:", reminderObj, payload);
          // set pending id so another effect will open the modal once remindersData includes the full object
          setPendingReminderId(reminderObj.id);
          // clear pending after 30s to avoid stale state
          setTimeout(() => setPendingReminderId((cur) => (cur === reminderObj.id ? null : cur)), 30000);
          return;
        }

        // Avoid opening multiple times if modal already open
        if (isModalOpen) return;

        console.debug("[HRD] Real-time reminder received, opening modal:", reminderObj, payload);

        setCurrentReminder(reminderObj);
        setIsModalOpen(true);

        // Mark as shown with current count (use 0 if unknown)
        setShownReminderIds((prev) => {
          const updated = new Map(prev);
          const count = reminderObj.reminderCount ?? reminderPayload?.reminderCount ?? 0;
          updated.set(reminderObj.id, count);
          saveShownReminders(updated);
          return updated;
        });
      } catch (err) {
        console.warn("Error handling real-time HRD reminder event:", err);
      }
    };

    window.addEventListener("hrd:reminder", handler as EventListener);
    // Some providers might dispatch the raw socket event name as well
    window.addEventListener("hrdReminder.sent", handler as EventListener);
    return () => {
      window.removeEventListener("hrd:reminder", handler as EventListener);
      window.removeEventListener("hrdReminder.sent", handler as EventListener);
    };
  }, [isModalOpen, accessToken, isProcessingUser]);

  // When we have a pending reminder id (from real-time), wait for the refetch to include full reminder
  useEffect(() => {
    if (!pendingReminderId || !remindersData) return;

    const found = remindersData.data?.find((r) => r.id === pendingReminderId);
    if (found) {
      if (!isModalOpen) {
        console.debug(`[HRD] Refetch returned reminder ${pendingReminderId}, opening modal.`);
        setCurrentReminder(found);
        setIsModalOpen(true);
      }

      // Mark as shown with current count
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
