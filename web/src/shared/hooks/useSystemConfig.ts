import { useQuery } from "@reduxjs/toolkit/query/react";
import { baseApi } from "@/app/api/baseApi";

// Define the system config types
export interface SystemConfigData {
  roles: Array<{
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    badgeConfig: {
      variant: "default" | "secondary" | "outline" | "destructive";
      priority: number;
    };
  }>;
  roleBadgeConfig: Record<string, { variant: string; priority: number }>;
  constants: {
    documentTypes: Record<string, { displayName: string; category: string }>;
    candidateStatuses: Record<string, { displayName: string; color: string }>;
    religions: Array<{ id: string; name: string }>;
    indianStates: Array<{ id: string; name: string; code: string }>;
  };
  version: string;
  lastUpdated: string;
}

export interface SystemConfigResponse {
  success: boolean;
  data: SystemConfigData;
  message: string;
}

// Inject the system config endpoint
export const systemConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemConfig: builder.query<SystemConfigResponse, string | void>({
      query: (parts) => ({
        url: "/system/config",
        params: parts ? { parts } : undefined,
      }),
      providesTags: ["SystemConfig"],
    }),
  }),
});

export const { useGetSystemConfigQuery } = systemConfigApi;
