import { useState, useEffect, useRef } from "react";
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
  const hasCheckedInitialRef = useRef(false);

  // Poll for reminder data every 10 seconds
  const { data: remindersData, isLoading } = useGetMyRNRRemindersQuery(
    undefined,
    {
      pollingInterval: 10000, // 10 seconds
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const reminders = remindersData?.data || [];
  
  // Show ALL reminders with dailyCount > 0 (which means they have been sent at least once)
  const activeReminders = reminders.filter((r) => {
    const hasDailyCount = r.dailyCount && r.dailyCount > 0;
    return hasDailyCount;
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
