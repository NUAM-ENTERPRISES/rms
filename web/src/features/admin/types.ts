// Re-export types from API for feature-specific use
export type {
  UserWithRoles,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest,
  QueryUsersRequest,
  PaginatedUsersData,
  UsersResponse,
  UserResponse,
} from "./api";

// Additional feature-specific types can be added here
export interface UserFilters {
  role?: string;
  search?: string;
}

export interface UserStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
}
