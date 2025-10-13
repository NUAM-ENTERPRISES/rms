import { baseApi } from "@/app/api/baseApi";

// DTOs for server communication
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  meta: Record<string, unknown> | null;
  status: "unread" | "read";
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationBadgeDto {
  unread: number;
}

export interface QueryNotificationsRequest {
  status?: "unread" | "read";
  limit?: number;
  cursor?: string;
}

export interface PaginatedNotificationsResponse {
  notifications: NotificationDto[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// Transform functions
export const NotificationTransforms = {
  toDomain: (dto: NotificationDto) => ({
    id: dto.id,
    type: dto.type,
    title: dto.title,
    message: dto.message,
    link: dto.link,
    meta: dto.meta,
    status: dto.status,
    readAt: dto.readAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }),
};

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List notifications with pagination
    listNotifications: builder.query<
      ApiResponse<PaginatedNotificationsResponse>,
      QueryNotificationsRequest
    >({
      query: (params) => ({
        url: "/notifications",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.notifications.map(({ id }) => ({
                type: "Notification" as const,
                id,
              })),
              { type: "Notification", id: "LIST" },
            ]
          : [{ type: "Notification", id: "LIST" }],
    }),

    // Get unread badge count
    getBadge: builder.query<ApiResponse<NotificationBadgeDto>, void>({
      query: () => "/notifications/badge",
      providesTags: ["NotificationBadge"],
    }),

    // Mark notification as read
    markAsRead: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "POST",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "Notification", id },
        { type: "Notification", id: "LIST" },
        "NotificationBadge",
      ],
      // Optimistic update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData("getBadge", undefined, (draft) => {
            if (draft.data.unread > 0) {
              draft.data.unread -= 1;
            }
          })
        );

        const listPatchResult = dispatch(
          notificationsApi.util.updateQueryData("listNotifications", {}, (draft) => {
            const notification = draft.data.notifications.find((n) => n.id === id);
            if (notification && notification.status === "unread") {
              notification.status = "read";
              notification.readAt = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          // Rollback optimistic updates on failure
          patchResult.undo();
          listPatchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useGetBadgeQuery,
  useMarkAsReadMutation,
} = notificationsApi;

