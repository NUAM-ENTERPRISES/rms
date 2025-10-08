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
} = teamsApi;
