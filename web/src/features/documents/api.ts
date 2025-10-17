import { baseApi } from "@/app/api/baseApi";
import { DocumentStatus, DocumentType } from "@/constants";

// ==================== INTERFACES ====================

export interface Document {
  id: string;
  candidateId: string;
  docType: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  status: DocumentStatus;
  uploadedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  expiryDate?: string;
  notes?: string;
  rejectionReason?: string;
  documentNumber?: string;
  createdAt: string;
  updatedAt: string;
  candidate: {
    id: string;
    name: string;
    contact: string;
    email?: string;
  };
  verifications: DocumentVerification[];
}

export interface DocumentVerification {
  id: string;
  candidateProjectMapId: string;
  documentId: string;
  status: DocumentStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  notes?: string;
  rejectionReason?: string;
  resubmissionRequested: boolean;
  resubmissionRequestedAt?: string;
  resubmissionRequestedBy?: string;
  candidateProjectMap: {
    id: string;
    status: string;
    project: {
      id: string;
      title: string;
    };
  };
}

export interface DocumentStats {
  totalDocuments: number;
  pendingDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
  expiredDocuments: number;
  documentsByType: Record<string, number>;
  documentsByStatus: {
    pending: number;
    verified: number;
    rejected: number;
    expired: number;
    resubmission_required: number;
  };
  averageVerificationTime: number;
}

export interface CandidateProjectDocumentSummary {
  candidateProjectMapId: string;
  candidateId: string;
  candidateName: string;
  projectId: string;
  projectTitle: string;
  totalRequired: number;
  totalSubmitted: number;
  totalVerified: number;
  totalRejected: number;
  totalPending: number;
  allDocumentsVerified: boolean;
  canApproveCandidate: boolean;
  documents: {
    documentId: string;
    docType: string;
    fileName: string;
    status: string;
    verificationStatus: string;
    uploadedAt: string;
    verifiedAt?: string;
  }[];
}

export interface PaginatedDocuments {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== REQUEST TYPES ====================

export interface CreateDocumentRequest {
  candidateId: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  documentNumber?: string;
  notes?: string;
}

export interface UpdateDocumentRequest {
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  documentNumber?: string;
  notes?: string;
}

export interface VerifyDocumentRequest {
  candidateProjectMapId: string;
  status: "verified" | "rejected";
  notes?: string;
  rejectionReason?: string;
}

export interface RequestResubmissionRequest {
  candidateProjectMapId: string;
  reason: string;
}

export interface QueryDocumentsParams {
  candidateId?: string;
  docType?: string;
  status?: string;
  uploadedBy?: string;
  verifiedBy?: string;
  page?: number;
  limit?: number;
  search?: string;
}

// ==================== API ====================

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocuments: builder.query<
      { success: boolean; data: PaginatedDocuments },
      QueryDocumentsParams | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              searchParams.append(key, String(value));
            }
          });
        }
        const queryString = searchParams.toString();
        return `/documents${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Document"],
    }),

    getDocumentById: builder.query<
      { success: boolean; data: Document },
      string
    >({
      query: (id) => `/documents/${id}`,
      providesTags: (_, __, id) => [{ type: "Document", id }],
    }),

    createDocument: builder.mutation<
      { success: boolean; data: Document; message: string },
      CreateDocumentRequest
    >({
      query: (documentData) => ({
        url: "/documents",
        method: "POST",
        body: documentData,
      }),
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary"],
    }),

    updateDocument: builder.mutation<
      { success: boolean; data: Document; message: string },
      { id: string } & UpdateDocumentRequest
    >({
      query: ({ id, ...documentData }) => ({
        url: `/documents/${id}`,
        method: "PATCH",
        body: documentData,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "Document", id },
        "Document",
        "DocumentStats",
        "DocumentSummary",
      ],
    }),

    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({
        url: `/documents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary"],
    }),

    verifyDocument: builder.mutation<
      { success: boolean; data: DocumentVerification; message: string },
      { documentId: string } & VerifyDocumentRequest
    >({
      query: ({ documentId, ...verifyData }) => ({
        url: `/documents/${documentId}/verify`,
        method: "POST",
        body: verifyData,
      }),
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary"],
    }),

    requestResubmission: builder.mutation<
      { success: boolean; data: DocumentVerification; message: string },
      { documentId: string } & RequestResubmissionRequest
    >({
      query: ({ documentId, ...requestData }) => ({
        url: `/documents/${documentId}/request-resubmission`,
        method: "POST",
        body: requestData,
      }),
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary"],
    }),

    getDocumentStats: builder.query<
      { success: boolean; data: DocumentStats },
      void
    >({
      query: () => "/documents/stats",
      providesTags: ["DocumentStats"],
    }),

    getDocumentSummary: builder.query<
      { success: boolean; data: CandidateProjectDocumentSummary },
      string
    >({
      query: (candidateProjectMapId) =>
        `/documents/summary/${candidateProjectMapId}`,
      providesTags: (_, __, id) => [{ type: "DocumentSummary", id }],
    }),

    getVerificationCandidates: builder.query<
      { success: boolean; data: any },
      { page?: number; limit?: number; status?: string; search?: string }
    >({
      query: (params = {}) => ({
        url: "/documents/verification-candidates",
        params,
      }),
      providesTags: ["VerificationCandidates"],
    }),

    // Enhanced Document Verification APIs
    getCandidateProjects: builder.query<
      { success: boolean; data: any[]; message: string },
      string
    >({
      query: (candidateId) => `/documents/candidates/${candidateId}/projects`,
      providesTags: ["DocumentVerification"],
    }),

    getCandidateProjectRequirements: builder.query<
      { success: boolean; data: any; message: string },
      { candidateId: string; projectId: string }
    >({
      query: ({ candidateId, projectId }) =>
        `/documents/candidates/${candidateId}/projects/${projectId}/requirements`,
      providesTags: ["DocumentVerification"],
    }),

    reuseDocument: builder.mutation<
      { success: boolean; data: any; message: string },
      { documentId: string; projectId: string }
    >({
      query: ({ documentId, projectId }) => ({
        url: `/documents/${documentId}/reuse`,
        method: "POST",
        body: { projectId },
      }),
      invalidatesTags: ["DocumentVerification"],
    }),

    completeVerification: builder.mutation<
      { success: boolean; data: any; message: string },
      { candidateProjectMapId: string }
    >({
      query: ({ candidateProjectMapId }) => ({
        url: `/documents/complete-verification`,
        method: "POST",
        body: { candidateProjectMapId },
      }),
      invalidatesTags: ["DocumentVerification"],
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useGetDocumentByIdQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useVerifyDocumentMutation,
  useRequestResubmissionMutation,
  useGetDocumentStatsQuery,
  useGetDocumentSummaryQuery,
  useGetVerificationCandidatesQuery,
  useGetCandidateProjectsQuery,
  useGetCandidateProjectRequirementsQuery,
  useReuseDocumentMutation,
  useCompleteVerificationMutation,
} = documentsApi;
