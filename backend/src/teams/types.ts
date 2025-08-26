import { Team, User, Project, Candidate, UserTeam } from '@prisma/client';

export interface TeamWithRelations extends Team {
  userTeams: (UserTeam & {
    user: {
      id: string;
      name: string;
      email: string;
    };
  })[];
  projects: Project[];
  candidates: Candidate[];
}

export interface PaginatedTeams {
  teams: TeamWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeamStats {
  totalTeams: number;
  teamsWithLeads: number;
  teamsWithHeads: number;
  teamsWithManagers: number;
  averageTeamSize: number;
  teamsByMemberCount: {
    [memberCount: string]: number;
  };
  teamsWithProjects: number;
  teamsWithCandidates: number;
  averageProjectsPerTeam: number;
  averageCandidatesPerTeam: number;
}
