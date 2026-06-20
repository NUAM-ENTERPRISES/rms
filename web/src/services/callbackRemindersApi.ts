import { baseApi } from "@/app/api/baseApi";

export interface CallbackReminder {
  id: string;
  candidateId: string;
  statusHistoryId?: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    countryCode: string;
    mobileNumber: string;
    currentStatus: {
      id: number;
      statusName: string;
    };
  };
  scheduledFor: string;
  sentAt: string | null;
  status: "pending" | "sent" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  statusHistory: {
    statusUpdatedAt: string;
    reason?: string;
  };
}

export interface CallbackRemindersResponse {
  success: boolean;
  data: CallbackReminder[];
  message: string;
}

export const callbackRemindersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyCallbackReminders: builder.query<CallbackRemindersResponse, void>({
      query: () => "/callback-reminders/my-reminders",
      providesTags: ["CallbackReminder"],
    }),

    dismissCallbackReminder: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (reminderId) => ({
        url: `/callback-reminders/${reminderId}/dismiss`,
        method: "DELETE",
      }),
      invalidatesTags: ["CallbackReminder", "Notification"],
    }),
  }),
});

export const {
  useGetMyCallbackRemindersQuery,
  useDismissCallbackReminderMutation,
} = callbackRemindersApi;
