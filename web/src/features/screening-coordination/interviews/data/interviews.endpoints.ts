import { baseApi } from "@/app/api/baseApi";
import type {
  Screening,
  CreateScreeningRequest,
  UpdateScreeningRequest,
  CompleteScreeningRequest,
  QueryScreeningsRequest,
  QueryAssignedScreeningsRequest,
  PaginatedResponse,
  AssignedScreeningItem,
  ApiResponse,
} from "../../types";

export const screeningsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all screenings
    getScreenings: builder.query<PaginatedResponse<Screening>, QueryScreeningsRequest | undefined>({
      query: (params: QueryScreeningsRequest | undefined) => ({
        url: "/screenings",
        params: params as Record<string, any> | undefined,
      }),
      providesTags: (result) =>
        result?.data?.items && Array.isArray(result.data.items)
          ? [
              ...result.data.items.map(({ id }) => ({ type: "Screening" as const, id })),
              { type: "Screening", id: "LIST" },
            ]
          : [{ type: "Screening", id: "LIST" }],
    }),

    // Get a single screening by ID
    getScreening: builder.query<ApiResponse<Screening>, string>({
      query: (id) => `/screenings/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Screening", id }],
    }),

    // Create a new screening (schedule) - supports both single and batch
    createScreening: builder.mutation<any, CreateScreeningRequest | CreateScreeningRequest[]>({
      query: (body) => ({
        url: "/screenings",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Screening", id: "LIST" }, { type: "Candidate", id: "LIST" }],
    }),

    // Update an existing screening
    updateScreening: builder.mutation<ApiResponse<Screening>, { id: string; data: UpdateScreeningRequest }>({
      query: ({ id, data }) => ({
        url: `/screenings/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Screening", id }, { type: "Screening", id: "LIST" }],
    }),

    // Assign a template to a screening
    assignTemplateToScreening: builder.mutation<ApiResponse<Screening>, { id: string; templateId: string }>({
      query: ({ id, templateId }) => ({
        url: `/screenings/${id}/template`,
        method: "PATCH",
        body: { templateId },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Screening", id }, { type: "Screening", id: "LIST" }],
    }),

    // Complete a screening
    completeScreening: builder.mutation<ApiResponse<Screening>, { id: string; data: CompleteScreeningRequest }>({
      query: ({ id, data }) => ({
        url: `/screenings/${id}/complete`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Screening", id },
        { type: "Screening", id: "LIST" },
        { type: "Candidate", id: "LIST" },
        { type: "Training", id: "LIST" },
      ],
    }),

    // Delete a screening
    deleteScreening: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({ url: `/screenings/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Screening", id }, { type: "Screening", id: "LIST" }],
    }),

    // Get assigned candidate-projects for screenings (paginated, latest first)
    getAssignedScreenings: builder.query<PaginatedResponse<AssignedScreeningItem>, QueryAssignedScreeningsRequest | undefined>({
      query: (params: QueryAssignedScreeningsRequest | undefined) => ({
        url: "/screenings/assigned-screenings",
        params: params as Record<string, any> | undefined,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data.items)
          ? [
              ...result.data.items.map(({ id }) => ({ type: "Screening" as const, id })),
              { type: "Screening", id: "LIST" },
            ]
          : [{ type: "Screening", id: "LIST" }],
    }),

    // Get upcoming screenings (paginated) - new endpoint
    getUpcomingScreenings: builder.query<PaginatedResponse<Screening>, Record<string, any> | undefined>({
      query: (params: Record<string, any> | undefined) => ({
        url: "/screenings/upcoming",
        params: { page: 1, limit: 15, ...(params || {}) },
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data.items)
          ? [
              ...result.data.items.map(({ id }) => ({ type: "Screening" as const, id })),
              { type: "Screening", id: "LIST" },
            ]
          : [{ type: "Screening", id: "LIST" }],
    }),

    // Assign candidate to a MAIN interview (creates/links main interview and optionally marks the screening as assigned)
    assignToMainScreening: builder.mutation<ApiResponse<any>, { projectId: string; candidateId: string; screeningId?: string; recruiterId?: string; notes?: string }>({
      query: (body) => ({ url: "/screenings/assign-to-main-interview", method: "POST", body }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Screening", id: "LIST" },
        { type: "Candidate", id: "LIST" },
        { type: "Interview", id: "LIST" },
      ],
    }),

    // Get history for a candidate-project (screening related events)
    getCandidateProjectHistory: builder.query<PaginatedResponse<any>, { candidateProjectMapId: string; page?: number; limit?: number } | undefined>({
      query: (params) => ({ url: `/screenings/candidate-project/${params?.candidateProjectMapId}/history`, params: { page: params?.page ?? 1, limit: params?.limit ?? 20 } }),
      providesTags: (_result, _error, _arg) => (_arg ? [{ type: "Screening", id: _arg.candidateProjectMapId }] : [{ type: "Screening", id: "LIST" }]),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetScreeningsQuery,
  useGetScreeningQuery,
  useLazyGetScreeningQuery,
  useCreateScreeningMutation,
  useUpdateScreeningMutation,
  useAssignTemplateToScreeningMutation,
  useCompleteScreeningMutation,
  useDeleteScreeningMutation,
  useAssignToMainScreeningMutation,
  useGetAssignedScreeningsQuery,
  useGetUpcomingScreeningsQuery,
  useGetCandidateProjectHistoryQuery,
} = screeningsApi;

export default screeningsApi;
