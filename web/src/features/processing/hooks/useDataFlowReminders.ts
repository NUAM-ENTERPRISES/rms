import { useState, useEffect, useRef } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useAppSelector } from "@/app/hooks";
import { useHasRole } from "@/hooks/useCan";
import { useGetDataFlowRemindersQuery } from "@/services/dataFlowRemindersApi";
import type { DataFlowReminder } from "@/services/dataFlowRemindersApi";

const SHOWN_REMINDERS_KEY = "dataflow_shown_reminders";

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
    console.error("Failed to load Data Flow reminders:", error);
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
    console.error("Failed to save Data Flow reminders:", error);
  }
};

export function useDataFlowReminders() {
  const { accessToken, user } = useAppSelector((s) => s.auth);
  const isProcessingUser = useHasRole("processing") || (!!user && (
    Array.isArray(user.roles)
      ? user.roles.some((r: string) => r.toLowerCase().includes("processing"))
      : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("processing")
  ));

  const queryArg = accessToken && isProcessingUser ? undefined : skipToken;

  const { data: remindersData, isLoading, refetch, isUninitialized } = useGetDataFlowRemindersQuery(queryArg, {
    pollingInterval: 300000, // 5 minutes fallback poll
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    refetchOnFocus: false,
  });

  useEffect(() => {
    if (!isUninitialized && typeof refetch === "function") {
      const maybe = refetch();
      if (maybe && typeof (maybe as any).catch === "function") maybe.catch(() => {});
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !isUninitialized && typeof refetch === "function") {
        const maybe = refetch();
        if (maybe && typeof (maybe as any).catch === "function") maybe.catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch, accessToken, isUninitialized]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<DataFlowReminder | null>(
    null
  );
  const [shownReminderIds, setShownReminderIds] = useState<Map<string, number>>(
    loadShownReminders
  );
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const hasCheckedInitialRef = useRef(false);

  const rawReminders = remindersData?.data;
  const reminders: DataFlowReminder[] = Array.isArray(rawReminders) ? rawReminders : (rawReminders?.items ?? []);
  const pagination = !Array.isArray(rawReminders) && rawReminders ? { page: rawReminders.page, limit: rawReminders.limit, total: rawReminders.total } : undefined;

  const activeReminders = reminders.filter((r) => {
    const hasDailyCount = r.dailyCount && r.dailyCount > 0;
    const wasSent = !!r.sentAt;
    const hasReminders = r.reminderCount && r.reminderCount > 0;
    return hasDailyCount || wasSent || hasReminders;
  });

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
    if (!remindersData) return;

    if (!hasCheckedInitialRef.current) {
      hasCheckedInitialRef.current = true;
      return;
    }

    if (isModalOpen) return;

    const newReminder = activeReminders.find((r) => {
      const shownCount = shownReminderIds.get(r.id);
      return shownCount === undefined || r.reminderCount > shownCount;
    });

    if (newReminder) {
      console.log(`[DataFlow] Showing reminder for processing ${newReminder.processingStep.processingId}, count: ${newReminder.reminderCount}`);
      setCurrentReminder(newReminder);
      setIsModalOpen(true);
      setShownReminderIds((prev) => {
        const updated = new Map(prev);
        updated.set(newReminder.id, newReminder.reminderCount);
        saveShownReminders(updated);
        return updated;
      });
    }
  }, [activeReminders.map(r => `${r.id}:${r.reminderCount}`).join(','), isModalOpen, remindersData]);

  useEffect(() => {
    if (!accessToken || !isProcessingUser) return;

    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent<any>;
        const payload = custom.detail;
        const reminderPayload = payload?.payload || payload?.reminder || payload;

        if (!payload && !reminderPayload) return;

        const isSent = (reminderPayload && (reminderPayload.dailyCount > 0 || reminderPayload.sentAt)) || payload?.type === 'dataFlowReminder.sent' || payload?.show === true || payload?.immediate === true;

        if (!isSent) return;

        const reminderObj: DataFlowReminder = reminderPayload?.reminder || reminderPayload || ({ id: payload?.reminderId || payload?.id } as DataFlowReminder);

        if (!reminderObj.processingStep) {
          console.debug("[DataFlow] Real-time reminder received without details, will wait for refetch:", reminderObj, payload);
          setPendingReminderId(reminderObj.id);
          setTimeout(() => setPendingReminderId((cur) => (cur === reminderObj.id ? null : cur)), 30000);
          return;
        }

        if (isModalOpen) return;

        console.debug("[DataFlow] Real-time reminder received, opening modal:", reminderObj, payload);

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
        console.warn("Error handling real-time Data Flow reminder event:", err);
      }
    };

    window.addEventListener("dataflow:reminder", handler as EventListener);
    window.addEventListener("dataFlowReminder.sent", handler as EventListener);
    return () => {
      window.removeEventListener("dataflow:reminder", handler as EventListener);
      window.removeEventListener("dataFlowReminder.sent", handler as EventListener);
    };
  }, [isModalOpen, accessToken, isProcessingUser]);

  useEffect(() => {
    if (!pendingReminderId || !remindersData) return;

    const found = reminders.find((r) => r.id === pendingReminderId);
    if (found) {
      if (!isModalOpen) {
        console.debug(`[DataFlow] Refetch returned reminder ${pendingReminderId}, opening modal.`);
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
