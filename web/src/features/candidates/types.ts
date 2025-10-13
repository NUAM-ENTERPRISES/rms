// Re-export types from API for feature-specific use
export type {
  Candidate,
  CandidateProjectMap,
  CreateCandidateRequest,
  UpdateCandidateRequest,
} from "./api";

// Additional feature-specific types can be added here
export interface CandidateFilters {
  search?: string;
  status?: string;
  experience?: number;
  skills?: string[];
  assignedTo?: string;
}

export interface CandidateStats {
  total: number;
  active: number;
  placed: number;
  rejected: number;
  byStatus: Record<string, number>;
  byExperience: Record<string, number>;
}
