import { useState, useEffect, useRef } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useAppSelector } from "@/app/hooks";
import { useHasRole } from "@/hooks/useCan";
import {
  useGetMyCallbackRemindersQuery,
  useDismissCallbackReminderMutation,
} from "@/services/callbackRemindersApi";
import type { CallbackReminder } from "@/services/callbackRemindersApi";

const SHOWN_REMINDERS_KEY = "callback_shown_reminders";

const loadShownReminders = (): Set<string> => {
  try {
    const stored = localStorage.getItem(SHOWN_REMINDERS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as string[]);
    }
  } catch {
    /* ignore */
  }
  return new Set();
};

const saveShownReminders = (ids: Set<string>) => {
  try {
    localStorage.setItem(SHOWN_REMINDERS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
};

const hasCompleteCandidate = (reminder: CallbackReminder | null | undefined) =>
  Boolean(
    reminder?.candidate?.mobileNumber && reminder?.candidate?.countryCode,
  );

export function useCallbackReminders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReminder, setCurrentReminder] =
    useState<CallbackReminder | null>(null);
  const [shownReminderIds, setShownReminderIds] = useState<Set<string>>(
    loadShownReminders,
  );
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const hasCheckedInitialRef = useRef(false);

  const { accessToken, user } = useAppSelector((s) => s.auth);
  const isRecruiterUser =
    useHasRole("recruiter") ||
    (!!user &&
      (Array.isArray(user.roles)
        ? user.roles.some((r: string) => r.toLowerCase().includes("recruiter"))
        : typeof (user as { role?: string }).role === "string" &&
          (user as { role: string }).role.toLowerCase().includes("recruiter")));

  const queryArg = accessToken && isRecruiterUser ? {} : skipToken;
  const { data: remindersData, refetch } = useGetMyCallbackRemindersQuery(
    queryArg as Record<string, never>,
    {
      pollingInterval: 0,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
      refetchOnFocus: false,
    },
  );

  const [dismissReminder] = useDismissCallbackReminderMutation();

  useEffect(() => {
    if (accessToken && isRecruiterUser && typeof refetch === "function") {
      refetch().catch(() => {});
    }

    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        accessToken &&
        isRecruiterUser &&
        typeof refetch === "function"
      ) {
        refetch().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch, accessToken, isRecruiterUser]);

  const reminders = remindersData?.data ?? [];
  const activeReminders = reminders.filter((r) => r.sentAt || r.status === "sent");

  useEffect(() => {
    if (!remindersData) return;
    if (!hasCheckedInitialRef.current) {
      hasCheckedInitialRef.current = true;
      return;
    }
    if (isModalOpen) return;

    const newReminder = activeReminders.find(
      (r) => !shownReminderIds.has(r.id) && hasCompleteCandidate(r),
    );
    if (newReminder) {
      setCurrentReminder(newReminder);
      setIsModalOpen(true);
      setShownReminderIds((prev) => {
        const updated = new Set(prev);
        updated.add(newReminder.id);
        saveShownReminders(updated);
        return updated;
      });
    }
  }, [
    activeReminders.map((r) => r.id).join(","),
    isModalOpen,
    remindersData,
    shownReminderIds,
  ]);

  useEffect(() => {
    if (!accessToken || !isRecruiterUser) return;

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{
        reminder?: CallbackReminder;
        show?: boolean;
      }>;
      const payload = custom.detail;
      const reminderPayload = payload?.reminder;
      if (!payload?.show || !reminderPayload?.id) return;

      if (isModalOpen) return;

      if (hasCompleteCandidate(reminderPayload)) {
        setCurrentReminder(reminderPayload);
        setIsModalOpen(true);
        setShownReminderIds((prev) => {
          const updated = new Set(prev);
          updated.add(reminderPayload.id);
          saveShownReminders(updated);
          return updated;
        });
        return;
      }

      setPendingReminderId(reminderPayload.id);
      refetch().catch(() => {});
    };

    window.addEventListener("callback:reminder", handler as EventListener);
    return () =>
      window.removeEventListener("callback:reminder", handler as EventListener);
  }, [isModalOpen, accessToken, isRecruiterUser, refetch]);

  useEffect(() => {
    if (!pendingReminderId || !remindersData) return;
    const found = remindersData.data?.find((r) => r.id === pendingReminderId);
    if (found && hasCompleteCandidate(found) && !isModalOpen) {
      setCurrentReminder(found);
      setIsModalOpen(true);
      setShownReminderIds((prev) => {
        const updated = new Set(prev);
        updated.add(found.id);
        saveShownReminders(updated);
        return updated;
      });
      setPendingReminderId(null);
    }
  }, [pendingReminderId, remindersData, isModalOpen]);

  const handleCloseModal = async () => {
    if (currentReminder) {
      try {
        await dismissReminder(currentReminder.id).unwrap();
      } catch {
        /* dismiss is best-effort */
      }
    }
    setIsModalOpen(false);
    setCurrentReminder(null);
  };

  return {
    isModalOpen,
    currentReminder,
    pendingRemindersCount: activeReminders.length,
    handleCloseModal,
  };
}
