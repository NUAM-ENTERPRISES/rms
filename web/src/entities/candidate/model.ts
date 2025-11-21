/**
 * Candidate domain model - canonical types and interfaces
 * Following FE_GUIDELINES.md entities pattern
 */

export interface Candidate {
  id: string;
  name: string;
  contact: string;
  email?: string;
  source: string;
  dateOfBirth?: string;
  currentStatus: string;
  experience?: number;
  skills: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
  projects: CandidateProjectMap[];
}

export interface CandidateProjectMap {
  id: string;
  projectId: string;
  candidateId: string;
  status: string;
  nominatedDate: string;
  nominatedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  documentsSubmittedDate?: string;
  documentsVerifiedDate?: string;
  selectedDate?: string;
  hiredDate?: string;
  notes?: string;
  assignedAt?: string;
  rejectionReason?: string;
  project: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
}

export interface CreateCandidateRequest {
  name: string;
  contact: string;
  email?: string;
  source?: string;
  dateOfBirth?: string;
  experience?: number;
  skills?: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;
}

export interface UpdateCandidateRequest {
  id: string;
  name?: string;
  contact?: string;
  email?: string;
  currentStatus?: string;
  experience?: number;
  skills?: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;
}
