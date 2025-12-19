import { baseApi } from "@/app/api/baseApi";
import type {
  ScreeningTemplate,
  ScreeningTemplateItem,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateTemplateItemRequest,
  UpdateTemplateItemRequest,
  QueryTemplatesRequest,
  ApiResponse,
} from "../../types";

// ==================== SCREENING TEMPLATES API ENDPOINTS ====================

export const screeningTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all templates
    getTemplates: builder.query<
      ApiResponse<ScreeningTemplate[]>,
      QueryTemplatesRequest | void
    >({
      query: (params) => ({
        url: "/screening-templates",
        params,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({
                type: "ScreeningTemplate" as const,
                id,
              })),
              { type: "ScreeningTemplate", id: "LIST" },
            ]
          : [{ type: "ScreeningTemplate", id: "LIST" }],
    }),

    // Get a single template by ID
    getTemplate: builder.query<ApiResponse<ScreeningTemplate>, string>({
      query: (id) => `/screening-templates/${id}`,
      providesTags: (result, error, id) => [
        { type: "ScreeningTemplate", id },
      ],
    }),

    // Get templates by role ID
    getTemplatesByRole: builder.query<
      ApiResponse<ScreeningTemplate[]>,
      { roleId: string; isActive?: boolean }
    >({
      query: ({ roleId, isActive }) => ({
        url: `/screening-templates/role/${roleId}`,
        params: { isActive },
      }),
      providesTags: (result, error, { roleId }) => [
        { type: "ScreeningTemplate", id: `ROLE-${roleId}` },
        { type: "ScreeningTemplate", id: "LIST" },
      ],
    }),

    // Create a new template
    createTemplate: builder.mutation<
      ApiResponse<ScreeningTemplate>,
      CreateTemplateRequest
    >({
      query: (body) => ({
        url: "/screening-templates",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ScreeningTemplate", id: "LIST" }],
    }),

    // Update an existing template
    updateTemplate: builder.mutation<
      ApiResponse<ScreeningTemplate>,
      { id: string; data: UpdateTemplateRequest }
    >({
      query: ({ id, data }) => ({
        url: `/screening-templates/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ScreeningTemplate", id },
        { type: "ScreeningTemplate", id: "LIST" },
      ],
    }),

    // Delete a template
    deleteTemplate: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/screening-templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "ScreeningTemplate", id },
        { type: "ScreeningTemplate", id: "LIST" },
      ],
    }),

    // Add item to template
    addTemplateItem: builder.mutation<
      ApiResponse<ScreeningTemplateItem>,
      { templateId: string; data: CreateTemplateItemRequest }
    >({
      query: ({ templateId, data }) => ({
        url: `/screening-templates/${templateId}/items`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { templateId }) => [
        { type: "ScreeningTemplate", id: templateId },
        { type: "ScreeningTemplate", id: "LIST" },
      ],
    }),

    // Update template item
    updateTemplateItem: builder.mutation<
      ApiResponse<ScreeningTemplateItem>,
      { templateId: string; itemId: string; data: UpdateTemplateItemRequest }
    >({
      query: ({ templateId, itemId, data }) => ({
        url: `/screening-templates/${templateId}/items/${itemId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { templateId }) => [
        { type: "ScreeningTemplate", id: templateId },
        { type: "ScreeningTemplate", id: "LIST" },
      ],
    }),

    // Delete template item
    deleteTemplateItem: builder.mutation<
      ApiResponse<{ message: string }>,
      { templateId: string; itemId: string }
    >({
      query: ({ templateId, itemId }) => ({
        url: `/screening-templates/${templateId}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { templateId }) => [
        { type: "ScreeningTemplate", id: templateId },
        { type: "ScreeningTemplate", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useGetTemplatesByRoleQuery,
  useLazyGetTemplatesByRoleQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useAddTemplateItemMutation,
  useUpdateTemplateItemMutation,
  useDeleteTemplateItemMutation,
} = screeningTemplatesApi;
