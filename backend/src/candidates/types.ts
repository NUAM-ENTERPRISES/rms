import {
  Candidate,
  CandidateProjectMap,
  User,
  Team,
  Project,
} from '@prisma/client';

export interface CandidateWithRelations extends Candidate {
  recruiter: User | null;
  team: Team | null;
  projects: (CandidateProjectMap & {
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
