import { RNRReminderModal } from "@/features/candidates/components/RNRReminderModal";
import { useRNRReminders } from "@/features/candidates/hooks/useRNRReminders";

/**
 * RNR Reminder Provider
 * Handles global RNR reminder notifications and displays modal when reminders are due
 */
export function RNRReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isModalOpen, currentReminder, handleCloseModal } = useRNRReminders();

  return (
    <>
      {children}
      <RNRReminderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reminder={currentReminder}
      />
    </>
  );
}
