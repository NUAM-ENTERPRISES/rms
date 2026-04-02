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
  useGetTopRecruiterStatsQuery,
} = adminDashboardApi;
