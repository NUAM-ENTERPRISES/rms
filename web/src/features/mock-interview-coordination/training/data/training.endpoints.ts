import { baseApi } from "@/app/api/baseApi";
import type {
  TrainingAssignment,
  TrainingSession,
  CreateTrainingAssignmentRequest,
  UpdateTrainingAssignmentRequest,
  CompleteTrainingRequest,
  CreateTrainingSessionRequest,
  QueryTrainingAssignmentsRequest,
  ApiResponse,
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
        params,
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

    // Get a single training assignment by ID
    getTrainingAssignment: builder.query<
      ApiResponse<TrainingAssignment>,
      string
    >({
      query: (id) => `/training/assignments/${id}`,
      providesTags: (result, error, id) => [{ type: "Training", id }],
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
      invalidatesTags: (result, error, { id }) => [
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
      invalidatesTags: (result, error, id) => [
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
      invalidatesTags: (result, error, { id }) => [
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
      invalidatesTags: (result, error, id) => [
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
      invalidatesTags: (result, error, { trainingAssignmentId }) => [
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
      invalidatesTags: (result, error) => [{ type: "Training", id: "LIST" }],
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
  }),
});

// Export hooks for usage in components
export const {
  useGetTrainingAssignmentsQuery,
  useGetTrainingAssignmentQuery,
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
} = trainingApi;

// Alias exports for convenience
export const useCreateSessionMutation = useCreateTrainingSessionMutation;
export const useCompleteSessionMutation = useCompleteTrainingSessionMutation;
