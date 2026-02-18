import { baseApi } from "@/app/api/baseApi";

// Interview interfaces
export interface Interview {
  id: string;
  scheduledTime: string;
  duration: number;
  type: string;
  mode: string;
  // Server includes a convenience flag when an interview is past due
  expired?: boolean;
  meetingLink?: string;
  interviewer?: string;
  interviewerEmail?: string;
  outcome?: string;
  notes?: string;
  // Top-level shortcuts: some endpoints include the candidate & role directly
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    profileImage?: string;
    mobileNumber?: string;
    qualifications?: Array<{
      id: string;
      university?: string | null;
      graduationYear?: number | null;
      gpa?: number | null;
      isCompleted?: boolean;
      qualification?: { id?: string; name?: string; shortName?: string; level?: string } | null;
    }>;
    workExperiences?: Array<{
      id: string;
      companyName?: string;
      jobTitle?: string;
      startDate?: string | null;
      endDate?: string | null;
      isCurrent?: boolean;
      description?: string | null;
    }>;
  };
  roleNeeded?: { id?: string; designation?: string };

  // Full candidate-project mapping object (when available)
  candidateProjectMap?: {
    id: string;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      profileImage?: string;
      mobileNumber?: string;
      qualifications?: Array<{
        id: string;
        university?: string | null;
        graduationYear?: number | null;
        gpa?: number | null;
        isCompleted?: boolean;
        qualification?: { id?: string; name?: string; shortName?: string; level?: string } | null;
      }>;
      workExperiences?: Array<{
        id: string;
        companyName?: string;
        jobTitle?: string;
        startDate?: string | null;
        endDate?: string | null;
        isCurrent?: boolean;
        description?: string | null;
      }>;
    };
    project: {
      id: string;
      title: string;
      client?: { id?: string; name?: string; email?: string; phone?: string } | null;
      countryCode?: string | null;
      requiredScreening?: boolean | null;
      resumeEditable?: boolean | null;
      createdBy?: string | null;
    };
    roleNeeded?: { id?: string; designation?: string; minExperience?: number | null; maxExperience?: number | null; employmentType?: string | null; backgroundCheckRequired?: boolean | null; additionalRequirements?: string | null; salaryRange?: any | null; roleCatalog?: { id?: string; name?: string; label?: string; shortName?: string } | null };
    recruiter?: { id?: string; name?: string; email?: string };
    mainStatus?: { id?: string; name?: string; label?: string } | null;
    subStatus?: { id?: string; name?: string; label?: string } | null;
    assignedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    latestForward?: { id?: string; sentAt?: string; sender?: { id?: string; name?: string; email?: string } } | null;
  };
  project?: {
    id: string;
    title: string;
  };
}

export interface CreateInterviewRequest {
  candidateProjectMapId?: string;
  projectId?: string;
  scheduledTime: string;
  duration?: number;
  type?: string;
  mode?: string;
  meetingLink?: string;
  interviewerEmail?: string;
  notes?: string;
}

export interface UpdateInterviewRequest {
  scheduledTime?: string;
  duration?: number;
  type?: string;
  mode?: string;
  meetingLink?: string;
  interviewerEmail?: string;
  outcome?: string;
  notes?: string;
}

export interface QueryInterviewsRequest {
  search?: string;
  type?: string;
  mode?: string;
  status?: string;
  projectId?: string;
  roleCatalogId?: string;
  candidateId?: string;
  page?: number;
  limit?: number;
}

export interface QueryUpcomingInterviewsRequest {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  candidateId?: string;
  recruiterId?: string;
  roleCatalogId?: string;
  startDate?: string;
  endDate?: string;
}

export interface QueryAssignedInterviewsRequest {
  page?: number;
  limit?: number;
  projectId?: string;
  roleCatalogId?: string;
  candidateId?: string;
  recruiterId?: string;
  search?: string;
}

