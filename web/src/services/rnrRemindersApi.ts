import { baseApi } from "@/app/api/baseApi";

export interface RNRReminder {
  id: string;
  candidateId: string;
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
  status: "pending" | "sent" | "cancelled";
  reminderCount: number;
  dailyCount: number;
  lastReminderDate: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: {
    statusUpdatedAt: string;
    reason?: string;
  };
}

export interface RNRRemindersResponse {
  success: boolean;
  data: RNRReminder[];
  message: string;
}

export interface DismissReminderResponse {
  success: boolean;
  message: string;
}

export const rnrRemindersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyRNRReminders: builder.query<RNRRemindersResponse, void>({
      query: () => "/rnr-reminders/my-reminders",
      providesTags: ["RNRReminder"],
    }),

    dismissRNRReminder: builder.mutation<DismissReminderResponse, string>({
      query: (reminderId) => ({
        url: `/rnr-reminders/${reminderId}/dismiss`,
        method: "DELETE",
      }),
      invalidatesTags: ["RNRReminder", "Notification"],
    }),

    processRNRReminders: builder.mutation<
      { success: boolean; message: string },
      void
    >({
      query: () => ({
        url: "/rnr-reminders/process",
        method: "POST",
      }),
      invalidatesTags: ["RNRReminder"],
    }),
  }),
});

export const {
  useGetMyRNRRemindersQuery,
  useDismissRNRReminderMutation,
  useProcessRNRRemindersMutation,
} = rnrRemindersApi;
