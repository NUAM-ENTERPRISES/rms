import { baseApi } from "@/app/api/baseApi";

interface RecruiterBasic {
  id: string;
  name: string;
  email: string;
}

interface ActivityBreakdownItem {
  activity: string;
  value: number;
}

interface ActivityBreakdownResponse {
  success: boolean;
  data: {
    recruiter: RecruiterBasic;
    placements: number;
    activityBreakdown: ActivityBreakdownItem[];
  };
  message: string;
}

interface FollowupStatusItem {
  status: string;
  count: number;
}

interface FollowupStatusResponse {
  success: boolean;
  data: {
    recruiter: RecruiterBasic;
    followupStatuses: FollowupStatusItem[];
    total: number;
  };
  message: string;
}

interface RecruitersListResponse {
  success: boolean;
  data: RecruiterBasic[];
  message: string;
}

interface PerformanceStagesResponse {
  success: boolean;
  data: {
    period: 'weekly' | 'monthly';
    stages: Record<string, number | string>[];
  };
  message: string;
}

interface RecruiterCandidate {
  id: string;
  fullName: string;
  candidateCode?: string | null;
  phone: string;
  email: string;
  status: string;
  projectCount: number;
  source: string;
  createdBy: string;
  profileImage: string;
}

interface RecruiterCandidatesResponse {
  success: boolean;
  data: {
    candidates: RecruiterCandidate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
}

export const recruiterAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRecruitersList: builder.query<RecruitersListResponse, void>({
      query: () => "/analytics/recruiter/list",
      providesTags: ["RecruiterAnalytics"],
    }),

    getRecruiterActivityBreakdown: builder.query<
      ActivityBreakdownResponse,
      { recruiterId: string; year?: number }
    >({
      query: ({ recruiterId, year }) => ({
        url: "/analytics/recruiter/activity-breakdown",
        params: { recruiterId, ...(year ? { year } : {}) },
      }),
      providesTags: (_result, _error, { recruiterId }) => [
        { type: "RecruiterAnalytics", id: `activity-${recruiterId}` },
      ],
    }),

    getRecruiterFollowupStatus: builder.query<
      FollowupStatusResponse,
      { recruiterId: string; year?: number }
    >({
      query: ({ recruiterId, year }) => ({
        url: "/analytics/recruiter/followup-status",
        params: { recruiterId, ...(year ? { year } : {}) },
      }),
      providesTags: (_result, _error, { recruiterId }) => [
        { type: "RecruiterAnalytics", id: `followup-${recruiterId}` },
      ],
    }),

    getRecruiterPerformanceStages: builder.query<
      PerformanceStagesResponse,
      { recruiterId: string; period?: 'weekly' | 'monthly' }
    >({
      query: ({ recruiterId, period }) => ({
        url: "/analytics/recruiter/performance-stages",
        params: { recruiterId, ...(period ? { period } : {}) },
      }),
      providesTags: (_result, _error, { recruiterId }) => [
        { type: "RecruiterAnalytics", id: `stages-${recruiterId}` },
      ],
    }),

    getRecruiterCandidates: builder.query<
      RecruiterCandidatesResponse,
      { recruiterId: string; search?: string; page?: number; limit?: number }
    >({
      query: ({ recruiterId, search, page, limit }) => ({
        url: "/analytics/recruiter/candidates",
        params: {
          recruiterId,
          ...(search ? { search } : {}),
          ...(page ? { page } : {}),
          ...(limit ? { limit } : {}),
        },
      }),
      providesTags: (_result, _error, { recruiterId }) => [
        { type: "RecruiterAnalytics", id: `candidates-${recruiterId}` },
      ],
    }),
  }),
});

export const {
  useGetRecruitersListQuery,
  useGetRecruiterActivityBreakdownQuery,
  useGetRecruiterFollowupStatusQuery,
  useGetRecruiterPerformanceStagesQuery,
  useGetRecruiterCandidatesQuery,
} = recruiterAnalyticsApi;
