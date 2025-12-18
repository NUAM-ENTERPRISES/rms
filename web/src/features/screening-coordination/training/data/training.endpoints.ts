import { baseApi } from "@/app/api/baseApi";
import type {
  TrainingAssignment,
  TrainingSession,
  CreateTrainingAssignmentRequest,
  UpdateTrainingAssignmentRequest,
  CompleteTrainingRequest,
  CreateTrainingSessionRequest,
  SendForInterviewRequest,
  QueryTrainingAssignmentsRequest,
  ApiResponse,
  PaginatedResponse,
} from "../../types";

// ==================== TRAINING API ENDPOINTS ====================

export const trainingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==================== TRAINING ASSIGNMENTS ====================

    // Get all training assignments
    getTrainingAssignments: builder.query<
      ApiResponse<TrainingAssignment[]>,
      QueryTrainingAssignmentsRequest | void
    >({
      query: (params) => ({
        url: "/training/assignments",
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({
                type: "Training" as const,
                id,
              })),
              { type: "Training", id: "LIST" },
            ]
          : [{ type: "Training", id: "LIST" }],
    }),
    // Get basic training assignments (trainingType === "basic" && mockInterviewId IS NULL)
    getBasicTrainingAssignments: builder.query<
      PaginatedResponse<TrainingAssignment>,
      { page?: number; limit?: number; search?: string; assignedBy?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/training/basic-assignments",
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result?.data?.items && Array.isArray(result.data.items)
          ? [
              ...result.data.items.map((item) => ({ type: "Training" as const, id: item.id })),
              { type: "Training", id: "LIST" },
            ]
          : [{ type: "Training", id: "LIST" }],
    }),

    // Get a single training assignment by ID
    getTrainingAssignment: builder.query<
      ApiResponse<TrainingAssignment>,
      string
    >({
      query: (id) => `/training/assignments/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Training", id }],
    }),

    // Create a new training assignment
    createTrainingAssignment: builder.mutation<
      ApiResponse<TrainingAssignment>,
      CreateTrainingAssignmentRequest
    >({
      query: (body) => ({
        url: "/training/assignments",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Training", id: "LIST" },
        { type: "Candidate", id: "LIST" },
      ],
    }),

    // Update an existing training assignment
    updateTrainingAssignment: builder.mutation<
      ApiResponse<TrainingAssignment>,
      { id: string; data: UpdateTrainingAssignmentRequest }
    >({
      query: ({ id, data }) => ({
        url: `/training/assignments/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Training", id },
        { type: "Training", id: "LIST" },
      ],
    }),

    // Start a training assignment
    startTraining: builder.mutation<ApiResponse<TrainingAssignment>, string>({
      query: (id) => ({
        url: `/training/assignments/${id}/start`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Training", id },
        { type: "Training", id: "LIST" },
        { type: "Candidate", id: "LIST" },
      ],
    }),

    // Complete a training assignment
    completeTraining: builder.mutation<
      ApiResponse<TrainingAssignment>,
      { id: string; data: CompleteTrainingRequest }
    >({
      query: ({ id, data }) => ({
        url: `/training/assignments/${id}/complete`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Training", id },
        { type: "Training", id: "LIST" },
        { type: "Candidate", id: "LIST" },
      ],
    }),

    // Delete a training assignment
    deleteTrainingAssignment: builder.mutation<
      ApiResponse<{ message: string }>,
      string
    >({
      query: (id) => ({
        url: `/training/assignments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Training", id },
        { type: "Training", id: "LIST" },
      ],
    }),

    // ==================== TRAINING SESSIONS ====================

    // Create a new training session
    createTrainingSession: builder.mutation<
      ApiResponse<TrainingSession>,
      CreateTrainingSessionRequest
    >({
      query: (body) => ({
        url: "/training/sessions",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { trainingAssignmentId }) => [
        { type: "Training", id: trainingAssignmentId },
        { type: "Training", id: "LIST" },
      ],
    }),

    // Update a training session
    updateTrainingSession: builder.mutation<
      ApiResponse<TrainingSession>,
      { id: string; data: Partial<CreateTrainingSessionRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/training/sessions/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error) => [{ type: "Training", id: "LIST" }],
    }),

    // Complete a training session
    completeTrainingSession: builder.mutation<
      ApiResponse<TrainingSession>,
      {
        id: string;
        data: { performanceRating: string; notes?: string; feedback?: string };
      }
    >({
      query: ({ id, data }) => ({
        url: `/training/sessions/${id}/complete`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Training", id: "LIST" }],
    }),

    // Delete a training session
    deleteTrainingSession: builder.mutation<
      ApiResponse<{ message: string }>,
      string
    >({
      query: (id) => ({
        url: `/training/sessions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Training", id: "LIST" }],
    }),
    // Send candidate for interview (training-specific API)
    sendForInterview: builder.mutation<ApiResponse<any>, SendForInterviewRequest>({
      query: (body) => ({
        // Backend exposes POST /training/send-for-interview
        // Keep path consistent with controller
        url: "/training/send-for-interview",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, _body) => [
        { type: "Training", id: "LIST" },
        { type: "Training", id: "HISTORY" },
        { type: "Candidate", id: "LIST" },
      ],
    }),
    // Get training assignment history for a candidateProjectMap
    getTrainingHistory: builder.query<
      PaginatedResponse<any>,
      { candidateProjectMapId: string; page?: number; limit?: number; status?: string } | void
    >({
      query: (params) => {
        const candidateProjectMapId = params?.candidateProjectMapId as string;
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 20;
        const status = params?.status;

        return {
          url: `/training/assignments/${candidateProjectMapId}/history`,
          params: { page, limit, status: status || undefined },
        };
      },
      providesTags: (result) =>
        result?.data?.items && Array.isArray(result.data.items)
          ? [
              ...result.data.items.map((item: any) => ({ type: "Training" as const, id: item.id })),
              { type: "Training", id: "HISTORY" },
            ]
          : [{ type: "Training", id: "HISTORY" }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetTrainingAssignmentsQuery,
  useGetTrainingAssignmentQuery,
  useGetBasicTrainingAssignmentsQuery,
  useGetTrainingHistoryQuery,
  useLazyGetTrainingAssignmentQuery,
  useCreateTrainingAssignmentMutation,
  useUpdateTrainingAssignmentMutation,
  useStartTrainingMutation,
  useCompleteTrainingMutation,
  useDeleteTrainingAssignmentMutation,
  useCreateTrainingSessionMutation,
  useUpdateTrainingSessionMutation,
  useCompleteTrainingSessionMutation,
  useDeleteTrainingSessionMutation,
  useSendForInterviewMutation,
} = trainingApi;

// Alias exports for convenience
export const useCreateSessionMutation = useCreateTrainingSessionMutation;
export const useCompleteSessionMutation = useCompleteTrainingSessionMutation;
