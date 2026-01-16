import { HRDReminderModal } from "@/features/processing/components/HRDReminderModal";
import { useHRDReminders } from "@/features/processing/hooks/useHRDReminders";

/**
 * HRD Reminder Provider
 * Handles global HRD reminder notifications and displays modal when reminders are due
 */
export function HRDReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isModalOpen, currentReminder, handleCloseModal } = useHRDReminders();

  return (
    <>
      {children}
      <HRDReminderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reminder={currentReminder}
      />
    </>
  );
}
