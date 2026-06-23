import {
  Document,
  Candidate,
  CandidateProjectDocumentVerification,
  CandidateProjects,
  Project,
  RoleCatalog,
} from '@prisma/client';

/**
 * Document with full relations
 */
export interface DocumentWithRelations extends Document {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    countryCode: string;
    mobileNumber: string;
    email: string | null;
  };
  roleCatalog?: RoleCatalog | null;
  verifications: (CandidateProjectDocumentVerification & {
    candidateProjectMap: {
      id: string;
      currentProjectStatusId: number;
      project: {
        id: string;
        title: string;
      };
    };
  })[];
}

/** Extra fields added by DocumentsService.findAll for recruiter table columns */
export type DocumentListRow = DocumentWithRelations & {
  documentDisplayName?: string;
  /** Alias of docType for stable UI column binding */
  documentType?: string;
};

/**
 * Paginated documents response
 */
export interface PaginatedDocuments {
  documents: DocumentListRow[];
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
    roleCatalogId?: string | null;
    roleCatalog?: RoleCatalog | null;
    uploadedAt: Date;
    verifiedAt: Date | null;
  }[];
}

/** Lean requirement row returned by getCandidateProjectRequirements */
export interface CandidateProjectRequirementRow {
  id: string;
  docType: string;
  mandatory: boolean;
  description: string | null;
  isAutomatic: boolean;
  documentName: string;
  documentType: string;
  uploadRequested?: boolean;
  uploadRequestReason?: string;
  uploadRequestedAt?: string;
}

/** Lean verification row returned by getCandidateProjectRequirements */
export interface CandidateProjectVerificationRow {
  id: string;
  status: string;
  rejectionReason: string | null;
  candidateProjectMapId: string;
  resubmissionRequested: boolean;
  document: {
    id: string;
    docType: string;
    docName: string | null;
    fileName: string;
    fileUrl?: string;
    mimeType?: string | null;
    documentNumber?: string | null;
    issuedAt?: Date | null;
    expiryDate?: Date | null;
    createdAt: Date;
    documentDisplayName: string;
    documentType: string;
  };
}

export interface CandidateProjectRequirementsSummary {
  candidateProjectMapId: string;
  totalRequired: number;
  totalSubmitted: number;
  totalVerified: number;
  totalRejected: number;
  totalPending: number;
  allDocumentsVerified: boolean;
  canApproveCandidate: boolean;
  isSendedForDocumentVerification: boolean;
  isDocumentationReviewed: boolean;
  documentationStatus: string;
  documentationStatusCode: string;
}

export interface CandidateProjectRequirementsResult {
  candidateProject: {
    id: string;
    project: { introductionVideoRequired: boolean };
    recruiter: { id: string; name: string; email: string } | null;
    roleNeeded: {
      id: string;
      designation: string;
      roleCatalog: { id: string; name: string; label: string } | null;
    } | null;
    mainStatus: { name: string; label: string } | null;
    subStatus: { name: string; label: string } | null;
  };
  introductionVideoRequired: boolean;
  introductionVideo: CandidateProjectVerificationRow | null;
  requirements: CandidateProjectRequirementRow[];
  verifications: CandidateProjectVerificationRow[];
  summary: CandidateProjectRequirementsSummary;
}
