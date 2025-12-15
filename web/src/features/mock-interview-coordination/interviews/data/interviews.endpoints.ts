import { baseApi } from "@/app/api/baseApi";
import type {
  MockInterview,
  CreateMockInterviewRequest,
  UpdateMockInterviewRequest,
  CompleteMockInterviewRequest,
  QueryMockInterviewsRequest,
  QueryAssignedMockInterviewsRequest,
  AssignedMockInterviewItem,
  PaginatedResponse,
  ApiResponse,
} from "../../types";

// ==================== MOCK INTERVIEWS API ENDPOINTS ====================

export const mockInterviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all mock interviews
    getMockInterviews: builder.query<
      ApiResponse<MockInterview[]>,
      QueryMockInterviewsRequest | undefined
    >({
      query: (params: QueryMockInterviewsRequest | undefined) => ({
        url: "/mock-interviews",
        params: params as Record<string, any> | undefined,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({
                type: "MockInterview" as const,
                id,
              })),
              { type: "MockInterview", id: "LIST" },
            ]
          : [{ type: "MockInterview", id: "LIST" }],
    }),

    // Get a single mock interview by ID
    getMockInterview: builder.query<ApiResponse<MockInterview>, string>({
      query: (id) => `/mock-interviews/${id}`,
      providesTags: (_result, _error, id) => [{ type: "MockInterview", id }],
    }),

    // Create a new mock interview (schedule)
    createMockInterview: builder.mutation<
      ApiResponse<MockInterview>,
      CreateMockInterviewRequest
    >({
      query: (body) => ({
        url: "/mock-interviews",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "MockInterview", id: "LIST" },
        { type: "Candidate", id: "LIST" },
      ],
    }),

    // Update an existing mock interview
    updateMockInterview: builder.mutation<
      ApiResponse<MockInterview>,
      { id: string; data: UpdateMockInterviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/mock-interviews/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "MockInterview", id },
        { type: "MockInterview", id: "LIST" },
      ],
    }),

    // Assign a template to an interview
    assignTemplateToInterview: builder.mutation<
      ApiResponse<MockInterview>,
      { id: string; templateId: string }
    >({
      query: ({ id, templateId }) => ({
        url: `/mock-interviews/${id}/template`,
        method: "PATCH",
        body: { templateId },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "MockInterview", id },
        { type: "MockInterview", id: "LIST" },
      ],
    }),

    // Complete a mock interview
    completeMockInterview: builder.mutation<
      ApiResponse<MockInterview>,
      { id: string; data: CompleteMockInterviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/mock-interviews/${id}/complete`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "MockInterview", id },
        { type: "MockInterview", id: "LIST" },
        { type: "Candidate", id: "LIST" },
        { type: "Training", id: "LIST" },
      ],
    }),

    // Delete a mock interview
    deleteMockInterview: builder.mutation<
      ApiResponse<{ message: string }>,
      string
    >({
      query: (id) => ({
        url: `/mock-interviews/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "MockInterview", id },
        { type: "MockInterview", id: "LIST" },
      ],
    }),

    // Get assigned candidate-projects for mock interviews (paginated, latest first)
    getAssignedMockInterviews: builder.query<
      PaginatedResponse<AssignedMockInterviewItem>,
      QueryAssignedMockInterviewsRequest | undefined
    >({
      query: (params: QueryAssignedMockInterviewsRequest | undefined) => ({
        url: "/mock-interviews/assigned-mock-interviews",
        params: params as Record<string, any> | undefined,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data.items)
          ? [
              ...result.data.items.map(({ id }) => ({
                type: "MockInterview" as const,
                id,
              })),
              { type: "MockInterview", id: "LIST" },
            ]
          : [{ type: "MockInterview", id: "LIST" }],
    }),
    // Get upcoming mock interviews (paginated) - new endpoint
    getUpcomingMockInterviews: builder.query<
      PaginatedResponse<MockInterview>,
      Record<string, any> | undefined
    >({
      query: (params: Record<string, any> | undefined) => ({
        url: "/mock-interviews/upcoming",
        // Provide safe defaults so callers that omit page/limit do not cause
        // backend validation errors (page must be >= 1, limit must be >= 1).
        params: { page: 1, limit: 5, ...(params || {}) },
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data.items)
          ? [
              ...result.data.items.map(({ id }) => ({
                type: "MockInterview" as const,
                id,
              })),
              { type: "MockInterview", id: "LIST" },
            ]
          : [{ type: "MockInterview", id: "LIST" }],
    }),
    // Assign candidate to a MAIN interview (creates/links main interview and
    // optionally marks the mock interview as assigned)
    assignToMainInterview: builder.mutation<
      ApiResponse<any>,
      {
        projectId: string;
        candidateId: string;
        mockInterviewId?: string;
        recruiterId?: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/mock-interviews/assign-to-main-interview",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MockInterview", id: "LIST" },
        { type: "Candidate", id: "LIST" },
        { type: "Interview", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetMockInterviewsQuery,
  useGetMockInterviewQuery,
  useLazyGetMockInterviewQuery,
  useCreateMockInterviewMutation,
  useUpdateMockInterviewMutation,
  useAssignTemplateToInterviewMutation,
  useCompleteMockInterviewMutation,
  useDeleteMockInterviewMutation,
  useAssignToMainInterviewMutation,
  useGetAssignedMockInterviewsQuery,
  useGetUpcomingMockInterviewsQuery,
} = mockInterviewsApi;
