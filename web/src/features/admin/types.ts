// Re-export types from API for feature-specific use
export type { User, CreateUserRequest, UpdateUserRequest } from "./api";

// Additional feature-specific types can be added here
export interface UserFilters {
  role?: string;
  teamId?: string;
  search?: string;
}

export interface UserStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  usersByTeam: Record<string, number>;
}
