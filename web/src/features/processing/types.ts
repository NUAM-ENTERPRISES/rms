export const PROCESSING_STEP_KEYS = [
  "MEDICAL_CERTIFICATE",
  "DOCUMENT_COLLECTION",
  "HRD_ATTESTATION",
  "QVP",
  "DATAFLOW",
  "PROMETRIC",
  "VISA",
  "IMMIGRATION",
  "TICKETING",
  "TRAVEL",
  "JOINING",
] as const;

export type ProcessingStepKey = (typeof PROCESSING_STEP_KEYS)[number];

export type ProcessingStepStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "DONE"
  | "REJECTED"
  | "NOT_APPLICABLE";

export interface ProcessingStep {
  id: string;
  stepKey: ProcessingStepKey;
  status: ProcessingStepStatus;
  slaDays: number;
  dueDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  notApplicableReason?: string | null;
  lastUpdatedById?: string | null;
  updatedAt?: string;
}

export interface ProcessingCandidateSummary {
  candidateProjectMapId: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    countryCode?: string | null;
    mobileNumber?: string | null;
  };
  project: {
    id: string;
    title: string;
    countryCode?: string | null;
    deadline?: string | null;
  };
  steps: ProcessingStep[];
  progress: number;
  currentStep?: ProcessingStep;
}

export interface ProcessingHistoryEntry {
  id: string;
  candidateProjectMapId: string;
  stepKey: ProcessingStepKey;
  previousStatus: ProcessingStepStatus;
  newStatus: ProcessingStepStatus;
  notes?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  changedAt: string;
}

// New API response types for /processing/project/:projectId endpoint
export interface ProcessingCandidate {
  id: string;
  candidateId: string;
  projectId: string;
  roleNeededId: string;
  assignedProcessingTeamUserId: string;
  processingStatus: "assigned" | "in_progress" | "completed" | "cancelled";
  // Optional current step key returned by the list API (e.g., "verify_offer_letter")
  step?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    mobileNumber?: string | null;
    profileImage?: string | null;
  };
  role: {
    id: string;
    designation: string;
    roleCatalog?: {
      id: string;
      name: string;
    };
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  project: {
    id: string;
    title: string;
    country?: {
      code: string;
      name: string;
      flag?: string;
      flagName?: string;
    };
  };
  candidateProjectMap?: {
    id: string;
    candidateId: string;
    projectId: string;
    roleNeededId: string;
    recruiter?: {
      id: string;
      name: string;
      email: string;
    };
  };
}
