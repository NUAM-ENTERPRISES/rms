import {
  Project,
  RoleNeeded,
  CandidateProjectMap,
  Client,
  User,
  Team,
} from '@prisma/client';

export interface ProjectWithRelations extends Project {
  client: Client | null;
  creator: User;
  team: Team | null;
  rolesNeeded: RoleNeeded[];
  candidateProjects: (CandidateProjectMap & {
    candidate: {
      id: string;
      name: string;
      contact: string;
      email: string | null;
      currentStatus: string;
    };
  })[];
}

export interface PaginatedProjects {
  projects: ProjectWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  projectsByStatus: {
    active: number;
    completed: number;
    cancelled: number;
  };
  projectsByClient: {
    [clientId: string]: {
      count: number;
      name: string;
    };
  };
  upcomingDeadlines: ProjectWithRelations[];
}
