import { useListNotificationsQuery } from "@/features/notifications/data";
import type { QueryNotificationsRequest } from "@/features/notifications/data";

/**
 * Hook for fetching notifications list with pagination
 * @param params - Query parameters for filtering and pagination
 * @returns RTK Query result with notifications data
 */
export function useNotificationsList(params: QueryNotificationsRequest = {}) {
  return useListNotificationsQuery(params);
}
