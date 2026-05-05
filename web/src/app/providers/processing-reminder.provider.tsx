import { ProcessingFollowupModal } from "@/features/processing/components/ProcessingFollowupModal";
import { useProcessingReminders } from "@/features/processing/hooks/useProcessingReminders";

/**
 * Processing Reminder Provider
 * Handles global processing step reminder notifications and displays modal when reminders are due
 */
export function ProcessingReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isModalOpen, currentReminder, handleCloseModal, handlePrev, handleNext, currentPosition, total, isFetching } = useProcessingReminders();

  return (
    <>
      {children}
      <ProcessingFollowupModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reminder={currentReminder}
        onPrev={handlePrev}
        onNext={handleNext}
        currentPosition={currentPosition}
        total={total}
        isFetching={isFetching}
      />
    </>
  );
}
