import { baseApi } from "@/app/api/baseApi";

export interface ProcessingStepTemplate {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  order: number;
  isRequired: boolean;
  hasDocuments: boolean;
  parentId?: string | null;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingStepDocument {
  id: string;
  status: "pending" | "verified" | "rejected";
  notes?: string;
  createdAt: string;
  document: {
    id: string;
    candidateId: string;
    docType: string;
    fileName: string;
    fileUrl: string;
    uploadedBy: string;
    status: string;
    createdAt: string;
  };
}

export interface ProcessingStep {
  id: string;
  processingCandidateId: string;
  templateId: string;
  template: ProcessingStepTemplate;
  status: "pending" | "in_progress" | "completed" | "rejected" | "resubmission_requested";
  assignedTo?: string | null;
  assignedAt?: string | null;
  dueDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  rejectionReason?: string | null;
  meta?: any;
  documents: ProcessingStepDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStepStatusRequest {
  status: "completed" | "in_progress" | "rejected" | "resubmission_requested";
  assignedTo?: string;
  rejectionReason?: string;
  dueDate?: string;
}

export interface ProcessingCandidateDetails {
  id: string;
  candidateId: string;
  projectId: string;
  currentStepKey?: string;
  completedAt?: string;
  candidate: {
    id: string;
    name: string;
    email?: string;
    contact: string;
  };
  project: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
  steps: ProcessingStep[];
}

export const processingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get processing steps for a specific processing candidate
    getProcessingSteps: builder.query<ProcessingStep[], string>({
      query: (processingId) => `/processing/steps/${processingId}`,
      transformResponse: (response: { success: boolean; data: ProcessingStep[]; message: string }) =>
        response.data,
      providesTags: (_result, _error, processingId) => [
        { type: "ProcessingSteps", id: processingId },
      ],
    }),

    // Get full processing details (candidate + project + steps + history)
    getProcessingDetails: builder.query<ProcessingCandidateDetails, string>({
      query: (processingId) => `/processing/candidate-processing-details/${processingId}`,
      transformResponse: (response: { success: boolean; data: ProcessingCandidateDetails; message: string }) =>
        response.data,
      providesTags: (_result, _error, processingId) => [
        { type: "ProcessingDetails", id: processingId },
      ],
    }),

    // Update processing step status
    updateStepStatus: builder.mutation<
      ProcessingStep,
      { stepId: string; data: UpdateStepStatusRequest }
    >({
      query: ({ stepId, data }) => ({
        url: `/processing/steps/${stepId}/status`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: () => [
        { type: "ProcessingSteps", id: "LIST" },
        { type: "ProcessingDetails", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetProcessingStepsQuery,
  useGetProcessingDetailsQuery,
  useUpdateStepStatusMutation,
} = processingApi;
