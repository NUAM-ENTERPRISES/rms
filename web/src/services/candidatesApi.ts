import { baseApi } from "@/app/api/baseApi";

interface Candidate {
  id: string;
  name: string;
  contact: string;
  email?: string;
  source: string;
  dateOfBirth?: string;
  currentStatus: string;
  experience?: number;
  skills: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };

  // Referral fields
  referralCompanyName?: string | null;
  referralEmail?: string | null;
  referralCountryCode?: string | null;
  referralPhone?: string | null;
  referralDescription?: string | null;

  projects: CandidateProjectMap[];
} 

interface CandidateProjectMap {
  id: string;
  projectId: string;
  candidateId: string;
  status: string;
  nominatedDate: string;
  nominatedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  documentsSubmittedDate?: string;
  documentsVerifiedDate?: string;
  selectedDate?: string;
  hiredDate?: string;
  notes?: string;
  rejectionReason?: string;
  project: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
}

interface CreateCandidateRequest {
  name: string;
  contact: string;
  email?: string;
  source?: string;
  dateOfBirth?: string;
  experience?: number;
  skills?: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;

  referralCompanyName?: string;
  referralEmail?: string;
  referralCountryCode?: string;
  referralPhone?: string;
  referralDescription?: string;
}

interface UpdateCandidateRequest {
  id: string;
  name?: string;
  contact?: string;
  email?: string;
  currentStatus?: string;
  experience?: number;
  skills?: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;

  referralCompanyName?: string | null;
  referralEmail?: string | null;
  referralCountryCode?: string | null;
  referralPhone?: string | null;
  referralDescription?: string | null;
}

interface GetMyAssignedCandidatesParams {
  search?: string;
  currentStatus?: number;
  page?: number;
  limit?: number;
}

interface PaginatedCandidatesResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MyAssignedCandidatesApiResponse {
  success: boolean;
  data: {
    candidates: Candidate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}

export const candidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidates: builder.query<Candidate[], void>({
      query: () => "/candidates",
      providesTags: ["Candidate"],
    }),
    getMyAssignedCandidates: builder.query<
      PaginatedCandidatesResponse,
      GetMyAssignedCandidatesParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.currentStatus) queryParams.append("currentStatus", params.currentStatus.toString());
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());
        
        return `/candidates/my-assigned?${queryParams.toString()}`;
      },
      transformResponse: (response: MyAssignedCandidatesApiResponse) => ({
        data: response.data.candidates,
        total: response.data.pagination.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        totalPages: response.data.pagination.totalPages,
      }),
      providesTags: ["Candidate"],
    }),
    getCandidateById: builder.query<Candidate, string>({
      query: (id) => `/candidates/${id}`,
      providesTags: (_, __, id) => [{ type: "Candidate", id }],
    }),
    createCandidate: builder.mutation<Candidate, CreateCandidateRequest>({
      query: (candidateData) => ({
        url: "/candidates",
        method: "POST",
        body: candidateData,
      }),
      invalidatesTags: ["Candidate"],
    }),
    updateCandidate: builder.mutation<Candidate, UpdateCandidateRequest>({
      query: ({ id, ...candidateData }) => ({
        url: `/candidates/${id}`,
        method: "PATCH",
        body: candidateData,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "Candidate", id },
        "Candidate",
      ],
    }),
    deleteCandidate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Candidate"],
    }),
    assignToProject: builder.mutation<
      { success: boolean; data: any; message: string },
      { candidateId: string; projectId: string; roleNeededId?: string; recruiterId?: string; notes?: string }
    >({
      query: ({ candidateId, projectId, roleNeededId, recruiterId, notes }) => ({
        url: `/candidates/${candidateId}/assign-project`,
        method: "POST",
        body: { projectId, roleNeededId, recruiterId, notes },
      }),
      invalidatesTags: ["Candidate"],
    }),

    nominateCandidate: builder.mutation<
      { success: boolean; data: CandidateProjectMap; message: string },
      { candidateId: string; projectId: string; notes?: string }
    >({
      query: ({ candidateId, ...nominationData }) => ({
        url: `/candidates/${candidateId}/nominate`,
        method: "POST",
        body: nominationData,
      }),
      invalidatesTags: ["Candidate"],
    }),

    approveOrRejectCandidate: builder.mutation<
      { success: boolean; data: CandidateProjectMap; message: string },
      {
        candidateProjectMapId: string;
        action: "approve" | "reject";
        notes?: string;
        rejectionReason?: string;
      }
    >({
      query: ({ candidateProjectMapId, ...approvalData }) => ({
        url: `/candidates/project-mapping/${candidateProjectMapId}/approve`,
        method: "POST",
        body: approvalData,
      }),
      invalidatesTags: ["Candidate"],
    }),

    getEligibleCandidates: builder.query<
      { success: boolean; data: Candidate[] },
      string
    >({
      query: (projectId) => `/projects/${projectId}/eligible-candidates?limit=10`,
      providesTags: ["Candidate"],
    }),

    getCandidateStatuses: builder.query<
      { success: boolean; data: Array<{ id: string; statusName: string }> },
      void
    >({
      query: () => "/candidate-status",
    }),

    getCandidateStatusHistory: builder.query<
      {
        success: boolean;
        data: {
          candidate: {
            id: string;
            name: string;
            currentStatus: {
              id: number;
              statusName: string;
            };
          };
          history: Array<{
            id: string;
            candidateId: string;
            statusId: number;
            statusNameSnapshot: string;
            changedById: string;
            changedByName: string;
            statusUpdatedAt: string;
            notificationCount: number;
            reason?: string;
            createdAt: string;
          }>;
          totalEntries: number;
        };
        message: string;
      },
      string
    >({
      query: (candidateId) => `/candidate-status-history/candidate/${candidateId}`,
      providesTags: (_, __, candidateId) => [
        { type: "Candidate", id: candidateId },
      ],
    }),
    getCandidateStatusPipeline: builder.query<
      {
        success: boolean;
        data: {
          candidate: {
            id: string;
            name: string;
            currentStatus: {
              id: number;
              statusName: string;
            };
          };
          pipeline: Array<{
            step: number;
            statusId: number;
            statusName: string;
            enteredAt: string;
            exitedAt: string | null;
            durationInDays: number;
            changedBy: string;
            reason?: string;
            notificationsSent: number;
            isCurrentStatus: boolean;
          }>;
          summary: {
            totalSteps: number;
            totalDuration: number;
            averageDurationPerStatus: number;
            totalNotifications: number;
          };
        };
        message: string;
      },
      string
    >({
      query: (candidateId) => `/candidate-status-history/candidate/${candidateId}/pipeline`,
      providesTags: (_, __, candidateId) => [
        { type: "Candidate", id: candidateId },
      ],
    }),
  }),
});

export const {
  useGetCandidatesQuery,
  useGetMyAssignedCandidatesQuery,
  useGetCandidateByIdQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useAssignToProjectMutation,
  useNominateCandidateMutation,
  useApproveOrRejectCandidateMutation,
  useGetEligibleCandidatesQuery,
  useGetCandidateStatusesQuery,
  useGetCandidateStatusHistoryQuery,
  useGetCandidateStatusPipelineQuery,
} = candidatesApi;
