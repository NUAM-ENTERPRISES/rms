import { toast } from "sonner";

/**
 * Hook for clearing all notifications
 * @returns Function to clear all notifications
 */
export function useClearNotifications() {
  const clearAllNotifications = async () => {
    try {
      // TODO: Implement API call to clear all notifications
      // For now, just show a toast
      toast.success("All notifications cleared");
      console.log("Clear all notifications - API not implemented yet");
    } catch (error) {
      toast.error("Failed to clear notifications");
      console.error("Clear notifications error:", error);
    }
  };

  return {
    clearAll: clearAllNotifications,
  };
}
