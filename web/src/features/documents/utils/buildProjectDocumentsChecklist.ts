import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_CONFIG,
} from "@/constants/document-types";

export interface ProjectDocumentRequirement {
  id: string;
  docType: string;
  mandatory: boolean;
  documentName?: string;
  description?: string;
}

export interface ProjectDocumentVerification {
  status: string;
  document: {
    docType: string;
    fileName?: string;
    documentDisplayName?: string;
    docName?: string;
  };
}

export interface ProjectDocumentsChecklistRow {
  key: string;
  label: string;
  mandatory: boolean;
  isUploaded: boolean;
  fileName?: string;
  verificationStatus?: string;
}

export interface ProjectDocumentsChecklistSummary {
  totalRequired: number;
  totalSubmitted: number;
  missingCount: number;
  missingMandatoryCount: number;
}

export interface ProjectDocumentsChecklistResult {
  rows: ProjectDocumentsChecklistRow[];
  summary: ProjectDocumentsChecklistSummary;
}

function resolveDisplayLabel(
  docType: string,
  fallback?: string,
): string {
  const config =
    DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG];
  return config?.displayName ?? fallback ?? docType.replace(/_/g, " ");
}

function findVerification(
  verifications: ProjectDocumentVerification[],
  docType: string,
): ProjectDocumentVerification | undefined {
  return verifications.find(
    (v) => v.document.docType.toLowerCase() === docType.toLowerCase(),
  );
}

export function buildProjectDocumentsChecklist(input: {
  requirements: ProjectDocumentRequirement[];
  verifications: ProjectDocumentVerification[];
  introductionVideoRequired?: boolean;
  introductionVideo?: ProjectDocumentVerification | null;
  summary?: {
    totalRequired?: number;
    totalSubmitted?: number;
  };
}): ProjectDocumentsChecklistResult {
  const {
    requirements,
    verifications,
    introductionVideoRequired = false,
    introductionVideo = null,
  } = input;

  const rows: ProjectDocumentsChecklistRow[] = requirements.map((req) => {
    const verification = findVerification(verifications, req.docType);
    return {
      key: req.id || req.docType,
      label: resolveDisplayLabel(req.docType, req.documentName),
      mandatory: req.mandatory,
      isUploaded: Boolean(verification),
      fileName: verification?.document.fileName,
      verificationStatus: verification?.status,
    };
  });

  if (introductionVideoRequired) {
    const intro =
      introductionVideo ??
      findVerification(verifications, DOCUMENT_TYPE.INTRODUCTION_VIDEO);
    rows.push({
      key: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
      label: resolveDisplayLabel(DOCUMENT_TYPE.INTRODUCTION_VIDEO, "Introduction Video"),
      mandatory: true,
      isUploaded: Boolean(intro),
      fileName: intro?.document.fileName,
      verificationStatus: intro?.status,
    });
  }

  const totalRequired =
    input.summary?.totalRequired ??
    requirements.length + (introductionVideoRequired ? 1 : 0);
  const totalSubmitted =
    input.summary?.totalSubmitted ?? rows.filter((r) => r.isUploaded).length;
  const missingCount = rows.filter((r) => !r.isUploaded).length;
  const missingMandatoryCount = rows.filter(
    (r) => r.mandatory && !r.isUploaded,
  ).length;

  return {
    rows,
    summary: {
      totalRequired,
      totalSubmitted,
      missingCount,
      missingMandatoryCount,
    },
  };
}
