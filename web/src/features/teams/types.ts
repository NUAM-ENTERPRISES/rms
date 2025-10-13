// Re-export types from API for feature-specific use
export type {
  Team,
  TeamMember,
  CreateTeamRequest,
  UpdateTeamRequest,
  QueryTeamsRequest,
  TeamsResponse,
  TeamResponse,
} from "./api";

// Additional feature-specific types can be added here
export interface TeamStats {
  totalTeams: number;
  totalMembers: number;
  averageTeamSize: number;
  teamsByType: Record<string, number>;
}
