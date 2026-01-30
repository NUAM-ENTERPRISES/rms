import { baseApi } from "@/app/api/baseApi";
import {
  ProcessingCandidateSummary,
  ProcessingHistoryEntry,
  ProcessingStepKey,
  ProcessingStepStatus,
  ProcessingStep,
  ProcessingCandidate,
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
  roleCatalogId?: string;
  status?: "assigned" | "in_progress" | "completed" | "cancelled" | "all" | "visa_stamped";
  page?: number;
  limit?: number;
};

export const processingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProcessingCandidates: builder.query<
      ApiResponse<{
        candidates: ProcessingCandidate[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>,
      { projectId: string } & ProcessingCandidatesQuery
    >({
      query: ({ projectId, ...params }) => ({
        url: `/processing/project/${projectId}`,
        params,
      }),
      providesTags: ["ProcessingSummary"],
    }),
    getAllProcessingCandidates: builder.query<
      ApiResponse<{
        candidates: ProcessingCandidate[];
        counts: {
          assigned: number;
          in_progress: number;
          completed: number;
          cancelled: number;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
        };
      }>,
      ProcessingCandidatesQuery
    >({
      query: (params) => ({
        url: "/processing/all-candidates",
        params: params ?? undefined,
      }),
      providesTags: ["ProcessingSummary"],
    }),

    // Admin endpoint: GET /processing/admin/all-candidates
    getAllProcessingCandidatesAdmin: builder.query<
      ApiResponse<{
        candidates: ProcessingCandidate[];
        counts: {
          all: number;
          assigned: number;
          in_progress: number;
          completed: number;
          cancelled: number;
          visa_stamped?: number;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages?: number;
        };
      }>,
      ProcessingCandidatesQuery & { filterType?: "visa_stamped" | "total_processing" }
    >({
      query: (params) => ({
        url: "/processing/admin/all-candidates",
        params: params ?? undefined,
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
        params: params ?? undefined,
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
      providesTags: (_, __, id) => [{ type: "Processing", id }],
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
        { type: "Processing", id: candidateProjectMapId },
        { type: "ProcessingHistory", id: candidateProjectMapId },
        "ProcessingSummary",
      ],
    }),
    transferToProcessing: builder.mutation<
      ApiResponse<any>,
      {
        candidateIds: string[];
        projectId: string;
        roleCatalogId: string;
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
        roleCatalogId: string;
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
        assignedTo?: {
          id: string;
          name: string;
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
      { candidateId: string; projectId: string; roleCatalogId: string }
    >({
      query: ({ candidateId, projectId, roleCatalogId }) => ({
        url: `/processing/candidate-history/${candidateId}/${projectId}/${roleCatalogId}`,
      }),
      providesTags: (_, __, { candidateId, projectId, roleCatalogId }) => [
        { type: "ProcessingHistory", id: `${candidateId}-${projectId}-${roleCatalogId}` },
      ],
    }),
    getCandidateProcessingDetails: builder.query<
      ApiResponse<{
        id: string;
        candidateId: string;
        projectId: string;
        roleNeededId: string;
        assignedProcessingTeamUserId: string;
        processingStatus: string;
        notes?: string;
        createdAt: string;
        updatedAt: string;
        candidate: {
          id: string;
          firstName: string;
          lastName: string;
          email?: string;
          mobileNumber?: string;
          countryCode?: string;
          dateOfBirth?: string;
          gender?: string;
          source?: string;
          totalExperience?: number;
          currentEmployer?: string | null;
          currentRole?: string | null;
          highestEducation?: string | null;
          university?: string | null;
          qualifications: Array<{
            id: string;
            candidateId: string;
            qualificationId: string;
            university?: string;
            graduationYear?: number;
            gpa?: number;
            isCompleted?: boolean;
            notes?: string;
            qualification?: {
              id: string;
              name: string;
              shortName?: string;
              level?: string;
              field?: string;
              program?: string;
              description?: string;
              isActive?: boolean;
            };
          }>;
        };
        project: {
          id: string;
          title: string;
          description?: string | null;
          country?: string | null;
        };
        role: {
          id: string;
          projectId: string;
          roleCatalogId?: string;
          designation: string;
          quantity?: number;
          priority?: string;
          minExperience?: number;
          maxExperience?: number;
          skills?: any[];
          employmentType?: string;
          visaType?: string;
          backgroundCheckRequired?: boolean;
          drugScreeningRequired?: boolean;
          genderRequirement?: string;
          minAge?: number;
          maxAge?: number;
          accommodation?: boolean;
          food?: boolean;
          transport?: boolean;
          salaryRange?: string | null;
          roleCatalog?: {
            id: string;
            name: string;
            label: string;
            shortName?: string;
            description?: string;
            isActive?: boolean;
          };
        };
        assignedTo?: {
          id: string;
          name: string;
          email?: string;
          mobileNumber?: string;
        };
        candidateProjectMap: {
          id: string;
          candidateId: string;
          projectId: string;
          roleNeededId: string;
          notes?: string;
          recruiterId?: string;
          recruiter?: {
            id: string;
            name: string;
            email?: string;
          };
          mainStatus?: {
            id: string;
            name: string;
            label: string;
            color?: string;
            order?: number;
          };
          subStatus?: {
            id: string;
            name: string;
            label: string;
            color?: string;
            order?: number;
          };
        };
      }>,
      string
    >({
      query: (processingId) => ({
        url: `/processing/candidate-processing-details/${processingId}`,
      }),
      providesTags: (_, __, id) => [{ type: "Processing", id }],
    }),

    // New: Paginated candidate documents (all project documents)
    getCandidateDocuments: builder.query<
      ApiResponse<Paginated<{
        id: string | null;
        candidateProjectMapId: string | null;
        documentId: string;
        roleCatalogId?: string | null;
        status: string;
        notes?: string | null;
        createdAt: string;
        updatedAt: string;
        document: {
          id: string;
          candidateId: string;
          docType: string;
          fileName: string;
          fileUrl: string;
          uploadedBy?: string;
          verifiedBy?: string | null;
          status: string;
          createdAt: string;
          updatedAt: string;
          fileSize?: number;
          mimeType?: string;
          roleCatalogId?: string | null;
          verifiedAt?: string | null;
        };
      }>>,
      { processingId: string; page?: number; limit?: number; search?: string }
    >({
      query: ({ processingId, page = 1, limit = 20, search }) => ({
        url: `/processing/candidate/${processingId}/all-project-documents`,
        params: { page, limit, search },
      }),
      providesTags: (_result, _error, { processingId }) => [
        { type: "ProcessingDocuments", id: processingId },
      ],
    }),

    // New: Paginated processing history for a processing candidate
    getCandidateHistoryPaginated: builder.query<
      ApiResponse<Paginated<{
        id: string;
        processingCandidateId: string;
        status: string;
        step: string;
        changedById?: string;
        recruiterId?: string;
        notes?: string | null;
        createdAt: string;
        changedBy?: { id: string; name: string };
        recruiter?: { id: string; name: string };
        assignedTo?: { id: string; name: string } | null;
      }>>,
      { processingId: string; page?: number; limit?: number; search?: string }
    >({
      query: ({ processingId, page = 1, limit = 20, search }) => ({
        url: `/processing/candidate/${processingId}/history`,
        params: { page, limit, search },
      }),
      providesTags: (_result, _error, { processingId }) => [
        { type: "ProcessingHistory", id: processingId },
      ],
    }),
  }),
});

export const {
  useGetProcessingCandidatesQuery,
  useLazyGetProcessingCandidatesQuery,
  useGetAllProcessingCandidatesQuery,
  useLazyGetAllProcessingCandidatesQuery,
  useGetAllProcessingCandidatesAdminQuery,
  useLazyGetAllProcessingCandidatesAdminQuery,
  useGetCandidatesToTransferQuery,
  useGetProcessingDetailQuery,
  useGetProcessingHistoryQuery,
  useUpdateProcessingStepMutation,
  useTransferToProcessingMutation,
  useGetCandidateHistoryQuery,
  useGetCandidateDocumentsQuery,
  useGetCandidateHistoryPaginatedQuery,
  useGetCandidateProcessingDetailsQuery,
} = processingApi;
