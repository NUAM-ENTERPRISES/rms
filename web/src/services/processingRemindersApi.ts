import { baseApi } from "@/app/api/baseApi";

export interface ProcessingReminder {
  id: string;
  processingStepId: string;
  stepKey: string;
  candidateName: string;
  projectName: string;
  title: string;
  message: string;
  route: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
  reminderCount?: number;
  submittedAt?: string | null;
  templateName?: string | null;
}

export interface ProcessingRemindersArgs {
  page: number;
  limit: number;
}

export interface ProcessingRemindersData {
  items: ProcessingReminder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProcessingRemindersResponse {
  success: boolean;
  data: ProcessingRemindersData;
  message: string;
}

export const processingRemindersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProcessingReminders: builder.query<ProcessingRemindersData, ProcessingRemindersArgs>({
      query: ({ page, limit }) => `/processing/reminders?page=${page}&limit=${limit}`,
      transformResponse: (response: ProcessingRemindersResponse) => response.data,
      providesTags: ["Processing"],
    }),
  }),
});

export const { useGetProcessingRemindersQuery } = processingRemindersApi;
