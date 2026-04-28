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
    createAgent: builder.mutation<{ success: boolean; data: Agent }, Partial<Agent>>({
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
  }),
});

export const {
  useGetAgentsQuery,
  useGetAgentQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
  useGetAgentCandidatesQuery,
} = agentsApi;
