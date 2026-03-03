import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { toggleMute, setMuted } from "@/features/notifications/notificationSettingsSlice";

export function useNotificationSettings() {
  const dispatch = useAppDispatch();
  const muted = useAppSelector((state) => state.notificationSettings.muted);

  const toggle = () => {
    dispatch(toggleMute());
  };

  const set = (value: boolean) => {
    dispatch(setMuted(value));
  };

  return { muted, toggle, set };
}
