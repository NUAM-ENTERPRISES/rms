import { baseApi } from "@/app/api/baseApi";
import {
  ProcessingCandidateSummary,
  ProcessingHistoryEntry,
  ProcessingStepKey,
  ProcessingStepStatus,
  ProcessingStep,
} from "../types";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ProcessingCandidatesQuery = {
  search?: string;
  projectId?: string;
  status?: ProcessingStepStatus;
  page?: number;
  limit?: number;
};

export const processingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProcessingCandidates: builder.query<
      ApiResponse<Paginated<ProcessingCandidateSummary>>,
      ProcessingCandidatesQuery | void
    >({
      query: (params) => ({
        url: "/processing/candidates",
        params,
      }),
      providesTags: ["ProcessingSummary"],
    }),
    getProcessingDetail: builder.query<
      ApiResponse<{
        candidate: ProcessingCandidateSummary["candidate"];
        project: ProcessingCandidateSummary["project"];
        steps: ProcessingStep[];
      }>,
      string
    >({
      query: (candidateProjectMapId) => ({
        url: `/processing/${candidateProjectMapId}`,
      }),
      providesTags: (_, __, id) => [{ type: "ProcessingStep", id }],
    }),
    getProcessingHistory: builder.query<
      ApiResponse<ProcessingHistoryEntry[]>,
      string
    >({
      query: (candidateProjectMapId) => ({
        url: `/processing/${candidateProjectMapId}/history`,
      }),
      providesTags: (_, __, id) => [{ type: "ProcessingHistory", id }],
    }),
    updateProcessingStep: builder.mutation<
      ApiResponse<ProcessingStep>,
      {
        candidateProjectMapId: string;
        stepKey: ProcessingStepKey;
        status: ProcessingStepStatus;
        notes?: string;
        notApplicableReason?: string;
      }
    >({
      query: ({ candidateProjectMapId, stepKey, ...body }) => ({
        url: `/processing/${candidateProjectMapId}/steps/${stepKey.toLowerCase()}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { candidateProjectMapId }) => [
        { type: "ProcessingStep", id: candidateProjectMapId },
        { type: "ProcessingHistory", id: candidateProjectMapId },
        "ProcessingSummary",
      ],
    }),
  }),
});

export const {
  useGetProcessingCandidatesQuery,
  useLazyGetProcessingCandidatesQuery,
  useGetProcessingDetailQuery,
  useGetProcessingHistoryQuery,
  useUpdateProcessingStepMutation,
} = processingApi;