export interface QueryShortlistPendingRequest {
  page?: number;
  limit?: number;
  projectId?: string;
  roleCatalogId?: string;
  search?: string;
}



export interface AssignedInterviewItem {
  id: string;
  candidate?: { id: string; firstName?: string; lastName?: string; email?: string; profileImage?: string; mobileNumber?: string; qualifications?: Array<{ id: string; university?: string | null; graduationYear?: number | null; gpa?: number | null; isCompleted?: boolean; qualification?: { id?: string; name?: string; shortName?: string; level?: string } | null }>; workExperiences?: Array<{ id: string; companyName?: string; jobTitle?: string; startDate?: string | null; endDate?: string | null; isCurrent?: boolean; description?: string | null }>; };
  project?: { id: string; title?: string };
  roleNeeded?: { id?: string; designation?: string };
  recruiter?: { id?: string; name?: string; email?: string };
  mainStatus?: any;
  subStatus?: any;
  assignedAt?: string;
  scheduledTime?: string;
  mode?: string;
  // Optionally include the expanded candidateProjectMap for consistency with Interview
  candidateProjectMap?: {
    id: string;
    candidate: { id: string; firstName?: string; lastName?: string; email?: string; profileImage?: string; mobileNumber?: string; qualifications?: Array<{ id: string; university?: string | null; graduationYear?: number | null; gpa?: number | null; isCompleted?: boolean; qualification?: { id?: string; name?: string; shortName?: string; level?: string } | null }>; workExperiences?: Array<{ id: string; companyName?: string; jobTitle?: string; startDate?: string | null; endDate?: string | null; isCurrent?: boolean; description?: string | null }>; };
    project: { id: string; title?: string };
    roleNeeded?: { id?: string; designation?: string };
    recruiter?: { id?: string; name?: string; email?: string };
    mainStatus?: any;
    subStatus?: any;
  };
  // convenience flag may be returned for lists
  expired?: boolean;
}

