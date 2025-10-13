import { useMarkAsReadMutation } from "@/features/notifications/data";
import { toast } from "sonner";

/**
 * Hook for marking notifications as read with error handling
 * @returns Mutation function with optimistic updates and error rollback
 */
export function useMarkNotificationRead() {
  const [markAsRead, result] = useMarkAsReadMutation();

  const markAsReadWithToast = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
      // Success is handled by optimistic updates
    } catch (error) {
      toast.error("Failed to mark notification as read");
      console.error("Mark as read error:", error);
    }
  };

  return {
    markAsRead: markAsReadWithToast,
    isLoading: result.isLoading,
    error: result.error,
  };
}
