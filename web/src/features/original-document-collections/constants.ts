export const COLLECTION_TYPE = {
  DIRECT: "direct",
  RECRUITER: "recruiter",
  INTERVIEW_COORDINATOR: "interview_coordinator",
  AGENT: "agent",
  COURIER: "courier",
} as const;

export type CollectionType =
  (typeof COLLECTION_TYPE)[keyof typeof COLLECTION_TYPE];

export const COLLECTION_TYPE_LABELS: Record<CollectionType, string> = {
  direct: "Direct",
  recruiter: "Recruiter",
  interview_coordinator: "Interview Coordinator",
  agent: "Agent",
  courier: "Courier",
};

export const DIRECT_OFFICE = {
  KOCHI: "kochi",
  DELHI: "delhi",
  OTHER: "other",
} as const;

export const DIRECT_OFFICE_LABELS: Record<string, string> = {
  kochi: "Kochi Office",
  delhi: "Delhi Office",
  other: "Other",
};

export const COLLECTION_STATUS = {
  DRAFT: "draft",
  MERGED_UPLOADED: "merged_uploaded",
  LOCKER_SUBMITTED: "locker_submitted",
  COMPLETED: "completed",
} as const;

export const COLLECTION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  merged_uploaded: "Merged Uploaded",
  locker_submitted: "Locker Submitted",
  completed: "Completed",
};

export const COURIER_PARTNERS = [
  "Blue Dart",
  "DTDC",
  "Delhivery",
  "India Post",
  "FedEx",
  "DHL",
  "Other",
] as const;

export const ORIGINAL_DOCUMENT_CHECKLIST = [
  "passport_original",
  "degree_certificate_original",
  "registration_certificate_original",
  "experience_certificate_original",
  "sslc_certificate_original",
  "plus_two_certificate_original",
  "transcript_original",
  "pcc_original",
] as const;
