export interface Client {
  id: string;
  name: string;
  pointOfContact: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  acquisitionMethod?: string;
  agencyType?: string;
  billingAddress?: string;
  commissionRate: number;
  contractEndDate?: string;
  contractStartDate?: string;
  facilitySize?: string;
  facilityType?: string;
  locations: string[];
  organization: string;
  paymentTerms?: string;
  profession: string;
  relationship: string;
  relationshipType: string;
  sourceName?: string;
  sourceNotes?: string;
  sourceType?: string;
  specialties: string[];
  taxId?: string;
  type: string;
}

export interface Creator {
  id: string;
  email: string;
  name: string;
  password: string;
  dateOfBirth?: string;
  otp?: string;
  otpExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  countryCode: string;
  profileImage?: string;
  mobileNumber: string;
}

export interface Team {
  id: string;
  name: string;
  // Add other team properties as needed
}

export interface RoleNeeded {
  id: string;
  projectId: string;
  designation: string;
  quantity: number;
  priority: string;
  minExperience: number;
  maxExperience: number;
  skills: string[];
  createdAt: string;
  updatedAt: string;
  additionalRequirements?: string;
  backgroundCheckRequired: boolean;
  benefits?: string;
  drugScreeningRequired: boolean;
  educationRequirements?: string;
  institutionRequirements?: string;
  languageRequirements?: string;
  licenseRequirements?: string;
  notes?: string;
  onCallRequired: boolean;
  physicalDemands?: string;
  relocationAssistance: boolean;
  requiredCertifications: string[];
  salaryRange?: string;
  shiftType: string;
  specificExperience?: string;
  employmentType: string;
  contractDurationYears?: number;
  genderRequirement: string;
  technicalSkills: string[];
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  currentStatus: string;
}

export interface CandidateProject {
  id: string;
  candidateId: string;
  projectId: string;
  roleNeededId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedDate?: string;
  documentsSubmittedDate?: string;
  documentsVerifiedDate?: string;
  hiredDate?: string;
  nominatedBy: string;
  nominatedDate: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  selectedDate?: string;
  status: string;
  assignedAt: string;
  recruiterId: string;
  candidate: Candidate;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  createdBy: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
  priority: string;
  countryCode: string;
  projectType: string;
  client: Client;
  creator: Creator;
  team?: Team;
  rolesNeeded: RoleNeeded[];
  candidateProjects: CandidateProject[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProjects {
  projects: Project[];
  pagination: Pagination;
}

export interface ProjectsResponse {
  success: boolean;
  data: PaginatedProjects;
  message: string;
}

export interface QueryProjectsParams {
  search?: string;
  status?: 'active' | 'completed' | 'cancelled' | 'all';
  clientId?: string;
  teamId?: string;
  createdBy?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'deadline' | 'status';
  sortOrder?: 'asc' | 'desc';
}
