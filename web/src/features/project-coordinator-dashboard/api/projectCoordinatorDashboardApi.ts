import { baseApi } from "@/app/api/baseApi";

export interface CoordinatorDashboardStats {
  myClients: number;
  activeProjects: number;
  completedProjects: number;
  candidatesFilled: number;
}

export interface CoordinatorDashboardStatsResponse {
  success: boolean;
  data: CoordinatorDashboardStats;
  message: string;
}

export interface CoordinatorProjectsByStatus {
  active: number;
  completed: number;
  cancelled: number;
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

export interface CoordinatorClientProjectRole {
  name: string;
  filled: number;
  target: number;
}

export interface CoordinatorClientProjectRow {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  status: "active" | "completed" | "cancelled";
  roles: CoordinatorClientProjectRole[];
}

export interface CoordinatorClientProjectsResponse {
  success: boolean;
  data: {
    rows: CoordinatorClientProjectRow[];
    pagination: {
      total: number;
      totalPages: number;
      page: number;
      limit: number;
    };
  };
  message: string;
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

export interface CoordinatorClientProjectsParams {
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
    getCoordinatorClientProjects: builder.query<
      CoordinatorClientProjectsResponse,
      CoordinatorClientProjectsParams | void
    >({
      query: (params) => ({
        url: "/project-coordinator/dashboard/client-projects",
        method: "GET",
        params: params || undefined,
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
  useGetCoordinatorClientProjectsQuery,
  useGetCoordinatorProjectRoleHiringStatusQuery,
} = projectCoordinatorDashboardApi;
