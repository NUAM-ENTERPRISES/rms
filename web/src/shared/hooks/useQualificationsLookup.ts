import { baseApi } from "@/app/api/baseApi";

// Types
export interface Qualification {
  id: string;
  name: string;
  shortName?: string;
  level: "CERTIFICATE" | "DIPLOMA" | "BACHELOR" | "MASTER" | "DOCTORATE";
  field: string;
  program?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  aliases?: QualificationAlias[];
  countryProfiles?: QualificationCountryProfile[];
}

export interface QualificationAlias {
  alias: string;
  isCommon: boolean;
}

export interface QualificationCountryProfile {
  countryCode: string;
  regulatedTitle?: string;
  issuingBody?: string;
  accreditationStatus?: string;
  notes?: string;
  country: {
    name: string;
  };
}

export interface QualificationWithDetails extends Qualification {
  equivalencies?: QualificationEquivalency[];
}

export interface QualificationEquivalency {
  toQualification: {
    id: string;
    name: string;
    shortName?: string;
    level: string;
    field: string;
  };
  countryCode?: string;
  isEquivalent: boolean;
  notes?: string;
}

export interface PaginatedQualifications {
  qualifications: Qualification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QualificationsQueryParams {
  q?: string;
  level?: "CERTIFICATE" | "DIPLOMA" | "BACHELOR" | "MASTER" | "DOCTORATE";
  field?: string;
  countryCode?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "name" | "level" | "field" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const qualificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all qualifications with filtering and pagination
    getQualifications: builder.query<
      ApiResponse<PaginatedQualifications>,
      QualificationsQueryParams | void
    >({
      query: (params = {}) => ({
        url: "/qualifications",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.qualifications.map(({ id }) => ({
                type: "Qualification" as const,
                id,
              })),
              { type: "Qualification", id: "LIST" },
            ]
          : [{ type: "Qualification", id: "LIST" }],
    }),

    // Get qualification by ID with full details
    getQualification: builder.query<
      ApiResponse<QualificationWithDetails>,
      string
    >({
      query: (id) => `/qualifications/${id}`,
      providesTags: (_, __, id) => [{ type: "Qualification", id }],
    }),
  }),
});

export const { useGetQualificationsQuery, useGetQualificationQuery } =
  qualificationsApi;

// Custom hooks for common use cases
export function useQualificationsLookup(params?: QualificationsQueryParams) {
  const { data, isLoading, error } = useGetQualificationsQuery(params);

  return {
    qualifications: data?.data?.qualifications || [],
    pagination: data?.data?.pagination,
    isLoading,
    error,
    success: data?.success || false,
  };
}

export function useQualificationDetails(qualificationId: string) {
  const { data, isLoading, error } = useGetQualificationQuery(qualificationId);

  return {
    qualification: data?.data,
    isLoading,
    error,
    success: data?.success || false,
  };
}

// Helper functions for qualification validation
export function useQualificationValidation() {
  const validateQualificationId = (
    qualificationId: string,
    qualifications: Qualification[]
  ): boolean => {
    return qualifications.some((q) => q.id === qualificationId && q.isActive);
  };

  const getQualificationName = (
    qualificationId: string,
    qualifications: Qualification[]
  ): string => {
    const qualification = qualifications.find((q) => q.id === qualificationId);
    return (
      qualification?.shortName || qualification?.name || "Unknown Qualification"
    );
  };

  const getQualificationsByLevel = (
    level: string,
    qualifications: Qualification[]
  ): Qualification[] => {
    return qualifications.filter((q) => q.level === level && q.isActive);
  };

  const getQualificationsByField = (
    field: string,
    qualifications: Qualification[]
  ): Qualification[] => {
    return qualifications.filter(
      (q) => q.field.toLowerCase().includes(field.toLowerCase()) && q.isActive
    );
  };

  return {
    validateQualificationId,
    getQualificationName,
    getQualificationsByLevel,
    getQualificationsByField,
  };
}
