import { baseApi } from "@/app/api/baseApi";
import type { SessionAvailability } from "@/shared/types/session-availability";

// API Response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export type UserAccountStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

// User Types matching backend structure
export interface UserRole {
  id: string;
  name: string;
  description?: string;
}

export interface UserWithRoles {
  id: string;
  employeeCode?: string | null;
  email: string;
  name: string;
  countryCode: string;
  mobileNumber: string;
  dateOfBirth?: string;
  profileImage?: string;
  accountStatus?: UserAccountStatus;
  accountStatusUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles: Array<{
    role: UserRole;
  }>;
  addressCountryCode?: string | null;
  addressStateId?: string | null;
  address?: string | null;
  addressCountry?: { code: string; name: string } | null;
  addressState?: { id: string; name: string; code: string } | null;

  userLanguages?: Array<{
    id: string;
    languageCode: string;
    proficiency: string;
    language?: { code: string; name: string } | null;
  }>;
  userCountryCoverages?: Array<{
    id: string;
    countryCode: string;
    sectorScopes: string[];
    country?: { code: string; name: string } | null;
  }>;
  userProfessionScopes?: Array<{
    id: string;
    professionTypeId: string;
    professionType: { id: string; name: string; label: string };
  }>;
  documentsControlAccess?: {
    originalDocumentIntakeEnabled: boolean;
    courierManagementEnabled: boolean;
  };
}

