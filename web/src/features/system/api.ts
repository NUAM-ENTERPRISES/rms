import { baseApi } from "@/app/api/baseApi";

// ==================== INTERFACES ====================

export interface DocumentTypeMeta {
  displayName: string;
  description: string;
  category:
    | "identity"
    | "professional"
    | "educational"
    | "employment"
    | "verification"
    | "medical"
    | "other";
  hasExpiry: boolean;
  expiryRequired: boolean;
  maxSizeMB: number;
  allowedFormats: string[];
  commonlyRequired: boolean;
}

export interface CandidateStatus {
  displayName: string;
  color: string;
}

export interface SystemConstants {
  documentTypes: Record<string, DocumentTypeMeta>;
  candidateStatuses: Record<string, CandidateStatus>;
}

export interface SystemConfigData {
  roles: Array<{
    id: string;
    name: string;
    description: string;
    permissions: string[];
    badgeConfig: {
      variant: string;
      priority: number;
    };
  }>;
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

// ==================== API ====================

export const systemApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemConfig: builder.query<SystemConfigResponse, void>({
      query: () => "/system/config",
      providesTags: ["SystemConfig"],
    }),
  }),
});

export const { useGetSystemConfigQuery } = systemApi;
