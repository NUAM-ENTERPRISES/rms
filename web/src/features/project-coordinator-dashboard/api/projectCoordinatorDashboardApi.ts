import { ProjectStatusType } from "@/entities/project/constants";
import { baseApi } from "@/app/api/baseApi";

export interface CoordinatorDashboardStats {
  myClients: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  totalProjects: number;
  candidatesFilled: number;
}

export interface CoordinatorDashboardStatsResponse {
  success: boolean;
  data: CoordinatorDashboardStats;
  message: string;
}

export interface CoordinatorProjectsByStatus {
  [key in ProjectStatusType]?: number;
}

export interface CoordinatorProjectsByStatusResponse {
  success: boolean;
  data: CoordinatorProjectsByStatus;
  message: string;
}

export interface CoordinatorClientOverviewItem {
  clientId: string;
  clientName: string;
  projectCount: number;
  activeProjects: number;
  completedProjects: number;
}

export interface CoordinatorClientsOverviewResponse {
  success: boolean;
  data: CoordinatorClientOverviewItem[];
  message: string;
}

export interface CoordinatorMyProjectItem {
  projectId: string;
  projectName: string;
  clientName: string;
  status: ProjectStatusType;
}

export interface CoordinatorMyProjectsResponse {
  success: boolean;
  data: {
    projects: CoordinatorMyProjectItem[];
    pagination: {
      total: number;
      totalPages: number;
      page: number;
      limit: number;
    };
  };
  message: string;
}

export interface CoordinatorMyProjectsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CoordinatorProjectPipelineCounts {
  total: number;
  nominated: number;
  documents: number;
  interview: number;
  processing: number;
  deployed: number;
}

export interface CoordinatorPipelineStage {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface CoordinatorProjectPipelineResponse {
  success: boolean;
  data: {
    project: CoordinatorMyProjectItem;
    pipeline: CoordinatorProjectPipelineCounts;
    stages: CoordinatorPipelineStage[];
  };
  message: string;
}

export interface CoordinatorProjectPipelineParams {
  projectId: string;
}

export interface CoordinatorProjectRoleHiringStatusRole {
  role: string;
  required: number;
  filled: number;
}

export interface CoordinatorProjectRoleHiringStatusProject {
  projectId: string;
  projectName: string;
  roles: CoordinatorProjectRoleHiringStatusRole[];
}

export interface CoordinatorProjectRoleHiringStatusResponse {
  success: boolean;
  data: {
    projectRoles: CoordinatorProjectRoleHiringStatusProject[];
    pagination: {
      total: number;
      totalPages: number;
      page: number;
      limit: number;
    };
  };
  message: string;
}

export interface CoordinatorProjectRoleHiringStatusParams {
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const projectCoordinatorDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCoordinatorDashboardStats: builder.query<
      CoordinatorDashboardStatsResponse,
      void
    >({
      query: () => ({
        url: "/project-coordinator/dashboard/stats",
        method: "GET",
      }),
      providesTags: ["ProjectCoordinatorDashboard"],
    }),
    getCoordinatorProjectsByStatus: builder.query<
      CoordinatorProjectsByStatusResponse,
      void
    >({
      query: () => ({
        url: "/project-coordinator/dashboard/projects-by-status",
        method: "GET",
      }),
      providesTags: ["ProjectCoordinatorDashboard"],
    }),
    getCoordinatorClientsOverview: builder.query<
      CoordinatorClientsOverviewResponse,
      void
    >({
      query: () => ({
        url: "/project-coordinator/dashboard/clients-overview",
        method: "GET",
      }),
      providesTags: ["ProjectCoordinatorDashboard"],
    }),
    getCoordinatorMyProjects: builder.query<
      CoordinatorMyProjectsResponse,
      CoordinatorMyProjectsParams | void
    >({
      query: (params) => ({
        url: "/project-coordinator/dashboard/my-projects",
        method: "GET",
        params: params || undefined,
      }),
      providesTags: ["ProjectCoordinatorDashboard"],
    }),
    getCoordinatorProjectPipeline: builder.query<
      CoordinatorProjectPipelineResponse,
      CoordinatorProjectPipelineParams
    >({
      query: ({ projectId }) => ({
        url: "/project-coordinator/dashboard/project-pipeline",
        method: "GET",
        params: { projectId },
      }),
      providesTags: ["ProjectCoordinatorDashboard"],
    }),
    getCoordinatorProjectRoleHiringStatus: builder.query<
      CoordinatorProjectRoleHiringStatusResponse,
      CoordinatorProjectRoleHiringStatusParams | void
    >({
      query: (params) => ({
        url: "/project-coordinator/dashboard/project-role-hiring-status",
        method: "GET",
        params: params || undefined,
      }),
      providesTags: ["ProjectCoordinatorDashboard"],
    }),
  }),
});

export const {
  useGetCoordinatorDashboardStatsQuery,
  useGetCoordinatorProjectsByStatusQuery,
  useGetCoordinatorClientsOverviewQuery,
  useGetCoordinatorMyProjectsQuery,
  useGetCoordinatorProjectPipelineQuery,
  useGetCoordinatorProjectRoleHiringStatusQuery,
} = projectCoordinatorDashboardApi;
