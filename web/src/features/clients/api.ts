import { baseApi } from "@/app/api/baseApi";

// Client Types
export interface Client {
  id: string;
  name: string;
  type:
    | "INDIVIDUAL"
    | "SUB_AGENCY"
    | "HEALTHCARE_ORGANIZATION"
    | "EXTERNAL_SOURCE";
  pointOfContact?: string;
  email?: string;
  phone?: string;
  address?: string;

  // Individual Referrer specific fields
  profession?: string;
  organization?: string;
  relationship?: "CURRENT_EMPLOYEE" | "FORMER_EMPLOYEE" | "NETWORK_CONTACT";

  // Sub-Agency specific fields
  agencyType?: "LOCAL" | "REGIONAL" | "SPECIALIZED";
  specialties?: string[];

  // Healthcare Organization specific fields
  facilityType?: "HOSPITAL" | "CLINIC" | "NURSING_HOME" | "MEDICAL_CENTER";
  facilitySize?: "SMALL" | "MEDIUM" | "LARGE";
  locations?: string[];

  // External Source specific fields
  sourceType?:
    | "JOB_BOARD"
    | "SOCIAL_MEDIA"
    | "REFERRAL_PLATFORM"
    | "INDUSTRY_EVENT"
    | "COLD_OUTREACH"
    | "OTHER";
  sourceName?: string;
  acquisitionMethod?: "ORGANIC" | "PAID" | "PARTNERSHIP" | "REFERRAL";
  sourceNotes?: string;

  // Financial fields
  relationshipType?:
    | "REFERRAL"
    | "PARTNERSHIP"
    | "DIRECT_CLIENT"
    | "EXTERNAL_SOURCE";
  commissionRate?: number;
  paymentTerms?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  billingAddress?: string;
  taxId?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Relations
  projects?: ClientProject[];
}

export interface ClientProject {
  id: string;
  title: string;
  status: string;
  deadline?: string;
}

export interface CreateClientRequest {
  name: string;
  type: Client["type"];
  pointOfContact?: string;
  email?: string;
  phone?: string;
  address?: string;
  profession?: string;
  organization?: string;
  relationship?: string;
  agencyType?: string;
  specialties?: string[];
  facilityType?: string;
  facilitySize?: string;
  locations?: string[];
  sourceType?: string;
  sourceName?: string;
  acquisitionMethod?: string;
  sourceNotes?: string;
  relationshipType?: string;
  commissionRate?: number;
  paymentTerms?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  billingAddress?: string;
  taxId?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string;
}

export interface QueryClientsRequest {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ClientsResponse {
  success: boolean;
  data: {
    clients: Client[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message: string;
}

export interface ClientResponse {
  success: boolean;
  data: Client;
  message: string;
}

export interface ClientStatsResponse {
  success: boolean;
  data: {
    totalClients: number;
    activeProjects: number;
    byType: Record<string, number>;
  };
  message: string;
}

// Clients API
export const clientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all clients with pagination and filters
    getClients: builder.query<ClientsResponse, QueryClientsRequest | void>({
      query: (params) => {
        if (!params) return "/clients";
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value.toString());
          }
        });
        return {
          url: `/clients?${searchParams.toString()}`,
        };
      },
      providesTags: ["Client"],
    }),

    // Get single client by ID
    getClient: builder.query<ClientResponse, string>({
      query: (id) => `/clients/${id}`,
      providesTags: (_, __, id) => [{ type: "Client", id }],
    }),

    // Create new client
    createClient: builder.mutation<ClientResponse, CreateClientRequest>({
      query: (body) => ({
        url: "/clients",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Client"],
    }),

    // Update existing client
    updateClient: builder.mutation<ClientResponse, UpdateClientRequest>({
      query: ({ id, ...body }) => ({
        url: `/clients/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Client", id }, "Client"],
    }),

    // Delete client
    deleteClient: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/clients/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Client"],
    }),

    // Get client statistics
    getClientStats: builder.query<ClientStatsResponse, void>({
      query: () => "/clients/stats",
      providesTags: ["Client"],
    }),
  }),
});

// Export hooks
export const {
  useGetClientsQuery,
  useGetClientQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useGetClientStatsQuery,
} = clientsApi;
