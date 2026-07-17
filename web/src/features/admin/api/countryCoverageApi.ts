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

export interface CountryCoverageUsersResponse {
  success: boolean;
  data: {
    country: { code: string; name: string };
    users: CountryCoverageUser[];
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
    }),
  }),
});

export const {
  useGetCountryCoverageSummaryQuery,
  useGetCountryCoverageUsersQuery,
} = countryCoverageApi;
