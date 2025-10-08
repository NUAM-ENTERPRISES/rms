import { baseApi } from "@/app/api/baseApi";

export interface Team {
  id: string;
  name: string;
  leadId?: string;
  headId?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
  userTeams: TeamMember[];
  projects: any[];
  candidates: any[];
  // Additional properties for display
  description?: string;
  type?: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TeamProject {
  id: string;
  title: string;
  description: string;
  status: "active" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  client: {
    id: string;
    name: string;
    type: string;
  };
  candidatesAssigned: number;
  rolesNeeded: number;
  progress: number;
}

export interface TeamCandidate {
  id: string;
  name: string;
  contact: string;
  email: string;
  currentStatus: string;
  experience: number;
  skills: string[];
  assignedProject: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
  assignedBy: {
    id: string;
    name: string;
    role: string;
  };
  lastActivity: string;
  nextInterview?: string;
}

export interface TeamStats {
  totalMembers: number;
  activeProjects: number;
  totalCandidates: number;
  averageSuccessRate: number;
  totalRevenue: number;
  monthlyGrowth: number;
  completionRate: number;
  totalProjects: number;
  completedProjects: number;
}

export interface CreateTeamRequest {
  name: string;
  leadId?: string;
  headId?: string;
  managerId?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  leadId?: string;
  headId?: string;
  managerId?: string;
}

export interface QueryTeamsRequest {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TeamsResponse {
  success: boolean;
  data: {
    teams: Team[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message: string;
}

export interface TeamResponse {
  success: boolean;
  data: Team;
  message: string;
}

export const teamsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeams: builder.query<TeamsResponse, QueryTeamsRequest | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              searchParams.append(key, value.toString());
            }
          });
        }
        return {
          url: `/teams?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Team"],
    }),

    getTeam: builder.query<TeamResponse, string>({
      query: (id) => ({
        url: `/teams/${id}`,
        method: "GET",
      }),
      providesTags: (_, __, id) => [{ type: "Team", id }],
    }),

    createTeam: builder.mutation<TeamResponse, CreateTeamRequest>({
      query: (body) => ({
        url: "/teams",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Team"],
    }),

    updateTeam: builder.mutation<
      TeamResponse,
      { id: string; body: UpdateTeamRequest }
    >({
      query: ({ id, body }) => ({
        url: `/teams/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Team", id }],
    }),

    deleteTeam: builder.mutation<{ success: boolean; message: string }, string>(
      {
        query: (id) => ({
          url: `/teams/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Team"],
      }
    ),

    assignUserToTeam: builder.mutation<
      { success: boolean; message: string },
      { teamId: string; userId: string; role: string }
    >({
      query: ({ teamId, userId, role }) => ({
        url: `/teams/${teamId}/assign-user`,
        method: "POST",
        body: { userId, role },
      }),
      invalidatesTags: ["Team"],
    }),

    removeUserFromTeam: builder.mutation<
      { success: boolean; message: string },
      { teamId: string; userId: string }
    >({
      query: ({ teamId, userId }) => ({
        url: `/teams/${teamId}/remove-user`,
        method: "DELETE",
        body: { userId },
      }),
      invalidatesTags: ["Team"],
    }),

    // Get team members
    getTeamMembers: builder.query<TeamMember[], string>({
      query: (teamId) => `/teams/${teamId}/members`,
      transformResponse: (response: {
        success: boolean;
        data: TeamMember[];
        message: string;
      }) => {
        return response.data;
      },
      providesTags: (_, __, teamId) => [{ type: "Team", id: teamId }],
    }),

    // Get team projects
    getTeamProjects: builder.query<TeamProject[], string>({
      query: (teamId) => `/teams/${teamId}/projects`,
      transformResponse: (response: {
        success: boolean;
        data: TeamProject[];
        message: string;
      }) => {
        return response.data;
      },
      providesTags: (_, __, teamId) => [{ type: "Project", id: teamId }],
    }),

    // Get team candidates (candidates assigned to projects worked on by team members)
    getTeamCandidates: builder.query<TeamCandidate[], string>({
      query: (teamId) => `/teams/${teamId}/candidates`,
      transformResponse: (response: {
        success: boolean;
        data: TeamCandidate[];
        message: string;
      }) => {
        return response.data;
      },
      providesTags: (_, __, teamId) => [{ type: "Candidate", id: teamId }],
    }),

    // Get team statistics
    getTeamStats: builder.query<TeamStats, string>({
      query: (teamId) => `/teams/${teamId}/stats`,
      transformResponse: (response: {
        success: boolean;
        data: TeamStats;
        message: string;
      }) => {
        return response.data;
      },
      providesTags: (_, __, teamId) => [{ type: "Team", id: teamId }],
    }),

    // Get team performance analytics
    getTeamPerformanceAnalytics: builder.query<any, string>({
      query: (teamId) => `/teams/${teamId}/analytics/performance`,
      transformResponse: (response: {
        success: boolean;
        data: any;
        message: string;
      }) => {
        return response.data;
      },
      providesTags: (_, __, teamId) => [{ type: "Team", id: teamId }],
    }),

    // Get team success rate distribution
    getTeamSuccessRateDistribution: builder.query<any, string>({
      query: (teamId) => `/teams/${teamId}/analytics/success-rate`,
      transformResponse: (response: {
        success: boolean;
        data: any;
        message: string;
      }) => {
        return response.data;
      },
      providesTags: (_, __, teamId) => [{ type: "Team", id: teamId }],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useGetTeamQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useAssignUserToTeamMutation,
  useRemoveUserFromTeamMutation,
  useGetTeamMembersQuery,
  useGetTeamProjectsQuery,
  useGetTeamCandidatesQuery,
  useGetTeamStatsQuery,
  useGetTeamPerformanceAnalyticsQuery,
  useGetTeamSuccessRateDistributionQuery,
} = teamsApi;
