/**
 * Project domain model - canonical types and interfaces
 * Following FE_GUIDELINES.md entities pattern
 */

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  creatorId: string;
  teamId: string | null;
  client: {
    id: string;
    name: string;
    type: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
  } | null;
  rolesNeeded: RoleNeeded[];
  candidateProjects: CandidateProject[];
}

export interface RoleNeeded {
  id: string;
  designation: string;
  quantity: number;
  priority: string;
  minExperience?: number;
  maxExperience?: number;
  specificExperience?: string;
  educationRequirements?: string;
  requiredCertifications?: string;
  institutionRequirements?: string;
  skills?: string;
  technicalSkills?: string;
  languageRequirements?: string;
  licenseRequirements?: string;
  backgroundCheckRequired: boolean;
  drugScreeningRequired: boolean;
  shiftType?: string;
  onCallRequired: boolean;
  physicalDemands?: string;
  minSalaryRange?: number;
  maxSalaryRange?: number;
  benefits?: string;
  relocationAssistance: boolean;
  additionalRequirements?: string;
  notes?: string;
}

export interface CandidateProject {
  id: string;
  candidateId: string;
  projectId: string;
  assignedAt: string;
  status: string;
  candidate: {
    id: string;
    name: string;
    contact: string;
    email: string | null;
    currentStatus: string;
  };
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  deadline: string;
  clientId: string;
  teamId?: string;
  rolesNeeded: CreateRoleNeededRequest[];
}

export interface CreateRoleNeededRequest {
  designation: string;
  quantity: number;
  priority?: string;
  minExperience?: number;
  maxExperience?: number;
  specificExperience?: string;
  educationRequirements?: string;
  requiredCertifications?: string;
  institutionRequirements?: string;
  skills?: string;
  technicalSkills?: string;
  languageRequirements?: string;
  licenseRequirements?: string;
  backgroundCheckRequired?: boolean;
  drugScreeningRequired?: boolean;
  shiftType?: string;
  onCallRequired?: boolean;
  physicalDemands?: string;
  minSalaryRange?: number;
  maxSalaryRange?: number;
  benefits?: string;
  relocationAssistance?: boolean;
  additionalRequirements?: string;
  notes?: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: "active" | "completed" | "cancelled";
}

export interface QueryProjectsRequest {
  search?: string;
  status?: "active" | "completed" | "cancelled";
  clientId?: string;
  teamId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
