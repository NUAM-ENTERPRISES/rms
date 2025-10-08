import { baseApi } from "@/app/api/baseApi";

// User Types matching backend structure
export interface UserRole {
  id: string;
  name: string;
  description?: string;
}

export interface UserWithRoles {
  id: string;
  email: string;
  name: string;
  countryCode: string;
  phone: string;
  dateOfBirth?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
  userRoles: Array<{
    role: UserRole;
  }>;
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
  email: string;
  password: string;
  countryCode: string;
  phone: string;
  dateOfBirth?: string;
  roleIds?: string[]; // Array of role IDs as expected by backend
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  countryCode?: string;
  phone?: string;
  dateOfBirth?: string;
  roleIds?: string[]; // Array of role IDs as expected by backend
}

export interface QueryUsersRequest {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UsersResponse {
  success: boolean;
  data: PaginatedUsersData;
  message: string;
}

export interface UserResponse {
  success: boolean;
  data: UserWithRoles;
  message: string;
}

// Users API using baseApi injection pattern (FE_GUIDELINES compliance)
export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all users with pagination and search
    getUsers: builder.query<UsersResponse, QueryUsersRequest | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              searchParams.append(key, value.toString());
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
      { id: string; currentPassword: string; newPassword: string }
    >({
      query: ({ id, currentPassword, newPassword }) => ({
        url: `/users/${id}/change-password`,
        method: "POST",
        body: { currentPassword, newPassword },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "User", id }],
    }),
  }),
});
// Export hooks
export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserRolesQuery,
  useGetUserPermissionsQuery,
  useUpdateUserPasswordMutation,
} = usersApi;

// Export roles API
export * from "./api/roles";
