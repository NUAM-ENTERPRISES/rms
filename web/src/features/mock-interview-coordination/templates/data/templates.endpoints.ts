import { baseApi } from "@/app/api/baseApi";
import type {
  MockInterviewChecklistTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  QueryTemplatesRequest,
  ApiResponse,
} from "../../types";

// ==================== MOCK INTERVIEW TEMPLATES API ENDPOINTS ====================

export const mockInterviewTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all templates
    getTemplates: builder.query<
      ApiResponse<MockInterviewChecklistTemplate[]>,
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
    getTemplate: builder.query<
      ApiResponse<MockInterviewChecklistTemplate>,
      string
    >({
      query: (id) => `/mock-interview-templates/${id}`,
      providesTags: (result, error, id) => [
        { type: "MockInterviewTemplate", id },
      ],
    }),

    // Get templates by role ID
    getTemplatesByRole: builder.query<
      ApiResponse<MockInterviewChecklistTemplate[]>,
      { roleId: string; isActive?: boolean }
    >({
      query: ({ roleId, isActive }) => ({
        url: `/mock-interview-templates/role/${roleId}`,
        params: { isActive },
      }),
      providesTags: (result, error, { roleId }) => [
        { type: "MockInterviewTemplate", id: `ROLE-${roleId}` },
      ],
    }),

    // Create a new template
    createTemplate: builder.mutation<
      ApiResponse<MockInterviewChecklistTemplate>,
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
      ApiResponse<MockInterviewChecklistTemplate>,
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

    // Bulk create or update templates
    bulkUpsertTemplates: builder.mutation<
      ApiResponse<any>,
      { roleId: string; templates: CreateTemplateRequest[] }
    >({
      query: ({ roleId, templates }) => ({
        url: `/mock-interview-templates/bulk/${roleId}`,
        method: "POST",
        body: templates,
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: "MockInterviewTemplate", id: "LIST" },
        { type: "MockInterviewTemplate", id: `ROLE-${roleId}` },
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
  useBulkUpsertTemplatesMutation,
} = mockInterviewTemplatesApi;
