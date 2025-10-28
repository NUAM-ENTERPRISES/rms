import { baseApi } from "@/api/baseApi";
import {
  ProjectsResponse,
  QueryProjectsParams,
} from "./projectTypes";

/**
 * RTK Query API for Projects
 * Uses baseApi.injectEndpoints() pattern following FE_GUIDELINES.md
 */
export const projectApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ------------------ GET ALL PROJECTS ------------------
    getAllProjects: builder.query<ProjectsResponse, QueryProjectsParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        
        // Add query parameters if they exist
        if (params && typeof params === 'object') {
          if (params.search) searchParams.append('search', params.search);
          if (params.status) searchParams.append('status', params.status);
          if (params.clientId) searchParams.append('clientId', params.clientId);
          if (params.teamId) searchParams.append('teamId', params.teamId);
          if (params.createdBy) searchParams.append('createdBy', params.createdBy);
          if (params.deadlineFrom) searchParams.append('deadlineFrom', params.deadlineFrom);
          if (params.deadlineTo) searchParams.append('deadlineTo', params.deadlineTo);
          if (params.page) searchParams.append('page', params.page.toString());
          if (params.limit) searchParams.append('limit', params.limit.toString());
          if (params.sortBy) searchParams.append('sortBy', params.sortBy);
          if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        }

        return {
          url: `/projects?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Project"],
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetAllProjectsQuery,
  useLazyGetAllProjectsQuery,
} = projectApi;
