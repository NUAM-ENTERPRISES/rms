// Re-export types from API for feature-specific use
export type {
  Project,
  RoleNeeded,
  CandidateProject,
  CreateProjectRequest,
  CreateRoleNeededRequest,
  UpdateProjectRequest,
  QueryProjectsRequest,
  PaginatedProjectsResponse,
  ProjectStats,
} from "./api";

// Additional feature-specific types can be added here
export interface ProjectFilters {
  search?: string;
  status?: "active" | "completed" | "cancelled";
  clientId?: string;
  teamId?: string;
  priority?: "low" | "medium" | "high" | "urgent";
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
    [clientId: string]: number;
  };
  upcomingDeadlines: Project[];
}
