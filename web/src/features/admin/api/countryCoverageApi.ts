import { baseApi } from "@/app/api/baseApi";

export type CountryCoverageGroup = "all" | "gcc";
export type CountryCoverageSector = "HEALTHCARE" | "NON_HEALTH_CARE";

export interface CountryCoverageSummaryItem {
  code: string;
  name: string;
  userCount: number;
  healthcareCount: number;
  nonHealthcareCount: number;
  isGcc: boolean;
}

export interface GccCoverageSummary {
  code: "GCC";
  name: string;
  userCount: number;
  healthcareCount: number;
  nonHealthcareCount: number;
  countryCodes: string[];
}

export interface CountryCoveragePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CountryCoverageSummaryResponse {
  success: boolean;
  data: {
    countries: CountryCoverageSummaryItem[];
    gcc: GccCoverageSummary;
    pagination: CountryCoveragePagination;
  };
  message: string;
}

export interface CountryCoverageUser {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
  mobileNumber?: string;
  phoneCountryCode?: string;
  accountStatus: "ACTIVE" | "INACTIVE" | "BLOCKED";
  roles: string[];
  sectorScopes: CountryCoverageSector[];
  coveredCountryCodes?: string[];
}

export interface CountryCoverageBreakdownItem {
  code: string;
  name: string;
  userCount: number;
}

export interface CountryCoverageSectorSummary {
  userCount: number;
  healthcareCount: number;
  nonHealthcareCount: number;
}

export interface CountryCoverageUsersResponse {
  success: boolean;
  data: {
    country: { code: string; name: string };
    users: CountryCoverageUser[];
    summary?: CountryCoverageSectorSummary;
    countryBreakdown?: CountryCoverageBreakdownItem[];
    uniqueUserCount?: number;
    pagination: CountryCoveragePagination;
  };
  message: string;
}

export interface QueryCountryCoverageParams {
  group?: CountryCoverageGroup;
  search?: string;
  countryCode?: string;
  sector?: CountryCoverageSector;
  page?: number;
  limit?: number;
}

export interface QueryCountryCoverageUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  sector?: CountryCoverageSector;
  coveredCountry?: string;
}

export interface TransferProfessionScope {
  id: string;
  label: string;
  sector: "HEALTHCARE" | "NON_HEALTH_CARE" | null;
}

export interface TransferPreviewCandidate {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  mobileNumber: string | null;
  phoneCountryCode: string | null;
  profileImage: string | null;
  statusName: string;
  professionTypeId: string;
  professionLabel: string;
  sector: "HEALTHCARE" | "NON_HEALTH_CARE" | null;
}

export interface PositiveCandidateProfession {
  id: string;
  professionTypeId: string;
  professionLabel: string;
  sector: "HEALTHCARE" | "NON_HEALTH_CARE" | null;
}

export interface TransferPreviewPeer {
  id: string;
  name: string;
  email: string;
  mobileNumber: string | null;
  phoneCountryCode: string | null;
  profileImage: string | null;
  positiveCandidateCount: number;
  coveredCountryCodes: string[];
  professionScopes: TransferProfessionScope[];
  sectorScopes: Array<"HEALTHCARE" | "NON_HEALTH_CARE">;
  handlesAllProfessions?: boolean;
  recruiterSectorScope?: "HEALTHCARE" | "NON_HEALTH_CARE" | "BOTH" | null;
}

export interface TransferPreviewCoverage {
  countryCode: string;
  countryName: string;
  sectorScopes: CountryCoverageSector[];
}

export interface CountryCoverageTransferPreviewResponse {
  success: boolean;
  data: {
    sourceUser: { id: string; name: string; email: string };
    sourceCountryCode: string;
    sourceCountryCodes: string[];
    positiveCandidates: TransferPreviewCandidate[];
    positiveCandidateProfessions: PositiveCandidateProfession[];
    currentCoverages: TransferPreviewCoverage[];
    requiresCandidateHandoff: boolean;
    pagination: CountryCoveragePagination;
  };
  message: string;
}

export interface CountryCoverageTransferPeersResponse {
  success: boolean;
  data: {
    peers: TransferPreviewPeer[];
    pagination: CountryCoveragePagination;
  };
  message: string;
}

export interface TransferCountryCoverageAssignment {
  targetRecruiterId: string;
  candidateIds: string[];
}

export interface TransferCountryCoverageRequest {
  sourceCountryCode: string;
  userId: string;
  destinationCountryCode: string;
  assignments?: TransferCountryCoverageAssignment[];
  evenSplitAcrossRecruiterIds?: string[];
  reason: string;
}

export interface TransferCountryCoverageResponse {
  success: boolean;
  data: {
    sourceUserId: string;
    destinationCountryCode: string;
    destinationCountryName: string;
    destinationCountryCodes?: string[];
    assignments: Array<{
      targetRecruiterId: string;
      targetRecruiterName: string;
      transferredCandidateCount: number;
    }>;
    transferredCandidateCount: number;
    removedCountryCodes: string[];
  };
  message: string;
}

export interface CountryCoverageTransferHistoryCandidate {
  candidateId: string;
  candidateName: string;
  statusName: string;
  fromRecruiter: { id: string; name: string };
  toRecruiter: { id: string; name: string };
}

export interface CountryCoverageTransferHistoryItem {
  id: string;
  createdAt: string;
  reason: string;
  transferMode: "auto_split" | "manual" | "coverage_only" | string;
  candidateCount: number;
  sourceUser: { id: string; name: string };
  transferredBy: { id: string; name: string };
  sourceCountryCode: string;
  sourceCountryCodes: string[];
  destinationCountryCode: string;
  destinationCountryCodes: string[];
}

