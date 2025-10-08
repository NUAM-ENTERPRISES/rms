import { baseApi } from "@/app/api/baseApi";

// Role Types matching backend structure
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
}

export interface AssignRoleResponse {
  success: boolean;
  data: {
    userId: string;
    roleId: string;
    roleName: string;
    userName: string;
    userEmail: string;
  };
  message: string;
}

export interface RolesResponse {
  success: boolean;
  data: Role[];
  message: string;
}

export interface UserRolesResponse {
  success: boolean;
  data: Role[];
  message: string;
}

// Roles API using baseApi injection pattern (FE_GUIDELINES compliance)
export const rolesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all roles
    getRoles: builder.query<RolesResponse, void>({
      query: () => ({
        url: "/roles",
        method: "GET",
      }),
      providesTags: ["Role"],
    }),

    // Get user roles
    getUserRoles: builder.query<UserRolesResponse, string>({
      query: (userId) => ({
        url: `/roles/user/${userId}`,
        method: "GET",
      }),
      providesTags: (_, __, userId) => [{ type: "User", id: userId }],
    }),

    // Assign role to user
    assignRole: builder.mutation<AssignRoleResponse, AssignRoleRequest>({
      query: (body) => ({
        url: "/roles/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: (_, __, { userId }) => [
        { type: "User", id: userId },
        "User",
      ],
    }),

    // Remove role from user
    removeRole: builder.mutation<
      AssignRoleResponse,
      { userId: string; roleId: string }
    >({
      query: ({ userId, roleId }) => ({
        url: `/roles/${userId}/${roleId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, { userId }) => [
        { type: "User", id: userId },
        "User",
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetUserRolesQuery,
  useAssignRoleMutation,
  useRemoveRoleMutation,
} = rolesApi;
