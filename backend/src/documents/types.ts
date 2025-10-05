import {
  Document,
  Candidate,
  CandidateProjectDocumentVerification,
  CandidateProjectMap,
  Project,
} from '@prisma/client';

/**
 * Document with full relations
 */
export interface DocumentWithRelations extends Document {
  candidate: {
    id: string;
    name: string;
    contact: string;
    email: string | null;
  };
  verifications: (CandidateProjectDocumentVerification & {
    candidateProjectMap: {
      id: string;
      status: string;
      project: {
        id: string;
        title: string;
      };
    };
  })[];
}

/**
 * Paginated documents response
 */
export interface PaginatedDocuments {
  documents: DocumentWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Document statistics
 */
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
  averageVerificationTime: number; // in hours
}

/**
 * Document verification summary for a candidate-project
 */
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
    uploadedAt: Date;
    verifiedAt: Date | null;
  }[];
}
