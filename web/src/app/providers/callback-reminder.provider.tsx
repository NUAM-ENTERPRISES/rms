import { CallbackReminderModal } from "@/features/candidates/components/CallbackReminderModal";
import { useCallbackReminders } from "@/features/candidates/hooks/useCallbackReminders";

export function CallbackReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isModalOpen, notification, handleClose } = useCallbackReminders();

  return (
    <>
      {children}
      <CallbackReminderModal
        isOpen={isModalOpen}
        onClose={handleClose}
        notification={notification}
      />
    </>
  );
}
