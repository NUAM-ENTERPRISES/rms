import { baseApi } from "@/app/api/baseApi";

export interface RoleCatalogItem {
  id: string;
  name: string;
  label: string;
  shortName?: string | null;
  description?: string | null;
  roleDepartmentId?: string | null;
  professionTypeId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  } | null;
}

export interface RoleCatalogResponse {
  success: boolean;
  data: {
    roles: RoleCatalogItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}

const roleCatalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoleCatalog: builder.query<
      RoleCatalogResponse,
      {
        isActive?: boolean;
        limit?: number;
        professionTypeId?: string;
        roleDepartmentId?: string;
        search?: string;
      }
    >({
      query: ({
        isActive = true,
        limit = 100,
        professionTypeId,
        roleDepartmentId,
        search,
      } = {}) => ({
        url: "/role-catalog",
        method: "GET",
        params: {
          isActive,
          limit,
          ...(professionTypeId ? { professionTypeId } : {}),
          ...(roleDepartmentId ? { roleDepartmentId } : {}),
          ...(search ? { search } : {}),
        },
      }),
      providesTags: ["RoleCatalog"],
    }),
  }),
});

export const { useGetRoleCatalogQuery } = roleCatalogApi;
