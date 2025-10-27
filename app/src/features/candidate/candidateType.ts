// Candidate Status Enum
export type CandidateStatus = 'new' | 'shortlisted' | 'selected' | 'rejected' | 'hired';

// Candidate Source Enum  
export type CandidateSource = 'manual' | 'meta' | 'referral';

// Base Candidate Interface
export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  mobileNumber: string;
  currentStatus: CandidateStatus;
  dateOfBirth: string;
  profileImage: string | null;
  skills: string[];
  expectedSalary: number | null;
  currentEmployer: string | null;
  currentRole: string | null;
  currentSalary: number | null;
  experience: number | null;
  totalExperience: number | null;
  gpa: number | null;
  graduationYear: number | null;
  highestEducation: string | null;
  university: string | null;
  source: CandidateSource;
  teamId: string | null;
  team: {
    id: string;
    name: string;
  } | null;
  projects: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  qualifications: Array<{
    id: string;
    name: string;
  }>;
  workExperiences: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
  
  // Legacy fields for backward compatibility
  name?: string;
  contact?: string;
  recruiter?: {
    id: string;
    name: string;
    email?: string;
  };
  location?: string;
  qualification?: string;
  resume?: string;
  notes?: string;
}

// Query Parameters for Candidates API
export interface QueryCandidatesParams {
  search?: string;
  currentStatus?: CandidateStatus;
  source?: CandidateSource;
  teamId?: string;
  assignedTo?: string; // Recruiter ID
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'experience' | 'expectedSalary';
  sortOrder?: 'asc' | 'desc';
}

// Pagination Interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated Candidates Response
export interface PaginatedCandidates {
  candidates: Candidate[];
  pagination: Pagination;
}

// API Response Interface
export interface CandidatesApiResponse {
  success: boolean;
  data: PaginatedCandidates;
  message: string;
}

// Single Candidate API Response
export interface CandidateApiResponse {
  success: boolean;
  data: Candidate;
  message: string;
}

// Candidate State for Redux
export interface CandidateState {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  totalCandidates: number;
  pagination: Pagination | null;
  filters: QueryCandidatesParams;
  loading: boolean;
  error: string | null;
}

// Create/Update Candidate Payload
export interface CreateCandidatePayload {
  name: string;
  contact: string;
  email: string;
  experience: number;
  skills: string[];
  expectedSalary: number;
  source?: CandidateSource;
  location?: string;
  qualification?: string;
  notes?: string;
  teamId?: string;
  assignedTo?: string;
}

export interface UpdateCandidatePayload extends Partial<CreateCandidatePayload> {
  id: string;
  currentStatus?: CandidateStatus;
}