// Interview API endpoints
export const interviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInterviews: builder.query<
      { success: boolean; data: { interviews: Interview[]; pagination: any } },
      QueryInterviewsRequest
    >({
      query: (params) => ({
        url: "/interviews",
        params,
      }),
      providesTags: ["Interview"],
    }),

    getInterview: builder.query<{ success: boolean; data: Interview }, string>({
      query: (id) => `/interviews/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Interview", id }],
    }),

    createInterview: builder.mutation<
      { success: boolean; data: Interview; message: string },
      CreateInterviewRequest | CreateInterviewRequest[]
    >({
      query: (body) => ({
        url: "/interviews",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Interview"],
    }),

    createBulkInterviews: builder.mutation<
      { success: boolean; data: Interview[]; message: string },
      CreateInterviewRequest[]
    >({
      query: (body) => ({
        url: "/interviews",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Interview"],
    }),

    updateInterview: builder.mutation<
      { success: boolean; data: Interview; message: string },
      { id: string; data: UpdateInterviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/interviews/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Interview", id },
        "Interview",
      ],
    }),

    deleteInterview: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/interviews/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Interview", id },
        "Interview",
      ],
    }),

    getAssignedInterviews: builder.query<
      { success: boolean; data: { items: AssignedInterviewItem[]; pagination: any }; message?: string },
      QueryAssignedInterviewsRequest
    >({
      query: (params) => ({
        url: "/interviews/assigned-interviews",
        params,
      }),
      providesTags: ["Interview"],
    }),

    getUpcomingInterviews: builder.query<
      { success: boolean; data: { interviews: Interview[]; pagination: any } },
      QueryUpcomingInterviewsRequest
    >({
      query: (params) => ({
        url: "/interviews/upcoming",
        params,
      }),
      providesTags: ["Interview"],
    }),

    getShortlistPending: builder.query<
      { success: boolean; data: { items: any[]; pagination: any }; message?: string },
      QueryShortlistPendingRequest
    >({
      query: (params) => ({
        url: "/interviews/shortlist-pending",
        params,
      }),
      providesTags: ["Interview"],
    }),

    getShortlisted: builder.query<
      { success: boolean; data: { items: any[]; pagination: any }; message?: string },
      QueryShortlistPendingRequest
    >({
      query: (params) => ({
        url: "/interviews/shortlisted",
        params,
      }),
      providesTags: ["Interview"],
    }),

    getNotShortlisted: builder.query<
      { success: boolean; data: { items: any[]; pagination: any }; message?: string },
      QueryShortlistPendingRequest
    >({
      query: (params) => ({
        url: "/interviews/not-shortlisted",
        params,
      }),
      providesTags: ["Interview"],
    }),

    /**
     * Update candidate project status
     * PATCH /candidate-projects/:id/status
     */
    updateCandidateProjectStatus: builder.mutation<
      { success: boolean; data: any; message?: string },
      { id: string; data: { mainStatusName?: string; subStatusName?: string; reason?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/candidate-projects/${id}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Interview"],
    }),

    /**
     * Single client decision
     * PATCH /interviews/client-decision/:id
     */
    updateClientDecision: builder.mutation<
      { success: boolean; data: any; message?: string },
      { id: string; data: { decision: 'shortlisted' | 'not_shortlisted'; notes?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/interviews/client-decision/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ["Interview"],
    }),

    /**
     * Bulk client decision
     * PATCH /interviews/client-decision
     */
    updateBulkClientDecision: builder.mutation<
      { success: boolean; data: Array<any>; message?: string },
      { updates: { id: string; decision: 'shortlisted' | 'not_shortlisted'; notes?: string }[] }
    >({
      query: (body) => ({
        url: `/interviews/client-decision`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ["Interview"],
    }),

   

    /**
     * Update interview status (separate endpoint)
     * PATCH /interviews/:id/status
     */
    updateInterviewStatus: builder.mutation<
      { success: boolean; data: Interview; message?: string },
      { id: string; data: { interviewStatus?: string; subStatus?: string; reason?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/interviews/${id}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Interview", id }, "Interview"],
    }),

    /**
     * Update bulk interview status
     * PATCH /interviews/status
     */
    updateBulkInterviewStatus: builder.mutation<
      { success: boolean; data: Interview[]; message?: string },
      { updates: { id: string; interviewStatus?: string; subStatus?: string; reason?: string }[] }
    >({
      query: (body) => ({
        url: "/interviews/status",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Interview"],
    }),

    /**
     * Get interview history: GET /interviews/:id/history
     */
    getInterviewHistory: builder.query<
      { success: boolean; data: any[]; message?: string },
      string
    >({
      query: (id) => ({ url: `/interviews/${id}/history` }),
      providesTags: (_result, _error, id) => [{ type: "Interview", id }],
    }),

    /**
     * Dashboard data for interview overview
     * GET /interviews/dashboard
     */
    getInterviewsDashboard: builder.query<
      { success: true; data: { thisWeek: { count: number }; thisMonth: { completedCount: number; passedCount: number; passRate: number } }; message: string },
      void
    >({
      query: () => ({ url: "/interviews/dashboard" }),
      providesTags: ["Interview"],
    }),
  }),
});

export const {
  useGetInterviewsQuery,
  useGetInterviewQuery,
  useGetInterviewHistoryQuery,
  useCreateInterviewMutation,
  useCreateBulkInterviewsMutation,
  useUpdateInterviewMutation,
  useUpdateBulkInterviewStatusMutation,
  useDeleteInterviewMutation,
  useUpdateInterviewStatusMutation,
  useGetAssignedInterviewsQuery,
  useGetUpcomingInterviewsQuery,
  useGetShortlistPendingQuery,
  useGetShortlistedQuery,
  useGetNotShortlistedQuery,
  useUpdateCandidateProjectStatusMutation,
  useUpdateClientDecisionMutation,
  useUpdateBulkClientDecisionMutation,
  useGetInterviewsDashboardQuery,
} = interviewsApi;
