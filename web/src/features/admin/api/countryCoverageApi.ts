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
}

export interface TransferPreviewPeer {
  id: string;
  name: string;
  email: string;
  coveredCountryCodes: string[];
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
    /** Lightweight id list for select-all / submit (not full candidate rows). */
    allPositiveCandidateIds: string[];
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

export interface TransferCountryCoverageRequest {
  sourceCountryCode: string;
  userId: string;
  destinationCountryCode: string;
  targetRecruiterId?: string;
  candidateIds: string[];
  reason?: string;
}

export interface TransferCountryCoverageResponse {
  success: boolean;
  data: {
    sourceUserId: string;
    destinationCountryCode: string;
    destinationCountryName: string;
    targetRecruiterId: string | null;
    transferredCandidateCount: number;
    removedCountryCodes: string[];
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
        targetRecruiterId,
        candidateIds,
        reason,
      }) => ({
        url: `/country-coverage/${encodeURIComponent(sourceCountryCode)}/users/${encodeURIComponent(userId)}/transfer`,
        method: "POST",
        body: {
          destinationCountryCode,
          targetRecruiterId,
          candidateIds,
          reason,
        },
      }),
      invalidatesTags: ["CountryCoverage", "User", "Candidate", "RecruiterAssignment"],
    }),
  }),
});

export const {
  useGetCountryCoverageSummaryQuery,
  useGetCountryCoverageUsersQuery,
  useGetCountryCoverageTransferPreviewQuery,
  useGetCountryCoverageTransferPeersQuery,
  useTransferCountryCoverageMutation,
} = countryCoverageApi;
