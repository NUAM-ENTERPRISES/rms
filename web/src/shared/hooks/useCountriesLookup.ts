/**
 * Shared countries lookup hook - cross-domain UI logic
 * Following FE_GUIDELINES.md shared pattern
 */

import { baseApi } from "@/app/api/baseApi";

export interface Country {
  code: string;
  name: string;
  region: string;
  callingCode: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CountryWithStats extends Country {
  projectCount?: number;
}

export interface PaginatedCountries {
  countries: CountryWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CountriesQueryParams {
  search?: string;
  region?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// Countries API endpoints using baseApi injection pattern
export const countriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCountries: builder.query<
      PaginatedCountries,
      CountriesQueryParams | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();

        if (params && params.search)
          searchParams.append("search", params.search);
        if (params && params.region)
          searchParams.append("region", params.region);
        if (params && params.isActive !== undefined)
          searchParams.append("isActive", String(params.isActive));
        if (params && params.page)
          searchParams.append("page", String(params.page));
        if (params && params.limit)
          searchParams.append("limit", String(params.limit));

        return {
          url: "countries",
          params: Object.fromEntries(searchParams),
        };
      },
      transformResponse: (response: { data: PaginatedCountries }) =>
        response.data,
      providesTags: ["Country"],
      keepUnusedDataFor: 3600, // Cache for 1 hour
    }),

    getActiveCountries: builder.query<
      PaginatedCountries,
      CountriesQueryParams | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params && params.search)
          searchParams.append("search", params.search);
        if (params && params.region)
          searchParams.append("region", params.region);
        if (params && params.page)
          searchParams.append("page", String(params.page));
        if (params && params.limit)
          searchParams.append("limit", String(params.limit));

        return {
          url: "countries/active",
          params: Object.fromEntries(searchParams),
        };
      },
      transformResponse: (response: { data: PaginatedCountries }) =>
        response.data,
      providesTags: ["Country"],
      keepUnusedDataFor: 3600, // Cache for 1 hour
    }),

    getCountriesByRegion: builder.query<Record<string, Country[]>, void>({
      query: () => "countries/by-region",
      transformResponse: (response: { data: Record<string, Country[]> }) =>
        response.data,
      providesTags: ["Country"],
      keepUnusedDataFor: 3600, // Cache for 1 hour
    }),

    getCountryByCode: builder.query<CountryWithStats, string>({
      query: (code) => `countries/${code}`,
      transformResponse: (response: { data: CountryWithStats }) =>
        response.data,
      providesTags: (_, __, code) => [{ type: "Country", id: code }],
      keepUnusedDataFor: 3600, // Cache for 1 hour
    }),
  }),
});

// Export hooks
export const {
  useGetCountriesQuery,
  useGetActiveCountriesQuery,
  useGetCountriesByRegionQuery,
  useGetCountryByCodeQuery,
  useLazyGetCountryByCodeQuery,
} = countriesApi;

/**
 * Hook for country dropdown data with error handling
 */
export function useCountriesLookup(params?: CountriesQueryParams) {
  const { data, isLoading, error, refetch } = useGetActiveCountriesQuery(params);

  const countries = data?.countries || [];

  return {
    countries,
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    // Helper to find country by code
    findCountryByCode: (code: string) =>
      countries.find((country) => country.code === code?.toUpperCase()),
  };
}

/**
 * Hook for country validation
 */
export function useCountryValidation() {
  const { countries } = useCountriesLookup();

  return {
    validateCountryCode: (code?: string) => {
      if (!code) return true; // Allow empty for optional fields
      return countries.some(
        (country) => country.code === code.toUpperCase() && country.isActive
      );
    },
    getCountryName: (code?: string) => {
      if (!code) return null;
      const country = countries.find((c) => c.code === code.toUpperCase());
      return country?.name || null;
    },
  };
}
