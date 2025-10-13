// Re-export types from API for feature-specific use
export type {
  Client,
  ClientProject,
  CreateClientRequest,
  UpdateClientRequest,
  QueryClientsRequest,
  ClientsResponse,
  ClientResponse,
  ClientStatsResponse,
} from "./api";

// Additional feature-specific types can be added here
export interface ClientFilters {
  type?: string;
  search?: string;
  relationshipType?: string;
}
