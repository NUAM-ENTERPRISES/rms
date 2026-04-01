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
  currentStatus?: string;
  recruiterId?: string;
  dateFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  gender?: string;
  mainStatus?: string;
  subStatus?: string;
  processingStep?: string;
  countryPreferences?: string[];
  sectorTypes?: string[];
  facilityPreferences?: string[];
  sources?: string[];
  source?: string;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  visaType?: string;
  qualification?: string;
  heightMin?: number;
  heightMax?: number;
  weightMin?: number;
  weightMax?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  workExperienceCompany?: string;
  workExperienceTitle?: string;
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
