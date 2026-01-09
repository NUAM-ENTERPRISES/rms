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
  roleNeededId?: string;
  status?: ProcessingStepStatus | 'all' | 'pending' | 'transferred';
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
    getCandidatesToTransfer: builder.query<
      ApiResponse<{
        interviews: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>,
      ProcessingCandidatesQuery | void
    >({
      query: (params) => ({
        url: "/processing/candidates-to-transfer",
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
    transferToProcessing: builder.mutation<
      ApiResponse<any>,
      {
        candidateIds: string[];
        projectId: string;
        roleNeededId: string;
        assignedProcessingTeamUserId: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/processing/transfer-to-processing",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProcessingSummary"],
    }),
    getCandidateHistory: builder.query<
      ApiResponse<{
        id: string;
        candidateId: string;
        projectId: string;
        roleNeededId: string;
        processingStatus: string;
        candidate: {
          firstName: string;
          lastName: string;
          email?: string;
        };
        project: {
          title: string;
        };
        role: {
          designation: string;
        };
        history: Array<{
          id: string;
          status: string;
          notes?: string;
          createdAt: string;
          changedBy?: {
            id: string;
            name: string;
          };
          recruiter?: {
            id: string;
            name: string;
          };
        }>;
      }>,
      { candidateId: string; projectId: string; roleNeededId: string }
    >({
      query: ({ candidateId, projectId, roleNeededId }) => ({
        url: `/processing/candidate-history/${candidateId}/${projectId}/${roleNeededId}`,
      }),
      providesTags: (_, __, { candidateId, projectId, roleNeededId }) => [
        { type: "ProcessingHistory", id: `${candidateId}-${projectId}-${roleNeededId}` },
      ],
    }),
  }),
});

export const {
  useGetProcessingCandidatesQuery,
  useLazyGetProcessingCandidatesQuery,
  useGetCandidatesToTransferQuery,
  useGetProcessingDetailQuery,
  useGetProcessingHistoryQuery,
  useUpdateProcessingStepMutation,
  useTransferToProcessingMutation,
  useGetCandidateHistoryQuery,
} = processingApi;
