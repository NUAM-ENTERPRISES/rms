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

    // Mark a processing step as complete (new endpoint)
    completeStep: builder.mutation<
      { success: boolean; data: any; message: string },
      { stepId: string }
    >({
      query: ({ stepId }) => ({
        url: `/processing/steps/${stepId}/complete`,
        method: "POST",
      }),
      invalidatesTags: () => [
        { type: "ProcessingSteps", id: "LIST" },
        { type: "ProcessingDetails", id: "LIST" },
      ],
    }),

    // Get HRD requirements and uploads for a processing candidate
    getHrdRequirements: builder.query<
      any,
      string
    >({
      query: (processingId) => `/processing/steps/${processingId}/hrd-requirements`,
      transformResponse: (response: { success: boolean; data: any; message: string }) => response.data,
      providesTags: (_result, _error, processingId) => [
        { type: "ProcessingSteps", id: processingId },
        { type: "ProcessingDetails", id: processingId },
      ],
    }),

    // Attach an uploaded document to a HRD step
    attachDocumentToStep: builder.mutation<
      { success: boolean; data: any; message: string },
      { stepId: string; documentId: string; uploadedBy?: string }
    >({
      query: ({ stepId, documentId }) => ({
        url: `/processing/steps/${stepId}/documents`,
        method: "POST",
        body: { documentId },
      }),
      invalidatesTags: () => [
        { type: "ProcessingSteps", id: "LIST" },
        { type: "ProcessingDetails", id: "LIST" },
      ],
    }),

    // Re-upload (replace) an existing candidate document and create a processing verification
    reuploadProcessingDocument: builder.mutation<
      { success: boolean; data: any; message: string },
      {
        oldDocumentId: string;
        candidateProjectMapId: string;
        fileName: string;
        fileUrl: string;
        fileSize?: number;
        mimeType?: string;
        expiryDate?: string;
        documentNumber?: string;
        notes?: string;
        roleCatalogId?: string;
        processingStepId?: string;
        docType?: string;
      }
    >({
      query: (body) => ({
        url: `/processing/documents/reupload`,
        method: "POST",
        body,
      }),
      invalidatesTags: () => [
        { type: "ProcessingSteps", id: "LIST" },
        { type: "ProcessingDetails", id: "LIST" },
      ],
    }),

    // Verify a document for a processing step
    verifyProcessingDocument: builder.mutation<
      { success: boolean; data: any; message: string },
      {
        documentId: string;
        processingStepId: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: `/processing/documents/verify`,
        method: "POST",
        body,
      }),
      invalidatesTags: () => [
        { type: "ProcessingSteps", id: "LIST" },
        { type: "ProcessingDetails", id: "LIST" },
      ],
    }),

    // Submit HRD submission date
    submitHrdDate: builder.mutation<
      { success: boolean; data: any; message: string },
      { stepId: string; submittedAt: string }
    >({
      query: ({ stepId, submittedAt }) => ({
        url: `/processing/steps/${stepId}/submit-date`,
        method: "POST",
        body: { submittedAt },
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
  useCompleteStepMutation,
  useGetHrdRequirementsQuery,
  useAttachDocumentToStepMutation,
  useReuploadProcessingDocumentMutation,
  useVerifyProcessingDocumentMutation,
  useSubmitHrdDateMutation,
} = processingApi;
