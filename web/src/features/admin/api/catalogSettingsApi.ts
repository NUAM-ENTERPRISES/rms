import { baseApi } from "@/app/api/baseApi";

export type ProfessionSector = "HEALTHCARE" | "NON_HEALTH_CARE";

export interface CatalogProfessionType {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  sector?: ProfessionSector | null;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogRoleDepartment {
  id: string;
  name: string;
  label: string;
  shortName?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  roles?: CatalogRoleCatalog[];
}

export interface CatalogRoleCatalog {
  id: string;
  name: string;
  label: string;
  shortName?: string | null;
  description?: string | null;
  roleDepartmentId?: string | null;
  professionTypeId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  roleDepartment?: {
    id: string;
    name: string;
    label: string;
    shortName?: string | null;
  } | null;
  professionType?: {
    id: string;
    name: string;
    label: string;
    sector?: ProfessionSector | null;
  } | null;
}

export interface CreateProfessionTypeRequest {
  name: string;
  label: string;
  description?: string;
  sector?: ProfessionSector | null;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateProfessionTypeRequest = Partial<CreateProfessionTypeRequest>;

export interface CreateRoleDepartmentRequest {
  name: string;
  label: string;
  shortName?: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateRoleDepartmentRequest = Partial<CreateRoleDepartmentRequest>;

export interface CreateRoleCatalogRequest {
  name: string;
  label: string;
  roleDepartmentId?: string | null;
  professionTypeId?: string | null;
  shortName?: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateRoleCatalogRequest = Partial<CreateRoleCatalogRequest>;

export const catalogSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminProfessionTypes: builder.query<
      { professionTypes: CatalogProfessionType[] },
      { sector?: ProfessionSector; search?: string } | void
    >({
      query: (params) => ({
        url: "/profession-types/admin",
        params: {
          ...(params?.sector ? { sector: params.sector } : {}),
          ...(params?.search ? { search: params.search } : {}),
        },
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: { professionTypes?: CatalogProfessionType[] };
      }) => ({
        professionTypes: response.data?.professionTypes ?? [],
      }),
      providesTags: [{ type: "ProfessionType", id: "LIST" }],
    }),

    createProfessionType: builder.mutation<
      CatalogProfessionType,
      CreateProfessionTypeRequest
    >({
      query: (body) => ({
        url: "/profession-types",
        method: "POST",
        body,
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogProfessionType;
      }) => response.data as CatalogProfessionType,
      invalidatesTags: [{ type: "ProfessionType", id: "LIST" }],
    }),

    updateProfessionType: builder.mutation<
      CatalogProfessionType,
      { id: string; body: UpdateProfessionTypeRequest }
    >({
      query: ({ id, body }) => ({
        url: `/profession-types/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogProfessionType;
      }) => response.data as CatalogProfessionType,
      invalidatesTags: [{ type: "ProfessionType", id: "LIST" }],
    }),

    softDeleteProfessionType: builder.mutation<CatalogProfessionType, string>({
      query: (id) => ({
        url: `/profession-types/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogProfessionType;
      }) => response.data as CatalogProfessionType,
      invalidatesTags: [{ type: "ProfessionType", id: "LIST" }, "RoleCatalog"],
    }),

    createRoleDepartment: builder.mutation<
      CatalogRoleDepartment,
      CreateRoleDepartmentRequest
    >({
      query: (body) => ({
        url: "/role-departments",
        method: "POST",
        body,
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogRoleDepartment;
      }) => response.data as CatalogRoleDepartment,
      invalidatesTags: ["RoleDepartment"],
    }),

    updateRoleDepartment: builder.mutation<
      CatalogRoleDepartment,
      { id: string; body: UpdateRoleDepartmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/role-departments/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogRoleDepartment;
      }) => response.data as CatalogRoleDepartment,
      invalidatesTags: ["RoleDepartment"],
    }),

    softDeleteRoleDepartment: builder.mutation<CatalogRoleDepartment, string>({
      query: (id) => ({
        url: `/role-departments/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogRoleDepartment;
      }) => response.data as CatalogRoleDepartment,
      invalidatesTags: ["RoleDepartment", "RoleCatalog"],
    }),

    getAdminRoleCatalog: builder.query<
      {
        roles: CatalogRoleCatalog[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      {
        search?: string;
        page?: number;
        limit?: number;
        sector?: ProfessionSector;
        professionTypeId?: string;
      } | void
    >({
      query: (params) => ({
        url: "/role-catalog",
        method: "GET",
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 10,
          sortBy: "createdAt",
          sortOrder: "desc",
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.sector ? { sector: params.sector } : {}),
          ...(params?.professionTypeId
            ? { professionTypeId: params.professionTypeId }
            : {}),
        },
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: {
          roles?: CatalogRoleCatalog[];
          pagination?: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
      }) => ({
        roles: response.data?.roles ?? [],
        pagination: response.data?.pagination ?? {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      }),
      providesTags: ["RoleCatalog"],
    }),

    createRoleCatalog: builder.mutation<
      CatalogRoleCatalog,
      CreateRoleCatalogRequest
    >({
      query: (body) => ({
        url: "/role-catalog",
        method: "POST",
        body,
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogRoleCatalog;
      }) => response.data as CatalogRoleCatalog,
      invalidatesTags: ["RoleCatalog", "RoleDepartment"],
    }),

    updateRoleCatalog: builder.mutation<
      CatalogRoleCatalog,
      { id: string; body: UpdateRoleCatalogRequest }
    >({
      query: ({ id, body }) => ({
        url: `/role-catalog/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogRoleCatalog;
      }) => response.data as CatalogRoleCatalog,
      invalidatesTags: ["RoleCatalog", "RoleDepartment"],
    }),

    softDeleteRoleCatalog: builder.mutation<CatalogRoleCatalog, string>({
      query: (id) => ({
        url: `/role-catalog/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: CatalogRoleCatalog;
      }) => response.data as CatalogRoleCatalog,
      invalidatesTags: ["RoleCatalog", "RoleDepartment"],
    }),
  }),
});

export const {
  useGetAdminProfessionTypesQuery,
  useCreateProfessionTypeMutation,
  useUpdateProfessionTypeMutation,
  useSoftDeleteProfessionTypeMutation,
  useCreateRoleDepartmentMutation,
  useUpdateRoleDepartmentMutation,
  useSoftDeleteRoleDepartmentMutation,
  useGetAdminRoleCatalogQuery,
  useCreateRoleCatalogMutation,
  useUpdateRoleCatalogMutation,
  useSoftDeleteRoleCatalogMutation,
} = catalogSettingsApi;