export interface CountryCoverageTransferHistoryResponse {
  success: boolean;
  data: {
    items: CountryCoverageTransferHistoryItem[];
    pagination: CountryCoveragePagination;
  };
  message: string;
}

export interface CountryCoverageTransferHistoryCandidatesResponse {
  success: boolean;
  data: {
    transferId: string;
    createdAt: string;
    candidateCount: number;
    items: CountryCoverageTransferHistoryCandidate[];
    pagination: CountryCoveragePagination;
  };
  message: string;
}

export const COUNTRY_COVERAGE_PAGE_SIZE = 15;

export const countryCoverageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCountryCoverageSummary: builder.query<
      CountryCoverageSummaryResponse,
      QueryCountryCoverageParams | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.group) searchParams.set("group", params.group);
        if (params?.search) searchParams.set("search", params.search);
        if (params?.countryCode) searchParams.set("countryCode", params.countryCode);
        if (params?.sector) searchParams.set("sector", params.sector);
        if (params?.page != null) searchParams.set("page", String(params.page));
        if (params?.limit != null) searchParams.set("limit", String(params.limit));
        const qs = searchParams.toString();
        return {
          url: `/country-coverage${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["CountryCoverage"],
    }),

    getCountryCoverageUsers: builder.query<
      CountryCoverageUsersResponse,
      { countryCode: string } & QueryCountryCoverageUsersParams
    >({
      query: ({ countryCode, ...params }) => {
        const searchParams = new URLSearchParams();
        if (params.page != null) searchParams.set("page", String(params.page));
        if (params.limit != null) searchParams.set("limit", String(params.limit));
        if (params.search) searchParams.set("search", params.search);
        if (params.sector) searchParams.set("sector", params.sector);
        if (params.coveredCountry)
          searchParams.set("coveredCountry", params.coveredCountry);
        const qs = searchParams.toString();
        return {
          url: `/country-coverage/${encodeURIComponent(countryCode)}/users${
            qs ? `?${qs}` : ""
          }`,
          method: "GET",
        };
      },
      providesTags: ["CountryCoverage"],
    }),

    getCountryCoverageTransferPreview: builder.query<
      CountryCoverageTransferPreviewResponse,
      {
        sourceCountryCode: string;
        userId: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ sourceCountryCode, userId, page = 1, limit = 10 }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("page", String(page));
        searchParams.set("limit", String(limit));
        const qs = searchParams.toString();
        return {
          url: `/country-coverage/${encodeURIComponent(sourceCountryCode)}/users/${encodeURIComponent(userId)}/transfer-preview?${qs}`,
          method: "GET",
        };
      },
    }),

    getCountryCoverageTransferPeers: builder.query<
      CountryCoverageTransferPeersResponse,
      {
        sourceCountryCode: string;
        userId: string;
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: ({
        sourceCountryCode,
        userId,
        page = 1,
        limit = 10,
        search,
      }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("page", String(page));
        searchParams.set("limit", String(limit));
        if (search?.trim()) searchParams.set("search", search.trim());
        const qs = searchParams.toString();
        return {
          url: `/country-coverage/${encodeURIComponent(sourceCountryCode)}/users/${encodeURIComponent(userId)}/transfer-peers?${qs}`,
          method: "GET",
        };
      },
    }),

    transferCountryCoverage: builder.mutation<
      TransferCountryCoverageResponse,
      TransferCountryCoverageRequest
    >({
      query: ({
        sourceCountryCode,
        userId,
        destinationCountryCode,
        assignments,
        evenSplitAcrossRecruiterIds,
        reason,
      }) => ({
        url: `/country-coverage/${encodeURIComponent(sourceCountryCode)}/users/${encodeURIComponent(userId)}/transfer`,
        method: "POST",
        body: {
          destinationCountryCode,
          assignments,
          evenSplitAcrossRecruiterIds,
          reason,
        },
      }),
      invalidatesTags: ["CountryCoverage", "User", "Candidate", "RecruiterAssignment"],
    }),

    getCountryCoverageTransferHistory: builder.query<
      CountryCoverageTransferHistoryResponse,
      { countryCode: string; page?: number; limit?: number }
    >({
      query: ({ countryCode, page = 1, limit = 10 }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("page", String(page));
        searchParams.set("limit", String(limit));
        return {
          url: `/country-coverage/${encodeURIComponent(countryCode)}/transfer-history?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["CountryCoverage"],
    }),

    getCountryCoverageTransferHistoryCandidates: builder.query<
      CountryCoverageTransferHistoryCandidatesResponse,
      {
        countryCode: string;
        transferId: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ countryCode, transferId, page = 1, limit = 10 }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("page", String(page));
        searchParams.set("limit", String(limit));
        return {
          url: `/country-coverage/${encodeURIComponent(countryCode)}/transfer-history/${encodeURIComponent(transferId)}/candidates?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["CountryCoverage"],
    }),
  }),
});

export const {
  useGetCountryCoverageSummaryQuery,
  useGetCountryCoverageUsersQuery,
  useGetCountryCoverageTransferPreviewQuery,
  useGetCountryCoverageTransferPeersQuery,
  useTransferCountryCoverageMutation,
  useGetCountryCoverageTransferHistoryQuery,
  useGetCountryCoverageTransferHistoryCandidatesQuery,
} = countryCoverageApi;
