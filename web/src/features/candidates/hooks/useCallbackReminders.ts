import { useEffect, useState } from "react";

export function useCallbackReminders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<any>;
      const payload = custom.detail?.notification || custom.detail;
      if (!payload) return;

      setNotification(payload);
      setIsModalOpen(true);
    };

    window.addEventListener("callback:reminder", handler as EventListener);
    return () => window.removeEventListener("callback:reminder", handler as EventListener);
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
    setNotification(null);
  };

  return {
    isModalOpen,
    notification,
    handleClose,
  };
}
