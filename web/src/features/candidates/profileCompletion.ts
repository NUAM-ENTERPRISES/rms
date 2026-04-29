import { DOCUMENT_TYPE, type DocumentType } from "@/constants/document-types";
import type { Document } from "@/features/candidates/api";

export type CandidateProfileRequiredDoc = {
  docType: DocumentType;
  label: string;
  mandatory: boolean;
};

export const CANDIDATE_PROFILE_REQUIRED_DOCUMENTS: CandidateProfileRequiredDoc[] = [
  { docType: DOCUMENT_TYPE.RESUME, label: "Resume", mandatory: true },
  { docType: DOCUMENT_TYPE.DEGREE, label: "Degree Certificate", mandatory: true },
  { docType: DOCUMENT_TYPE.PHOTO, label: "Passport Size Photo", mandatory: true },
  { docType: DOCUMENT_TYPE.PASSPORT, label: "Passport Copy", mandatory: true },
  { docType: DOCUMENT_TYPE.AADHAAR, label: "Aadhaar Card", mandatory: true },
  {
    docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
    label: "Registration Certificate",
    mandatory: true,
  },
];

export function getCandidateProfileCompletion(documents: Document[] | undefined) {
  const docs = Array.isArray(documents) ? documents : [];

  const uploadedByType = new Map<string, boolean>();
  for (const d of docs) {
    if (!d?.docType) continue;
    uploadedByType.set(String(d.docType).toLowerCase(), true);
  }

  const required = CANDIDATE_PROFILE_REQUIRED_DOCUMENTS.filter((d) => d.mandatory);
  const requiredCount = required.length;

  const missing = required.filter(
    (r) => !uploadedByType.has(String(r.docType).toLowerCase())
  );

  const completedCount = requiredCount - missing.length;
  const percent =
    requiredCount > 0 ? Math.round((completedCount / requiredCount) * 100) : 0;

  return {
    percent,
    requiredCount,
    completedCount,
    missing,
  };
}

