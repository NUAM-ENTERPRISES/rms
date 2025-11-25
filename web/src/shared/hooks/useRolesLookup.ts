import { baseApi } from "@/app/api/baseApi";

// Types
export interface RoleCatalog {
  id: string;
  name: string;
  slug: string;
  category: "Clinical" | "Non-Clinical";
  subCategory: string;
  isClinical: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleWithRecommendations extends RoleCatalog {
  recommendedQualifications: RecommendedQualification[];
}

export interface RecommendedQualification {
  id: string;
  weight: number;
  isPreferred: boolean;
  notes?: string;
  countryCode?: string;
  qualification: QualificationSummary;
}

export interface QualificationSummary {
  id: string;
  name: string;
  shortName?: string;
  level: "CERTIFICATE" | "DIPLOMA" | "BACHELOR" | "MASTER" | "DOCTORATE";
  field: string;
  program?: string;
  description?: string;
}

export interface PaginatedRoles {
  roles: RoleCatalog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RolesQueryParams {
  q?: string;
  category?: "Clinical" | "Non-Clinical";
  isClinical?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "name" | "category" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const rolesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all roles with filtering and pagination
    getRoles: builder.query<
      ApiResponse<PaginatedRoles>,
      RolesQueryParams | void
    >({
      query: (params) => {
        if (!params) return "/roles";
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value.toString());
          }
        });
        return {
          url: `/roles?${searchParams.toString()}`,
        };
      },
      providesTags: (result) =>
        result?.data?.roles
          ? [
              ...result.data.roles.map(({ id }) => ({
                type: "RoleCatalog" as const,
                id,
              })),
              { type: "RoleCatalog", id: "LIST" },
            ]
          : [{ type: "RoleCatalog", id: "LIST" }],
    }),

    // Get role by ID with recommended qualifications
    getRole: builder.query<ApiResponse<RoleWithRecommendations>, string>({
      query: (id) => `/roles/${id}`,
      providesTags: (_, __, id) => [{ type: "RoleCatalog", id }],
    }),

    // Get recommended qualifications for a role
    getRecommendedQualifications: builder.query<
      ApiResponse<RecommendedQualification[]>,
      { roleId: string; countryCode?: string }
    >({
      query: ({ roleId, countryCode }) => ({
        url: `/roles/${roleId}/recommended-qualifications`,
        params: countryCode ? { countryCode } : {},
      }),
      providesTags: (_, __, { roleId }) => [
        { type: "RoleCatalog", id: roleId },
        { type: "Qualification", id: "RECOMMENDATIONS" },
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleQuery,
  useGetRecommendedQualificationsQuery,
} = rolesApi;

// Custom hooks for common use cases
export function useRolesLookup(params?: RolesQueryParams) {
  const { data, isLoading, error } = useGetRolesQuery(params);

  return {
    roles: data?.data?.roles || [],
    pagination: data?.data?.pagination,
    isLoading,
    error,
    success: data?.success || false,
  };
}

export function useRoleDetails(roleId: string) {
  const { data, isLoading, error } = useGetRoleQuery(roleId);

  return {
    role: data?.data,
    isLoading,
    error,
    success: data?.success || false,
  };
}

export function useRoleRecommendations(roleId: string, countryCode?: string) {
  // Don't call the recommendations endpoint when roleId is empty/undefined
  const { data, isLoading, error } = useGetRecommendedQualificationsQuery(
    { roleId, countryCode },
    { skip: !roleId }
  );

  return {
    recommendations: data?.data || [],
    isLoading,
    error,
    success: data?.success || false,
  };
}
