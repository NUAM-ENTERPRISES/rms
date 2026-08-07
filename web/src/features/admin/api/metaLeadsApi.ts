import { baseApi } from "@/app/api/baseApi";

export type MetaLeadStatus =
  | "pending"
  | "linked"
  | "skipped"
  | "fraud"
  | "review"
  | "processed";

export type MetaLeadPlatformFilter =
  | "all"
  | "meta"
  | "instagram"
  | "messenger"
  | "whatsapp";

export interface MetaLeadCandidateSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  candidateCode: string | null;
}

export interface MetaLeadHistoryItem {
  id: string;
  leadId: string | null;
  formId: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  status: MetaLeadStatus;
  platform: string | null;
  source: string | null;
  shortCode: string | null;
  senderId: string | null;
  candidateId: string | null;
  processingNote: string | null;
  formSubmissionTime: string | null;
  createdAt: string;
  processedAt: string | null;
  candidate: MetaLeadCandidateSummary | null;
}

export interface MetaLeadsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MetaLeadsPlatformCounts {
  total: number;
  meta: number;
  instagram: number;
  messenger: number;
  whatsapp: number;
}

export interface MetaLeadsHistoryQuery {
  page?: number;
  limit?: number;
  status?: MetaLeadStatus | "all";
  platform?: MetaLeadPlatformFilter;
  search?: string;
}

export interface MetaLeadsHistoryResponse {
  statusCode: number;
  message: string;
  data: {
    items: MetaLeadHistoryItem[];
    pagination: MetaLeadsPagination;
    platformCounts: MetaLeadsPlatformCounts;
  };
}

export const metaLeadsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMetaLeadsHistory: builder.query<
      MetaLeadsHistoryResponse,
      MetaLeadsHistoryQuery | void
    >({
      query: (params) => {
        const searchParams: Record<string, string | number> = {};
        if (params?.page) searchParams.page = params.page;
        if (params?.limit) searchParams.limit = params.limit;
        if (params?.search?.trim()) searchParams.search = params.search.trim();
        if (params?.status && params.status !== "all") {
          searchParams.status = params.status;
        }
        if (params?.platform && params.platform !== "all") {
          searchParams.platform = params.platform;
        }
        return {
          url: "/meta/leads",
          method: "GET",
          params: searchParams,
        };
      },
      providesTags: ["SystemConfig"],
    }),
  }),
});

export const { useGetMetaLeadsHistoryQuery } = metaLeadsApi;
