import {
  Candidate,
  CandidateProjects,
  User,
  Team,
  Project,
  WorkExperience,
  RoleCatalog,
  CandidateQualification,
  Qualification,
} from '@prisma/client';

export interface CandidateWithRelations extends Candidate {
  team: Team | null;
  projects: (CandidateProjects & {
    project: {
      id: string;
      title: string;
      status: string;
      client: {
        id: string;
        name: string;
        type: string;
      } | null;
    };
    recruiter?: {
      id: string;
      name: string;
      email: string;
    } | null;
  })[];
  workExperiences: (WorkExperience & { roleCatalog?: RoleCatalog | null })[];
  qualifications: (CandidateQualification & {
    qualification: Qualification;
  })[];
}

export interface PaginatedCandidates {
  candidates: CandidateWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CandidateStats {
  totalCandidates: number;
  newCandidates: number;
  shortlistedCandidates: number;
  selectedCandidates: number;
  rejectedCandidates: number;
  hiredCandidates: number;
  candidatesByStatus: {
    new: number;
    shortlisted: number;
    selected: number;
    rejected: number;
    hired: number;
  };
  candidatesBySource: {
    manual: number;
    meta: number;
    referral: number;
  };
  candidatesByTeam: {
    [teamId: string]: number;
  };
  averageExperience: number;
  averageExpectedSalary: number;
}