export interface PaginatedUsersData {
  users: UserWithRoles[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserRequest {
  name: string;
  employeeCode?: string;
  email: string;
  password: string;
  countryCode: string;
  mobileNumber: string;
  dateOfBirth?: string;
  roleIds?: string[]; // Array of role IDs as expected by backend
  addressCountryCode?: string;
  addressStateId?: string;
  address?: string;
  professionTypeIds: string[];
}

export interface UpdateUserRequest {
  name?: string;
  employeeCode?: string | null;
  email?: string;
  countryCode?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  roleIds?: string[]; // Array of role IDs as expected by backend
  addressCountryCode?: string | null;
  addressStateId?: string | null;
  address?: string | null;
  professionTypeIds?: string[];
}

export type LanguageProficiencyApi = "PRIMARY" | "SECONDARY" | "TERTIARY";
export type RecruiterCountrySectorScopeApi = "HEALTHCARE" | "NON_HEALTH_CARE";

export interface RecruiterCapabilityLanguageItem {
  languageCode: string;
  proficiency: LanguageProficiencyApi;
}

export interface RecruiterCapabilityCountryItem {
  countryCode: string;
  sectorScopes: RecruiterCountrySectorScopeApi[];
}

export interface UpdateRecruiterCapabilitiesRequest {
  languages: RecruiterCapabilityLanguageItem[];
  countryCoverages: RecruiterCapabilityCountryItem[];
}

export interface UpdateDocumentsControlPermissionsRequest {
  originalDocumentIntakeEnabled: boolean;
  courierManagementEnabled: boolean;
}

export interface UserLanguagesResponse {
  success: boolean;
  data: { code: string; name: string }[];
  message: string;
}

export interface AdminSession {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  profileImage?: string | null;
  roles: string[];
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  loginAt: string;
  lastActivityAt: string;
  isActive: boolean;
  isIdle: boolean;
  availability?: SessionAvailability;
}

export interface AdminSessionsQuery {
  role?: string;
  search?: string;
  isActive?: boolean;
  status?: "ACTIVE" | "IDLE" | "ENDED";
  availability?: "ACTIVE" | "BREAK" | "ON_CALL";
  page?: number;
  limit?: number;
}

export interface AdminIdleSessionsSummaryResponse {
  success: boolean;
  data: {
    idleCount: number;
    sessions: AdminSession[];
  };
  message: string;
}

export interface QueryUsersRequest {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  roles?: string | string[];
  accountStatus?: UserAccountStatus;
}

export interface UpdateUserAccountStatusRequest {
  status: UserAccountStatus;
  remarks: string;
}

export interface UserAccountStatusHistoryItem {
  id: string;
  previousStatus: UserAccountStatus | null;
  newStatus: UserAccountStatus;
  remarks: string;
  createdAt: string;
  changedBy: {
    id: string;
    name: string;
    email: string;
    employeeCode: string | null;
  } | null;
}

export interface PaginatedAccountStatusHistoryData {
  items: UserAccountStatusHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AccountStatusHistoryResponse {
  success: boolean;
  data: PaginatedAccountStatusHistoryData;
  message: string;
}

export interface UsersResponse {
  success: boolean;
  data: PaginatedUsersData;
  message: string;
}

export interface UserAccountStatusCounts {
  all: number;
  active: number;
  inactive: number;
  blocked: number;
}

export interface UserAccountStatusCountsResponse {
  success: boolean;
  data: UserAccountStatusCounts;
  message: string;
}

export interface UserResponse {
  success: boolean;
  data: UserWithRoles;
  message: string;
}

export interface SuggestEmployeeCodeResponse {
  success: boolean;
  data: { employeeCode: string };
  message: string;
}

// Users API using baseApi injection pattern (FE_GUIDELINES compliance)
export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    suggestEmployeeCode: builder.mutation<SuggestEmployeeCodeResponse, void>({
      query: () => ({
        url: '/users/employee-code/suggest',
        method: 'POST',
      }),
    }),

    // Get all users with pagination and search
    getUsers: builder.query<UsersResponse, QueryUsersRequest | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              if (key === "roles" && Array.isArray(value)) {
                value.forEach((role) => searchParams.append("roles", role));
              } else {
                searchParams.append(key, value.toString());
              }
            }
          });
        }
        return {
          url: `/users?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["User"],
    }),

    getUserAccountStatusCounts: builder.query<
      UserAccountStatusCountsResponse,
      { search?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.search) {
          searchParams.append("search", params.search);
        }
        const query = searchParams.toString();
        return {
          url: `/users/account-status-counts${query ? `?${query}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["User"],
    }),

    // Get single user by ID
    getUser: builder.query<UserResponse, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "GET",
      }),
      providesTags: (_, __, id) => [{ type: "User", id }],
    }),

    // Create new user
    createUser: builder.mutation<UserResponse, CreateUserRequest>({
      query: (body) => ({
        url: "/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    listUserLanguages: builder.query<UserLanguagesResponse, void>({
      query: () => ({
        url: "/users/languages",
        method: "GET",
      }),
    }),

    updateRecruiterCapabilities: builder.mutation<
      UserResponse,
      { id: string; body: UpdateRecruiterCapabilitiesRequest }
    >({
      query: ({ id, body }) => ({
        url: `/users/${id}/recruiter-capabilities`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "User", id }, "User"],
    }),

    updateDocumentsControlPermissions: builder.mutation<
      UserResponse,
      { id: string; body: UpdateDocumentsControlPermissionsRequest }
    >({
      query: ({ id, body }) => ({
        url: `/users/${id}/documents-control-permissions`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "User", id }, "User"],
    }),

    updateUserAccountStatus: builder.mutation<
      UserResponse,
      { id: string; body: UpdateUserAccountStatusRequest }
    >({
      query: ({ id, body }) => ({
        url: `/users/${id}/account-status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "User", id },
        "User",
        { type: "UserAccountStatusHistory", id },
      ],
    }),

    getUserAccountStatusHistory: builder.query<
      AccountStatusHistoryResponse,
      { userId: string; page?: number; limit?: number }
    >({
      query: ({ userId, page, limit }) => {
        const searchParams = new URLSearchParams();
        if (page) searchParams.set("page", String(page));
        if (limit) searchParams.set("limit", String(limit));
        const qs = searchParams.toString();
        return {
          url: `/users/${userId}/account-status/history${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (_, __, { userId }) => [
        { type: "UserAccountStatusHistory", id: userId },
      ],
    }),

    // Update existing user
    updateUser: builder.mutation<
      UserResponse,
      { id: string; body: UpdateUserRequest }
    >({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "User", id }, "User"],
    }),

    // Delete user
    deleteUser: builder.mutation<{ success: boolean; message: string }, string>(
      {
        query: (id) => ({
          url: `/users/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["User"],
      }
    ),

    // Get user roles
    getUserRoles: builder.query<{ success: boolean; data: string[] }, string>({
      query: (id) => ({
        url: `/users/${id}/roles`,
        method: "GET",
      }),
      providesTags: (_, __, id) => [{ type: "User", id }],
    }),

    // Get user permissions
    getUserPermissions: builder.query<
      { success: boolean; data: string[] },
      string
    >({
      query: (id) => ({
        url: `/users/${id}/permissions`,
        method: "GET",
      }),
      providesTags: (_, __, id) => [{ type: "User", id }],
    }),

    // Update user password
    updateUserPassword: builder.mutation<
      { success: boolean; data: { message: string }; message: string },
      { id: string; currentPassword?: string; newPassword: string }
    >({
      query: ({ id, currentPassword, newPassword }) => ({
        url: `/users/${id}/change-password`,
        method: "POST",
        body: { ...(currentPassword ? { currentPassword } : {}), newPassword },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "User", id }],
    }),

    pingCurrentSessionActivity: builder.mutation<
      { success: boolean; data: null; message: string },
      void
    >({
      query: () => ({
        url: "/users/profile/session/activity",
        method: "PUT",
      }),
    }),

    // Get recruiter statistics for analytics
    getRecruiterStats: builder.query<
      ApiResponse<
        Array<{
          id: string;
          name: string;
          email: string;
          // Project-level metrics
          assigned: number;
          screening: number;
          interview: number;
          selected: number;
          joined: number;
          untouched: number;
          // Candidate-level metrics
          totalCandidates: number;
          candidatesUntouched: number;
          candidatesInterested: number;
          candidatesNotInterested: number;
          candidatesRNR: number;
          candidatesQualified: number;
          candidatesDeployed: number; // renamed from candidatesWorking
          candidatesOnHold: number;
          candidatesOtherEnquiry: number;
          candidatesFuture: number;
          candidatesNotEligible: number;
          // Average time metrics
          avgScreeningDays: number;
          avgTimeToFirstTouch: number;
          avgDaysToInterested: number;
          avgDaysToNotInterested: number;
          avgDaysToNotEligible: number;
          avgDaysToOtherEnquiry: number;
          avgDaysToFuture: number;
          avgDaysToOnHold: number;
          avgDaysToRNR: number;
          avgDaysToQualified: number;
          avgDaysToDeployed?: number; // new preferred metric
          avgDaysToWorking?: number; // legacy
        }>
      >,
      { year?: number }
    >({
      query: (params) => ({
        url: "/recruiters/stats",
        params: params.year ? { year: params.year } : undefined,
      }),
      providesTags: ["User"],
    }),

    // Get recruiter monthly performance data
    getRecruiterPerformance: builder.query<
      ApiResponse<
        Array<{
          month: string;
          year: number;
          assigned: number;
          screening: number;
          interview: number;
          selected: number;
          joined: number;
          deployed: number;
          hired: number;
          registered: number;
          documentVerified: number;
          shortlisted: number;
          interviewPassed: number;
        }>
      >,
      {
        recruiterId: string;
        year?: number;
        filterBy?: 'year' | 'month' | 'today' | 'custom';
        month?: number;
        fromDate?: string;
        toDate?: string;
      }
    >({
      query: (params) => ({
        url: '/recruiters/performance',
        params: {
          recruiterId: params.recruiterId,
          ...(params.year && { year: params.year }),
          ...(params.filterBy && { filterBy: params.filterBy }),
          ...(params.month && { month: params.month }),
          ...(params.fromDate && { fromDate: params.fromDate }),
          ...(params.toDate && { toDate: params.toDate }),
        },
      }),
      providesTags: ['User'],
    }),

    // Admin: all user sessions with role/search/active filter
    getAdminSessions: builder.query<
      {
        success: boolean;
        data: AdminSession[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        counts?: {
          total: number;
          active: number;
          idle: number;
          ended: number;
          onBreak: number;
          onCall: number;
        };
        message: string;
      },
      AdminSessionsQuery | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.role) searchParams.set('role', params.role);
          if (params.search) searchParams.set('search', params.search);
          if (params.status) searchParams.set('status', params.status);
          if (params.availability)
            searchParams.set('availability', params.availability);
          if (typeof params.isActive === 'boolean')
            searchParams.set('isActive', String(params.isActive));
          if (params.page) searchParams.set('page', String(params.page));
          if (params.limit) searchParams.set('limit', String(params.limit));
        }
        return { url: `/users/sessions/admin?${searchParams.toString()}`, method: 'GET' };
      },
      providesTags: ['AdminSessions'],
    }),
    getAdminIdleSessionsSummary: builder.query<
      AdminIdleSessionsSummaryResponse,
      { role?: string; search?: string; limit?: number } | void
    >({
      query: (params) => ({
        url: '/users/sessions/admin/idle',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['AdminSessions'],
    }),

  }),
});

// Export hooks
export const {
  useSuggestEmployeeCodeMutation,
  useGetUsersQuery,
  useGetUserAccountStatusCountsQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useListUserLanguagesQuery,
  useUpdateRecruiterCapabilitiesMutation,
  useUpdateDocumentsControlPermissionsMutation,
  useUpdateUserMutation,
  useUpdateUserAccountStatusMutation,
  useGetUserAccountStatusHistoryQuery,
  useDeleteUserMutation,
  useGetUserRolesQuery,
  useGetUserPermissionsQuery,
  useUpdateUserPasswordMutation,
  useGetRecruiterStatsQuery,
  useGetRecruiterPerformanceQuery,
  usePingCurrentSessionActivityMutation,
  useGetAdminSessionsQuery,
  useLazyGetAdminSessionsQuery,
  useGetAdminIdleSessionsSummaryQuery,
} = usersApi;

// Export roles API
export * from "./api/roles";

// Export system settings API
export * from "./api/systemSettingsApi";
