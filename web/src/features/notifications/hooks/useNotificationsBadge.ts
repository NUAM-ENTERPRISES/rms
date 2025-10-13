import { useGetBadgeQuery } from "@/features/notifications/data";

/**
 * Hook for fetching unread notifications badge count
 * @returns RTK Query result with badge data
 */
export function useNotificationsBadge() {
  return useGetBadgeQuery();
}
