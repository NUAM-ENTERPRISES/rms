import { baseApi } from "@/app/api/baseApi";

export interface ProjectOverviewParams {
  projectId: string;
  roleCatalogId?: string;
  search?: string;
  mainStatus?: string;
  subStatus?: string;
  subStatuses?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  gender?: string;
  countries?: string;
  visaTypes?: string;
  sectors?: string;
  qualification?: string;
  minExp?: number;
  maxExp?: number;
  minAge?: number;
  maxAge?: number;
}

export type ProjectOverviewSubStatusTile = {
  key: string;
  label: string;
  count: number;
  subStatusName: string;
};

export interface ProjectOverviewResponse {
  projectTitle?: string;
  summary: {
    totalCandidates: number;
    nominatedCount: number;
    documentsCount: number;
    interviewCount: number;
    processingCount: number;
    finalCount: number;
    documentsSubStatus?: { tiles: ProjectOverviewSubStatusTile[] };
    interviewSubStatus?: { tiles: ProjectOverviewSubStatusTile[] };
    processingSubStatus?: { tiles: ProjectOverviewSubStatusTile[] };
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
      providesTags: (result, error, { projectId }) => [
        "CandidateProject",
        "ProjectCandidates",
        { type: "Project", id: projectId },
      ],
    }),
  }),
});

export const { useGetProjectOverviewQuery } = candidateProjectsApi;
