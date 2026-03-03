import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { toggleMute, setMuted } from "@/features/notifications/notificationSettingsSlice";
import { notificationsApi } from "@/features/notifications/data/notifications.endpoints";

export function useNotificationSettings() {
  const dispatch = useAppDispatch();
  const muted = useAppSelector((state) => state.notificationSettings.muted);

  // fetch current server setting on login
  const { data: settings } = notificationsApi.useGetSettingsQuery(undefined, {
    skip: process.env.NODE_ENV === 'test',
  });

  useEffect(() => {
    if (settings?.data) {
      dispatch(setMuted(settings.data.muted));
    }
  }, [settings, dispatch]);

  const [updateSettings] = notificationsApi.useUpdateSettingsMutation();

  const toggle = async () => {
    const desired = !muted;
    // optimistic
    dispatch(setMuted(desired));
    try {
      const result = await updateSettings({ muted: desired }).unwrap();
      dispatch(setMuted(result.data.muted));
    } catch {
      dispatch(setMuted(muted));
    }
  };

  const set = (value: boolean) => {
    dispatch(setMuted(value));
  };

  return { muted, toggle, set };
}
