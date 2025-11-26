import { baseApi } from "@/app/api/baseApi";
import type {
  MockInterviewTemplate,
  MockInterviewTemplateItem,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateTemplateItemRequest,
  UpdateTemplateItemRequest,
  QueryTemplatesRequest,
  ApiResponse,
} from "../../types";

// ==================== MOCK INTERVIEW TEMPLATES API ENDPOINTS ====================

export const mockInterviewTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all templates
    getTemplates: builder.query<
      ApiResponse<MockInterviewTemplate[]>,
      QueryTemplatesRequest | void
    >({
      query: (params) => ({
        url: "/mock-interview-templates",
        params,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({
                type: "MockInterviewTemplate" as const,
                id,
              })),
              { type: "MockInterviewTemplate", id: "LIST" },
            ]
          : [{ type: "MockInterviewTemplate", id: "LIST" }],
    }),

    // Get a single template by ID
    getTemplate: builder.query<ApiResponse<MockInterviewTemplate>, string>({
      query: (id) => `/mock-interview-templates/${id}`,
      providesTags: (result, error, id) => [
        { type: "MockInterviewTemplate", id },
      ],
    }),

    // Get templates by role ID
    getTemplatesByRole: builder.query<
      ApiResponse<MockInterviewTemplate[]>,
      { roleId: string; isActive?: boolean }
    >({
      query: ({ roleId, isActive }) => ({
        url: `/mock-interview-templates/role/${roleId}`,
        params: { isActive },
      }),
      providesTags: (result, error, { roleId }) => [
        { type: "MockInterviewTemplate", id: `ROLE-${roleId}` },
        { type: "MockInterviewTemplate", id: "LIST" },
      ],
    }),

    // Create a new template
    createTemplate: builder.mutation<
      ApiResponse<MockInterviewTemplate>,
      CreateTemplateRequest
    >({
      query: (body) => ({
        url: "/mock-interview-templates",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "MockInterviewTemplate", id: "LIST" }],
    }),

    // Update an existing template
    updateTemplate: builder.mutation<
      ApiResponse<MockInterviewTemplate>,
      { id: string; data: UpdateTemplateRequest }
    >({
      query: ({ id, data }) => ({
        url: `/mock-interview-templates/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "MockInterviewTemplate", id },
        { type: "MockInterviewTemplate", id: "LIST" },
      ],
    }),

    // Delete a template
    deleteTemplate: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/mock-interview-templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "MockInterviewTemplate", id },
        { type: "MockInterviewTemplate", id: "LIST" },
      ],
    }),

    // Add item to template
    addTemplateItem: builder.mutation<
      ApiResponse<MockInterviewTemplateItem>,
      { templateId: string; data: CreateTemplateItemRequest }
    >({
      query: ({ templateId, data }) => ({
        url: `/mock-interview-templates/${templateId}/items`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { templateId }) => [
        { type: "MockInterviewTemplate", id: templateId },
        { type: "MockInterviewTemplate", id: "LIST" },
      ],
    }),

    // Update template item
    updateTemplateItem: builder.mutation<
      ApiResponse<MockInterviewTemplateItem>,
      { templateId: string; itemId: string; data: UpdateTemplateItemRequest }
    >({
      query: ({ templateId, itemId, data }) => ({
        url: `/mock-interview-templates/${templateId}/items/${itemId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { templateId }) => [
        { type: "MockInterviewTemplate", id: templateId },
        { type: "MockInterviewTemplate", id: "LIST" },
      ],
    }),

    // Delete template item
    deleteTemplateItem: builder.mutation<
      ApiResponse<{ message: string }>,
      { templateId: string; itemId: string }
    >({
      query: ({ templateId, itemId }) => ({
        url: `/mock-interview-templates/${templateId}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { templateId }) => [
        { type: "MockInterviewTemplate", id: templateId },
        { type: "MockInterviewTemplate", id: "LIST" },
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
} = mockInterviewTemplatesApi;
