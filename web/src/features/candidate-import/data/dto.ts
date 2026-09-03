/** Wire types for the candidate import wizard. Mirrors the backend DTOs. */

export type ImportBatchStatus =
  | "analyzing"
  | "review"
  | "importing"
  | "completed"
  | "failed";

export type ImportRowStatus =
  | "ready"
  | "needs_review"
  | "duplicate"
  | "invalid"
  | "imported"
  | "failed"
  | "skipped";

export type MappingDecision =
  | "exact"
  | "alias"
  | "ai_match"
  | "ai_new_value"
  | "needs_review"
  | "empty";

export type ImportIssueSeverity = "error" | "warning";

export interface ImportIssue {
  type: string;
  severity: ImportIssueSeverity;
  message: string;
  field?: string;
  reference?: string;
}

export interface CatalogOption {
  id: string;
  name: string;
  label: string;
  shortName?: string | null;
}

export interface CatalogMappingResult {
  raw: string;
  decision: MappingDecision;
  matchedId: string | null;
  matchedLabel: string | null;
  confidence: number;
  reason: string;
  options: CatalogOption[];
  proposedNewValue?: string;
}

export interface RowCatalogMapping {
  professionType: CatalogMappingResult;
  qualification: CatalogMappingResult;
  role: CatalogMappingResult;
}

export interface NormalizedRow {
  firstName: string;
  lastName: string | null;
  countryCode: string;
  mobileNumber: string;
  email: string | null;
  passportNumber: string | null;
  gender?: "MALE" | "FEMALE";
  category: string;
  qualification: string;
  department: string;
  licensingExam?: string;
  dataFlow?: boolean;
  preferredCountries: string[];
  remarks?: string;
  source: string;
  rawLeadSource: string;
}

export interface ImportRow {
  id: string;
  batchId: string;
  sheetName: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalized: NormalizedRow;
  mapping: RowCatalogMapping | null;
  issues: ImportIssue[] | null;
  status: ImportRowStatus;
  recruiterId: string | null;
  candidateId: string | null;
  error: string | null;
}

export interface SheetOwnerSuggestion {
  sheetName: string;
  recruiterId: string | null;
  match: "exact" | "ambiguous" | "none";
  candidates: Array<{ id: string; name: string; email: string }>;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  status: ImportBatchStatus;
  totalRows: number;
  readyRows: number;
  reviewRows: number;
  invalidRows: number;
  importedRows: number;
  failedRows: number;
  sheetOwners: SheetOwnerSuggestion[] | null;
  error: string | null;
  uploadedBy: { id: string; name: string; email: string };
  rows: ImportRow[];
  createdAt: string;
  completedAt: string | null;
}

export interface ImportRowResult {
  rowId: string;
  sheetName: string;
  rowNumber: number;
  success: boolean;
  candidateId?: string;
  error?: string;
}

export interface RecruiterOption {
  id: string;
  name: string;
  email: string;
}

export interface UpdateImportRowPayload {
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  mobileNumber?: string;
  email?: string;
  passportNumber?: string;
  gender?: "MALE" | "FEMALE";
  professionTypeId?: string;
  qualificationId?: string;
  roleCatalogId?: string;
  recruiterId?: string;
  preferredCountries?: string[];
  licensingExam?: string;
  dataFlow?: boolean;
  remarks?: string;
  skip?: boolean;
}

export interface ApproveCatalogValuePayload {
  target:
    | "qualification"
    | "qualification_alias"
    | "role_department"
    | "role_catalog";
  value: string;
  qualificationId?: string;
  level?: "CERTIFICATE" | "DIPLOMA" | "BACHELOR" | "MASTER" | "DOCTORATE";
  field?: string;
  roleDepartmentId?: string;
  professionTypeId?: string;
  label?: string;
  shortName?: string;
}
