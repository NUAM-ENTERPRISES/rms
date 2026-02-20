import { baseApi } from "@/app/api/baseApi";

export interface ProjectOverviewParams {
  projectId: string;
  roleCatalogId?: string;
  search?: string;
  mainStatus?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ProjectOverviewResponse {
  projectTitle?: string;
  summary: {
    totalCandidates: number;
    nominatedCount: number;
    documentsCount: number;
    interviewCount: number;
    processingCount: number;
    finalCount: number;
  };
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const candidateProjectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjectOverview: builder.query<ProjectOverviewResponse, ProjectOverviewParams>({
      query: ({ projectId, ...params }) => ({
        url: `candidate-projects/project/${projectId}/overview`,
        params,
      }),
      transformResponse: (response: ApiResponse<ProjectOverviewResponse>) => response.data,
      providesTags: ["CandidateProject"],
    }),
  }),
});

export const { useGetProjectOverviewQuery } = candidateProjectsApi;
