import { useState, useEffect, useCallback } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useAppSelector } from "@/app/hooks";
import { useCan } from "@/hooks/useCan";
import { useGetProcessingRemindersQuery } from "@/services/processingRemindersApi";
import type { ProcessingReminder } from "@/services/processingRemindersApi";

const SHOWN_REMINDERS_KEY = "processing_shown_reminders";
const PAGE_LIMIT = 10;

interface ShownReminder {
  id: string;
  count: number;
}

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
 * Hook to manage processing step reminders with pagination
 */
export function useProcessingReminders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [globalOffset, setGlobalOffset] = useState(0); // 0-based index across all reminders
  const [shownReminderIds, setShownReminderIds] = useState<Map<string, number>>(loadShownReminders);

  const { accessToken } = useAppSelector((s) => s.auth);
  const canReadProcessing = useCan("read:processing");

  // Derive page from global offset
  const currentPage = Math.floor(globalOffset / PAGE_LIMIT) + 1;
  const indexInPage = globalOffset % PAGE_LIMIT;

  const queryArg = accessToken && canReadProcessing
    ? { page: currentPage, limit: PAGE_LIMIT }
    : skipToken;

  const { data: remindersData, refetch, isFetching } = useGetProcessingRemindersQuery(queryArg as any, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    refetchOnFocus: false,
  });

  useEffect(() => {
    if (accessToken && canReadProcessing && typeof refetch === "function") {
      refetch().catch(() => {});
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && accessToken && canReadProcessing && typeof refetch === "function") {
        refetch().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch, accessToken, canReadProcessing]);

  const items = remindersData?.items ?? [];
  const total = remindersData?.total ?? 0;
  const totalPages = remindersData?.totalPages ?? 1;

  // Clamp offset if total shrinks
  useEffect(() => {
    if (total > 0 && globalOffset >= total) {
      setGlobalOffset(Math.max(0, total - 1));
    }
  }, [total, globalOffset]);

  // Current reminder: item at indexInPage in the fetched page
  const currentReminder: ProcessingReminder | null = items[indexInPage] ?? items[0] ?? null;

  // Cleanup shown reminders that are no longer in any active set
  useEffect(() => {
    const reminderIds = new Set(items.map((r) => r.id));
    const cleanedShownIds = new Map(
      Array.from(shownReminderIds.entries()).filter(([id]) => reminderIds.has(id))
    );
    if (cleanedShownIds.size !== shownReminderIds.size) {
      setShownReminderIds(cleanedShownIds);
      saveShownReminders(cleanedShownIds);
    }
  }, [items.length]);

  // Auto-open modal for any reminder not yet shown at its current count
  useEffect(() => {
    if (!remindersData || isModalOpen) return;

    const newIdx = items.findIndex((r) => {
      const shownCount = shownReminderIds.get(r.id);
      return shownCount === undefined || (r.reminderCount ?? 0) > shownCount;
    });

    if (newIdx !== -1) {
      const newReminder = items[newIdx];
      // Jump to this item's global offset
      setGlobalOffset((currentPage - 1) * PAGE_LIMIT + newIdx);
      setIsModalOpen(true);
      setShownReminderIds((prev) => {
        const updated = new Map(prev);
        updated.set(newReminder.id, newReminder.reminderCount ?? 0);
        saveShownReminders(updated);
        return updated;
      });
    }
  }, [items.map(r => `${r.id}:${r.reminderCount}`).join(","), isModalOpen, remindersData]);

  // Socket listener: when a processing reminder arrives, reset to page 1 and refetch
  useEffect(() => {
    if (!accessToken || !canReadProcessing) return;

    const handler = () => {
      setGlobalOffset(0);
      if (typeof refetch === "function") {
        refetch().catch(() => {});
      }
    };

    window.addEventListener("processing:reminder", handler);
    return () => window.removeEventListener("processing:reminder", handler);
  }, [accessToken, canReadProcessing, refetch]);

  const handlePrev = useCallback(() => {
    setGlobalOffset((o) => Math.max(0, o - 1));
  }, []);

  const handleNext = useCallback(() => {
    setGlobalOffset((o) => Math.min(total - 1, o + 1));
  }, [total]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    isModalOpen,
    currentReminder,
    handleCloseModal,
    handlePrev,
    handleNext,
    currentPosition: total > 0 ? globalOffset + 1 : 0,
    total,
    totalPages,
    currentPage,
    isFetching,
    refetch,
  };
}
