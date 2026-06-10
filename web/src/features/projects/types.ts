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
  ProjectSummaryListItem,
  PaginatedProjectSummaryResponse,
  ProjectStats,
} from "./api";

// Additional feature-specific types can be added here
export interface ProjectFilters {
  search?: string;
  status?: "in_progress" | "completed" | "on_hold" | "cancelled";
  clientId?: string;
  teamId?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}
