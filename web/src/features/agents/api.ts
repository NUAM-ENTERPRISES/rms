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

export const agentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAgents: builder.query<{ success: boolean; data: Agent[] }, void>({
      query: () => "/agents",
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
  }),
});

export const {
  useGetAgentsQuery,
  useGetAgentQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
} = agentsApi;
