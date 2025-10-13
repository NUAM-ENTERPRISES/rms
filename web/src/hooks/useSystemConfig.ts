import { baseApi } from "@/app/api/baseApi";

export interface RoleConfig {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  badgeConfig: {
    variant: "default" | "secondary" | "outline" | "destructive";
    priority: number;
  };
}

export interface SystemConstants {
  documentTypes: Record<string, { displayName: string; category: string }>;
  candidateStatuses: Record<string, { displayName: string; color: string }>;
}

export interface SystemConfigData {
  roles: RoleConfig[];
  roleBadgeConfig: Record<string, { variant: string; priority: number }>;
  constants: SystemConstants;
  version: string;
  lastUpdated: string;
}

export interface SystemConfigResponse {
  success: boolean;
  data: SystemConfigData;
  message: string;
}

// System Config API
export const systemConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemConfig: builder.query<SystemConfigResponse, void>({
      query: () => "/system/config",
      providesTags: ["SystemConfig"],
      keepUnusedDataFor: 3600, // 1 hour
    }),
  }),
});

// Export hooks
export const { useGetSystemConfigQuery } = systemConfigApi;

/**
 * Hook to get system configuration
 * This should be called once at app startup and cached
 */
export function useSystemConfig() {
  return useGetSystemConfigQuery();
}

/**
 * Get role badge variant from system config
 */
export function getRoleBadgeVariant(
  roleName: string,
  systemConfig: SystemConfigData | undefined
): "default" | "secondary" | "outline" | "destructive" {
  if (!roleName || typeof roleName !== "string") {
    return "outline";
  }

  if (!systemConfig) {
    // Fallback to hardcoded values if system config not loaded
    const fallbackConfig: Record<
      string,
      "default" | "secondary" | "outline" | "destructive"
    > = {
      CEO: "default",
      Director: "default",
      "System Admin": "default",
      Manager: "secondary",
      "Team Head": "secondary",
      "Team Lead": "outline",
      Recruiter: "outline",
      "Documentation Executive": "outline",
      "Processing Executive": "outline",
    };
    return fallbackConfig[roleName] || "outline";
  }

  const roleConfig = systemConfig.roleBadgeConfig[roleName];
  return (
    (roleConfig?.variant as
      | "default"
      | "secondary"
      | "outline"
      | "destructive") || "outline"
  );
}
