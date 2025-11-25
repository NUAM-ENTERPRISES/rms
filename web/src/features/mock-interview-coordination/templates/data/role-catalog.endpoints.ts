import { baseApi } from "@/app/api/baseApi";

export interface RoleCatalogItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  subCategory?: string;
  isClinical: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
      { isActive?: boolean; limit?: number }
    >({
      query: ({ isActive = true, limit = 1000 } = {}) => ({
        url: "/role-catalog",
        method: "GET",
        params: { isActive, limit },
      }),
      providesTags: ["RoleCatalog"],
    }),
  }),
});

export const { useGetRoleCatalogQuery } = roleCatalogApi;
