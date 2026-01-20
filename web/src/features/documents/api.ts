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
  roleCatalogId?: string;
  roleCatalog?: {
    id: string;
    name: string;
    label: string;
  };
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
    roleCatalogId?: string;
    roleCatalog?: {
      id: string;
      name: string;
      label: string;
    };
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

export interface RecruiterDocumentItem {
  candidateProjectMapId: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    countryCode: string;
  };
  project: {
    id: string;
    title: string;
    client: {
      name: string;
    } | null;
    role?: {
      id: string;
      designation: string;
      roleCatalog?: {
        id: string;
        name: string;
        label: string;
      };
    };
  };
  recruiter: {
    id: string;
    name: string;
  };
  documentDetails: {
    id: string;
    documentId: string;
    docType: string;
    status: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }[];
  progress: {
    docsUploaded: number;
    totalDocsToUpload: number;
    docsPercentage: number;
  };
  lastAction?: {
    status: string;
    performedBy: string;
    at: string;
    reason?: string;
  };
  status: {
    main: string;
    mainLabel: string;
    sub: string;
    subLabel: string;
  };
}

export interface RecruiterDocumentsResponse {
  items: RecruiterDocumentItem[];
  pagination: {
    page: number | string;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts?: {
    pending: number;
    pendingUpload?: number;
    verified: number;
    rejected: number;
  };
}

export interface RecruiterVerifiedRejectedDocumentsResponse {
  items: RecruiterDocumentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    pending: number;
    verified: number;
    rejected: number;
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
  roleCatalogId?: string;
}

export interface UpdateDocumentRequest {
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  documentNumber?: string;
  notes?: string;
  roleCatalogId?: string;
}

export interface VerifyDocumentRequest {
  candidateProjectMapId: string;
  roleCatalogId?: string;
  status: "verified" | "rejected";
  notes?: string;
  rejectionReason?: string;
}

export interface RequestResubmissionRequest {
  candidateProjectMapId: string;
  roleCatalogId?: string;
  reason: string;
}

export interface ReuploadDocumentRequest {
  candidateProjectMapId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  documentNumber?: string;
  notes?: string;
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

export interface RecruiterDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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

    getRecruiterDocuments: builder.query<
      { success: boolean; data: RecruiterDocumentsResponse },
      RecruiterDocumentsParams | void
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
        return `/documents/recruiter-documents${
          queryString ? `?${queryString}` : ""
        }`;
      },
      providesTags: ["Document"],
    }),

    getRecruiterVerifiedRejectedDocuments: builder.query<
      { success: boolean; data: RecruiterVerifiedRejectedDocumentsResponse },
      {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        recruiterId?: string;
      }
    >({
      query: (params) => ({
        url: "/documents/recruiter-verified-rejected-documents",
        params,
      }),
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
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary", "VerificationCandidates"],
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
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary", "VerificationCandidates"],
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
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary", "DocumentVerification"],
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

    reuploadDocument: builder.mutation<
      { success: boolean; data: Document; message: string },
      { documentId: string } & ReuploadDocumentRequest
    >({
      query: ({ documentId, ...reuploadData }) => ({
        url: `/documents/${documentId}/reupload`,
        method: "POST",
        body: reuploadData,
      }),
      invalidatesTags: ["Document", "DocumentStats", "DocumentSummary", "DocumentVerification"],
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
      { 
        success: boolean; 
        data: {
          candidateProjects: any[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          }
        };
        message: string;
      },
      { page?: number; limit?: number; status?: string; search?: string; recruiterId?: string }
    >({
      query: (params = {}) => ({
        url: "/documents/verification-candidates",
        params,
      }),
      providesTags: ["VerificationCandidates"],
    }),

    getVerifiedRejectedDocuments: builder.query<
      {
        success: boolean;
        data: {
          items: any[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
          counts?: { verified?: number; rejected?: number };
        };
        message: string;
      },
      { page?: number; limit?: number; status?: "verified" | "rejected" | "both"; search?: string; recruiterId?: string }
    >({
      query: (params = {}) => ({
        url: "/documents/verified-rejected-documents",
        params,
      }),
      providesTags: ["DocumentVerification"],
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

    // Eligibility and Matchmaking APIs
    getCandidateEligibility: builder.query<
      { success: boolean; data: any; message: string },
      { candidateId: string; projectId: string; roleId: string }
    >({
      query: ({ candidateId, projectId, roleId }) =>
        `/eligibility/candidate/${candidateId}/project/${projectId}/role/${roleId}`,
      providesTags: ["Eligibility"],
    }),

    getMatchmakingProcess: builder.query<
      { success: boolean; data: any; message: string },
      { candidateId: string; projectId: string }
    >({
      query: ({ candidateId, projectId }) =>
        `/eligibility/candidate/${candidateId}/project/${projectId}/matchmaking`,
      providesTags: ["Matchmaking"],
    }),

    reuseDocument: builder.mutation<
      { success: boolean; data: any; message: string },
      { documentId: string; projectId: string; roleCatalogId: string }
    >({
      query: ({ documentId, projectId, roleCatalogId }) => ({
        url: `/documents/${documentId}/reuse`,
        method: "POST",
        body: { projectId, roleCatalogId },
      }),
      invalidatesTags: ["DocumentVerification", "VerificationCandidates"],
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
      invalidatesTags: ["DocumentVerification", "VerificationCandidates"],
    }),

    rejectVerification: builder.mutation<
      { success: boolean; data: any; message: string },
      { candidateProjectMapId: string; reason?: string }
    >({
      query: ({ candidateProjectMapId, reason }) => ({
        url: `/documents/reject-verification`,
        method: "POST",
        body: { candidateProjectMapId, reason },
      }),
      invalidatesTags: ["DocumentVerification", "VerificationCandidates"],
    }),

    getProfessionalAnalytics: builder.query<
      {
        success: boolean;
        data: Array<{
          id: string;
          candidateName: string;
          status: "verified" | "pending" | "rejected";
          docType: string;
          rejectionReason: string | null;
          verifiedBy: string | null;
          createdAt: string;
        }>;
        message: string;
      },
      void
    >({
      query: () => "/documents/analytics/professional",
      providesTags: ["Document"],
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useGetRecruiterDocumentsQuery,
  useGetRecruiterVerifiedRejectedDocumentsQuery,
  useGetDocumentByIdQuery,
  useGetProfessionalAnalyticsQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useVerifyDocumentMutation,
  useRequestResubmissionMutation,
  useReuploadDocumentMutation,
  useGetDocumentStatsQuery,
  useGetDocumentSummaryQuery,
  useGetVerificationCandidatesQuery,
  useGetVerifiedRejectedDocumentsQuery,
  useGetCandidateProjectsQuery,
  useGetCandidateProjectRequirementsQuery,
  useGetCandidateEligibilityQuery,
  useGetMatchmakingProcessQuery,
  useReuseDocumentMutation,
  useCompleteVerificationMutation,
  useRejectVerificationMutation,
} = documentsApi;
