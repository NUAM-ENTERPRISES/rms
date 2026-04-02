import { baseApi } from "@/app/api/baseApi";

export interface AdminDashboardStats {
  totalCandidates: number;
  activeClients: number;
  openJobs: number;
  candidatesPlaced: number;
}

export interface AdminDashboardStatsResponse {
  success: boolean;
  data: AdminDashboardStats;
  message: string;
}

export interface HiringTrendEntry {
  period: string;
  placed: number;
}

export interface HiringTrendData {
  daily: HiringTrendEntry[];
  monthly: HiringTrendEntry[];
  yearly: HiringTrendEntry[];
}

export interface HiringTrendResponse {
  success: boolean;
  data: HiringTrendData;
  message: string;
}

export interface TopRecruiter {
  name: string;
  role: string;
  placementsThisMonth: number;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface RecruiterActivity {
  activity: string;
  value: number;
}

export interface TopRecruiterStatsResponse {
  success: boolean;
  data: {
    topRecruiter: TopRecruiter;
    recruiterActivities: RecruiterActivity[];
  };
  message: string;
}

export interface ProjectRoleHiringStatusRole {
  role: string;
  required: number;
  filled: number;
}

export interface ProjectRoleHiringStatusProject {
  projectId: string;
  projectName: string;
  roles: ProjectRoleHiringStatusRole[];
}

export interface ProjectRoleHiringStatusResponse {
  success: boolean;
  data: {
    projectRoles: ProjectRoleHiringStatusProject[];
    pagination: {
      total: number;
      totalPages: number;
      page: number;
      limit: number;
    };
  };
  message: string;
}

export interface ProjectRoleHiringStatusParams {
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const adminDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboardStats: builder.query<AdminDashboardStatsResponse, void>({
      query: () => ({
        url: "/admin/dashboard/stats",
        method: "GET",
      }),
      providesTags: ["AdminDashboard"],
    }),
    getHiringTrend: builder.query<HiringTrendResponse, void>({
      query: () => ({
        url: "/admin/dashboard/hiring-trend",
        method: "GET",
      }),
      providesTags: ["AdminDashboard"],
    }),

    getProjectRoleHiringStatus: builder.query<
      ProjectRoleHiringStatusResponse,
      ProjectRoleHiringStatusParams | void
    >({
      query: (params) => ({
        url: "/admin/dashboard/project-role-hiring-status",
        method: "GET",
        params: params || undefined,
      }),
      providesTags: ["AdminDashboard"],
    }),
    getTopRecruiterStats: builder.query<TopRecruiterStatsResponse, { year?: number; month?: number }>({
      query: (params) => ({
        url: "/admin/dashboard/top-recruiter-stats",
        method: "GET",
        params: {
          ...(params.year && { year: params.year }),
          ...(params.month && { month: params.month }),
        },
      }),
      providesTags: ["AdminDashboard"],
    }),
  }),
});

export const {
  useGetAdminDashboardStatsQuery,
  useGetHiringTrendQuery,
  useGetProjectRoleHiringStatusQuery,
  useGetTopRecruiterStatsQuery,
} = adminDashboardApi;
