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
      QueryMockInterviewsRequest | void
    >({
      query: (params) => ({
        url: "/mock-interviews",
        params,
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
      providesTags: (result, error, id) => [{ type: "MockInterview", id }],
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
      invalidatesTags: (result, error, { id }) => [
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
      invalidatesTags: (result, error, { id }) => [
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
      invalidatesTags: (result, error, id) => [
        { type: "MockInterview", id },
        { type: "MockInterview", id: "LIST" },
      ],
    }),

    // Get assigned candidate-projects for mock interviews (paginated, latest first)
    getAssignedMockInterviews: builder.query<
      PaginatedResponse<AssignedMockInterviewItem>,
      QueryAssignedMockInterviewsRequest | void
    >({
      query: (params) => ({
        url: "/mock-interviews/assigned-mock-interviews",
        params,
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
      Record<string, any> | void
    >({
      query: (params) => ({
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
  }),
});

// Export hooks for usage in components
export const {
  useGetMockInterviewsQuery,
  useGetMockInterviewQuery,
  useLazyGetMockInterviewQuery,
  useCreateMockInterviewMutation,
  useUpdateMockInterviewMutation,
  useCompleteMockInterviewMutation,
  useDeleteMockInterviewMutation,
  useGetAssignedMockInterviewsQuery,
  useGetUpcomingMockInterviewsQuery,
} = mockInterviewsApi;
