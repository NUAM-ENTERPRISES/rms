import { baseApi } from "@/app/api/baseApi";

export interface RoleCreator {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: RoleCreator | null;
  assignedUserCount?: number;
}

export interface RolePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RoleCounts {
  all: number;
  system: number;
  custom: number;
}

export interface RolesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "ALL" | "SYSTEM" | "CUSTOM";
}

export interface RoleDetailResponse {
  success: boolean;
  data: Role;
  message: string;
}

export interface PermissionCatalogItem {
  id: string;
  key: string;
  description?: string | null;
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
  data: {
    roles: Role[];
    pagination: RolePagination;
    counts: RoleCounts;
  };
  message: string;
}

export interface RoleAssignedUser {
  id: string;
  name: string;
  email: string;
  mobileNumber?: string | null;
  employeeCode?: string | null;
  profileImage?: string | null;
  accountStatus?: string;
  createdAt?: string;
}

export interface RoleAssignedUsersResponse {
  success: boolean;
  data: {
    users: RoleAssignedUser[];
    pagination: RolePagination;
  };
  message: string;
}

export interface PermissionsResponse {
  success: boolean;
  data: PermissionCatalogItem[];
  message: string;
}

export interface UserRolesResponse {
  success: boolean;
  data: Role[];
  message: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionKeys: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionKeys?: string[];
}

export interface RoleMutationResponse {
  success: boolean;
  data: Role;
  message: string;
}

export interface DeleteRoleResponse {
  success: boolean;
  data: { id: string; name: string };
  message: string;
}

export const rolesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<RolesResponse, RolesQueryParams | void>({
      query: (params) => ({
        url: "/roles",
        method: "GET",
        params: params ?? { page: 1, limit: 10 },
      }),
      providesTags: ["Role"],
    }),

    getRoleById: builder.query<RoleDetailResponse, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Role", id }, "Role"],
    }),

    getRoleAssignedUsers: builder.query<
      RoleAssignedUsersResponse,
      { roleId: string; page?: number; limit?: number }
    >({
      query: ({ roleId, page = 1, limit = 10 }) => ({
        url: `/roles/${roleId}/users`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: (_result, _error, { roleId }) => [
        { type: "Role", id: roleId },
        "User",
      ],
    }),

    getPermissionsCatalog: builder.query<PermissionsResponse, void>({
      query: () => ({
        url: "/roles/permissions",
        method: "GET",
      }),
      providesTags: ["Role"],
    }),

    getUserRoles: builder.query<UserRolesResponse, string>({
      query: (userId) => ({
        url: `/roles/user/${userId}`,
        method: "GET",
      }),
      providesTags: (_, __, userId) => [{ type: "User", id: userId }],
    }),

    createRole: builder.mutation<RoleMutationResponse, CreateRoleRequest>({
      query: (body) => ({
        url: "/roles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Role"],
    }),

    updateRole: builder.mutation<
      RoleMutationResponse,
      { id: string; body: UpdateRoleRequest }
    >({
      query: ({ id, body }) => ({
        url: `/roles/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Role"],
    }),

    deleteRole: builder.mutation<DeleteRoleResponse, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Role"],
    }),

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
  useGetRoleByIdQuery,
  useGetRoleAssignedUsersQuery,
  useGetPermissionsCatalogQuery,
  useGetUserRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
} = rolesApi;
