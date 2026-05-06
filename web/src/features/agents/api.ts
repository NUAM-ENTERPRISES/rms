import { baseApi } from "@/app/api/baseApi";

export interface Agent {
  id: string;
  name: string;
  email?: string;
  mobileNumber?: string;
  companyName?: string;
  agentType?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    candidates: number;
    agentProjects?: number;
  };
}

export interface AgentCandidate {
  id: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  contact: string;
  email?: string;
  profileImage?: string;
  createdAt: string;
  currentStatus: {
    id: number;
    statusName: string;
  } | null;
  recruiter: {
    id: string;
    name: string;
    email: string;
  } | null;
  /** Declared intent (agent_candidate_declared_projects), not nomination. */
  declaredProjects?: Array<{
    id: string;
    projectId: string;
    projectTitle: string | null;
  }>;
  /** Placements from candidate_projects (agent detail). */
  candidateProjects?: Array<{
    id: string;
    projectId: string;
    projectTitle: string | null;
    mainStatusLabel: string | null;
    subStatusLabel: string | null;
  }>;
}

export interface GetAgentCandidatesParams {
  id: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AgentCandidatesResponse {
  success: boolean;
  data: AgentCandidate[];
  meta: AgentsListMeta;
}

/** Query params for GET /agents (search, pagination, filters). */
export interface GetAgentsParams {
  search?: string;
  /** When true/false, filters by backend `isActive`. Omit for all agents. */
  isActive?: boolean;
  agentType?: string;
  page?: number;
  limit?: number;
}

export interface AgentsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AgentsListResponse {
  success: boolean;
  data: Agent[];
  meta: AgentsListMeta;
}

export interface AgentProjectRow {
  id: string;
  agentId: string;
  projectId: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    title: string;
    status: string;
    client: { id: string; name: string; type: string } | null;
  };
}

export interface AgentProjectsListResponse {
  success: boolean;
  message: string;
  data: AgentProjectRow[];
  meta: AgentsListMeta;
}

export interface GetAgentProjectsParams {
  id: string;
  page?: number;
  limit?: number;
  /** Case-insensitive partial match on project title or client name */
  search?: string;
}

export interface LinkAgentProjectsPayload {
  links: Array<{ projectId: string; notes?: string }>;
}

/** POST /agents body — core agent fields plus optional initial project links */
export type CreateAgentRequest = Partial<Agent> & {
  projectLinks?: Array<{ projectId: string; notes?: string }>;
};

export const agentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAgents: builder.query<AgentsListResponse, GetAgentsParams | void>({
      query: (params) => {
        const merged: GetAgentsParams = {
          page: 1,
          limit: 10,
          ...(params ?? {}),
        };
        const searchParams = new URLSearchParams();
        Object.entries(merged).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, String(value));
          }
        });
        const qs = searchParams.toString();
        return qs ? `/agents?${qs}` : "/agents";
      },
      transformResponse: (response: {
        success: boolean;
        data: Agent[];
        meta?: AgentsListMeta;
      }): AgentsListResponse => ({
        success: response.success,
        data: response.data ?? [],
        meta:
          response.meta ?? {
            total: response.data?.length ?? 0,
            page: 1,
            limit: response.data?.length ?? 0,
            totalPages: 1,
          },
      }),
      providesTags: ["Agent"],
    }),
    getAgent: builder.query<{ success: boolean; data: Agent }, string>({
      query: (id) => `/agents/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Agent", id }],
    }),
    createAgent: builder.mutation<{ success: boolean; data: Agent }, CreateAgentRequest>({
      query: (body) => ({
        url: "/agents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Agent"],
    }),
    updateAgent: builder.mutation<
      { success: boolean; data: Agent },
      { id: string; body: Partial<Agent> }
    >({
      query: ({ id, body }) => ({
        url: `/agents/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ["Agent", { type: "Agent", id }],
    }),
    deleteAgent: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/agents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Agent"],
    }),
    getAgentCandidates: builder.query<AgentCandidatesResponse, GetAgentCandidatesParams>({
      query: ({ id, ...params }) => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append("search", params.search);
        if (params.status) searchParams.append("status", params.status);
        if (params.page) searchParams.append("page", String(params.page));
        if (params.limit) searchParams.append("limit", String(params.limit));
        const qs = searchParams.toString();
        return qs ? `/agents/${id}/candidates?${qs}` : `/agents/${id}/candidates`;
      },
      providesTags: (_result, _error, { id }) => [{ type: "Agent", id }],
    }),
    getAgentProjects: builder.query<AgentProjectsListResponse, GetAgentProjectsParams | string>({
      query: (arg) => {
        const id = typeof arg === "string" ? arg : arg.id;
        const page = typeof arg === "string" ? 1 : arg.page ?? 1;
        const limit = typeof arg === "string" ? 10 : arg.limit ?? 10;
        const search = typeof arg === "string" ? undefined : arg.search?.trim();
        const searchParams = new URLSearchParams();
        searchParams.append("page", String(page));
        searchParams.append("limit", String(limit));
        if (search) {
          searchParams.append("search", search);
        }
        return `/agents/${id}/projects?${searchParams.toString()}`;
      },
      transformResponse: (
        response: AgentProjectsListResponse & { meta?: AgentsListMeta }
      ): AgentProjectsListResponse => ({
        success: response.success,
        message: response.message,
        data: response.data ?? [],
        meta:
          response.meta ?? {
            total: response.data?.length ?? 0,
            page: 1,
            limit: response.data?.length ?? 0,
            totalPages: 1,
          },
      }),
      providesTags: (_result, _error, arg) => [
        { type: "Agent", id: typeof arg === "string" ? arg : arg.id },
      ],
    }),
    linkAgentProjects: builder.mutation<
      AgentProjectsListResponse,
      { agentId: string; body: LinkAgentProjectsPayload }
    >({
      query: ({ agentId, body }) => ({
        url: `/agents/${agentId}/projects`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { agentId }) => [{ type: "Agent", id: agentId }],
    }),
    unlinkAgentProject: builder.mutation<
      { success: boolean; message: string },
      { agentId: string; projectId: string }
    >({
      query: ({ agentId, projectId }) => ({
        url: `/agents/${agentId}/projects/${projectId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { agentId }) => [{ type: "Agent", id: agentId }],
    }),
    updateAgentProject: builder.mutation<
      { success: boolean; message: string; data: AgentProjectRow },
      { agentId: string; projectId: string; body: { notes?: string; isActive?: boolean } }
    >({
      query: ({ agentId, projectId, body }) => ({
        url: `/agents/${agentId}/projects/${projectId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { agentId }) => [{ type: "Agent", id: agentId }],
    }),
  }),
});

export const {
  useGetAgentsQuery,
  useGetAgentQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
  useGetAgentCandidatesQuery,
  useGetAgentProjectsQuery,
  useLinkAgentProjectsMutation,
  useUnlinkAgentProjectMutation,
  useUpdateAgentProjectMutation,
} = agentsApi;
