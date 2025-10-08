import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";

/**
 * Single baseApi following FE_GUIDELINES.md architecture
 * All feature APIs must use baseApi.injectEndpoints() pattern
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "User",
    "Candidate",
    "Project",
    "ProjectStats",
    "Client",
    "Team",
    "Document",
    "DocumentStats",
    "DocumentSummary",
    "Interview",
    "Role",
    "Country",
    "RoleCatalog",
    "Qualification",
    "SystemConfig",
  ],
  endpoints: () => ({}),
});

// Export hooks will be populated by feature APIs
export const {} = baseApi;
