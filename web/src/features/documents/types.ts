// Re-export types from API for feature-specific use
export type {
  Document,
  DocumentVerification,
  DocumentStats,
  CandidateProjectDocumentSummary,
  PaginatedDocuments,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  VerifyDocumentRequest,
  RequestResubmissionRequest,
  QueryDocumentsParams,
} from "./api";

// Additional feature-specific types can be added here
export interface DocumentFilters {
  candidateId?: string;
  docType?: string;
  status?: string;
  uploadedBy?: string;
  verifiedBy?: string;
  search?: string;
}
