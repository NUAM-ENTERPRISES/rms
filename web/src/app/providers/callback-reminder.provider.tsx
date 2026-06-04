import { CallbackReminderModal } from "@/features/candidates/components/CallbackReminderModal";
import { useCallbackReminders } from "@/features/candidates/hooks/useCallbackReminders";

export function CallbackReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isModalOpen, currentReminder, handleCloseModal } =
    useCallbackReminders();

  return (
    <>
      {children}
      <CallbackReminderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reminder={currentReminder}
      />
    </>
  );
}
