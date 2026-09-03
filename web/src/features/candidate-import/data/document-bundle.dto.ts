/**
 * Shapes returned by the merged-PDF classification endpoints.
 *
 * Mirrors CandidateDocumentBundle / CandidateDocumentBundleSegment on the
 * backend, including the string status unions those models document.
 */

export type BundleStatus =
  | "queued"
  | "analyzing"
  | "review"
  | "applied"
  | "failed";

export type SegmentStatus =
  | "suggested"
  | "confirmed"
  | "rejected"
  | "applied"
  | "failed";

/** Fields the model lifted off the pages; every one is optional by nature. */
export interface SegmentExtractedFields {
  documentNumber?: string | null;
  fullName?: string | null;
  issuedAt?: string | null;
  expiryDate?: string | null;
  issuer?: string | null;
}

export interface BundleSegment {
  id: string;
  bundleId: string;
  /** 1-based and inclusive, matching what a reviewer sees in a PDF viewer. */
  startPage: number;
  endPage: number;
  docType: string;
  docName: string | null;
  confidence: number | null;
  extracted: SegmentExtractedFields | null;
  /** Human-readable disagreements with the candidate profile. */
  warnings: string[] | null;
  status: SegmentStatus;
  sortOrder: number;
  documentId: string | null;
  error: string | null;
}

export interface DocumentBundle {
  id: string;
  candidateId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  pageCount: number | null;
  status: BundleStatus;
  error: string | null;
  segments: BundleSegment[];
  createdAt: string;
  appliedAt: string | null;
}

export interface UpdateSegmentPayload {
  startPage?: number;
  endPage?: number;
  docType?: string;
  docName?: string | null;
  status?: SegmentStatus;
  extracted?: SegmentExtractedFields;
}

export interface ApplyBundleResult {
  applied: number;
  failed: number;
  documents: Array<{
    segmentId: string;
    documentId?: string;
    docType: string;
    error?: string;
  }>;
}
