import { baseApi } from "@/app/api/baseApi";

export interface DataFlowReminder {
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

export interface DataFlowRemindersResponse {
  success: boolean;
  data: DataFlowReminder[];
  message: string;
}

export const dataFlowRemindersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Support optional `dueOnly` arg to fetch only actionable reminders
    getDataFlowReminders: builder.query<DataFlowRemindersResponse, void>({
      query: () => `/data-flow-reminders/data-flow-scheduler`,
      providesTags: ["DataFlowReminder"],
    }),
  }),
});

export const {
  useGetDataFlowRemindersQuery,
} = dataFlowRemindersApi;
