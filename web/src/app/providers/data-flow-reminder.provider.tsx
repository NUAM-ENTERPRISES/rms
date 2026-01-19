import { DataFlowReminderModal } from "@/features/processing/components/DataFlowReminderModal";
import { useDataFlowReminders } from "@/features/processing/hooks/useDataFlowReminders";

export function DataFlowReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isModalOpen, currentReminder, handleCloseModal } = useDataFlowReminders();

  return (
    <>
      {children}
      <DataFlowReminderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reminder={currentReminder}
      />
    </>
  );
}
