import { baseApi } from "@/app/api/baseApi";

export interface HRDReminder {
  id: string;
  processingStepId: string;
  processingStep: {
    id: string;
    processingId: string;
    processing: {
      id: string;
      candidateId: string;
      candidate: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        countryCode?: string;
        mobileNumber?: string;
      };
      project: {
        id: string;
        projectId: string;
        name: string;
      };
    };
    // Optional processingCandidate nested on processingStep (some responses include it)
    processingCandidate?: {
      id: string;
      candidateId?: string;
      projectId?: string;
      roleNeededId?: string;
      assignedProcessingTeamUserId?: string;
      candidate?: {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        countryCode?: string;
        mobileNumber?: string;
      };
      project?: {
        id: string;
        projectId?: string;
        title?: string;
        name?: string;
      };
      role?: {
        id?: string;
        designation?: string;
        roleCatalog?: {
          id?: string;
          name?: string;
          label?: string;
          shortName?: string;
        };
      };
    };
    stepType: string;
    status: string;
    submittedAt: string | null;
  };
  scheduledFor: string;
  sentAt: string | null;
  status: "pending" | "sent" | "cancelled";
  reminderCount: number;
  dailyCount: number;
  daysCompleted: number;
  lastReminderDate: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional flat processingCandidate for some responses
  processingCandidate?: {
    id: string;
    processingId?: string;
    candidateId?: string;
    projectId?: string;
    assignedProcessingTeamUserId?: string;
    candidate?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      countryCode?: string;
      mobileNumber?: string;
    };
    project?: {
      id: string;
      projectId?: string;
      title?: string;
      name?: string;
    };
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta?: { page: number; limit: number; total: number };
}

export interface HRDRemindersResponse {
  success: boolean;
  data: HRDReminder[] | PaginatedResponse<HRDReminder>;
  message: string;
}

export interface DismissReminderResponse {
  success: boolean;
  message: string;
}

export const hrdRemindersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Support optional `dueOnly` arg to fetch only actionable reminders
    getHRDReminders: builder.query<HRDRemindersResponse, void>({
      query: () => `/hrd-reminders/hrd-scheduler`,
      providesTags: ["HRDReminder"],
    }),

    dismissHRDReminder: builder.mutation<DismissReminderResponse, string>({
      query: (reminderId) => ({
        url: `/hrd-reminders/${reminderId}/dismiss`,
        method: "DELETE",
      }),
      invalidatesTags: ["HRDReminder", "Notification"],
    }),

    processHRDReminders: builder.mutation<
      { success: boolean; message: string },
      void
    >({
      query: () => ({
        url: "/hrd-reminders/process",
        method: "POST",
      }),
      invalidatesTags: ["HRDReminder"],
    }),
  }),
});

export const {
  useGetHRDRemindersQuery,
  useDismissHRDReminderMutation,
  useProcessHRDRemindersMutation,
} = hrdRemindersApi;
