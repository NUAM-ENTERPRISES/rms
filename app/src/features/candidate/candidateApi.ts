import { baseApi } from '../../api/baseApi';
import type {
  CandidatesApiResponse,
  CandidateApiResponse,
  QueryCandidatesParams,
  Candidate,
  CreateCandidatePayload,
  UpdateCandidatePayload,
} from './candidateType';

export const candidateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get All Candidates with pagination and filtering
    getAllCandidates: builder.query<CandidatesApiResponse, QueryCandidatesParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        // Add all parameters to search params if they exist
        if (params.search) searchParams.append('search', params.search);
        if (params.currentStatus) searchParams.append('currentStatus', params.currentStatus);
        if (params.source) searchParams.append('source', params.source);
        if (params.teamId) searchParams.append('teamId', params.teamId);
        if (params.assignedTo) searchParams.append('assignedTo', params.assignedTo);
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        
        return {
          url: `candidates?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) => [
        { type: 'Candidate', id: 'LIST' },
        ...(result?.data?.candidates?.map(({ id }) => ({ type: 'Candidate' as const, id })) || []),
      ],
    }),

    // Get Single Candidate by ID
    getCandidateById: builder.query<CandidateApiResponse, string>({
      query: (id) => ({
        url: `candidates/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Candidate', id }],
    }),

    // Create New Candidate
    createCandidate: builder.mutation<CandidateApiResponse, CreateCandidatePayload>({
      query: (candidateData) => ({
        url: 'candidates',
        method: 'POST',
        body: candidateData,
      }),
      invalidatesTags: [{ type: 'Candidate', id: 'LIST' }],
    }),

    // Update Candidate
    updateCandidate: builder.mutation<CandidateApiResponse, UpdateCandidatePayload>({
      query: ({ id, ...candidateData }) => ({
        url: `candidates/${id}`,
        method: 'PATCH',
        body: candidateData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Candidate', id },
        { type: 'Candidate', id: 'LIST' },
      ],
    }),

    // Delete Candidate
    deleteCandidate: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `candidates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Candidate', id },
        { type: 'Candidate', id: 'LIST' },
      ],
    }),

    // Update Candidate Status
    updateCandidateStatus: builder.mutation<
      CandidateApiResponse,
      { id: string; currentStatus: string }
    >({
      query: ({ id, currentStatus }) => ({
        url: `candidates/${id}/status`,
        method: 'PATCH',
        body: { currentStatus },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Candidate', id },
        { type: 'Candidate', id: 'LIST' },
      ],
    }),

    // Get Candidates by Team
    getCandidatesByTeam: builder.query<CandidatesApiResponse, string>({
      query: (teamId) => ({
        url: `candidates?teamId=${teamId}`,
        method: 'GET',
      }),
      providesTags: (result, error, teamId) => [
        { type: 'Candidate', id: `TEAM-${teamId}` },
      ],
    }),

    // Get Candidates by Recruiter
    getCandidatesByRecruiter: builder.query<CandidatesApiResponse, string>({
      query: (recruiterId) => ({
        url: `candidates?assignedTo=${recruiterId}`,
        method: 'GET',
      }),
      providesTags: (result, error, recruiterId) => [
        { type: 'Candidate', id: `RECRUITER-${recruiterId}` },
      ],
    }),

    // Search Candidates
    searchCandidates: builder.query<CandidatesApiResponse, string>({
      query: (searchTerm) => ({
        url: `candidates?search=${encodeURIComponent(searchTerm)}`,
        method: 'GET',
      }),
      providesTags: [{ type: 'Candidate', id: 'SEARCH' }],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetAllCandidatesQuery,
  useGetCandidateByIdQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useUpdateCandidateStatusMutation,
  useGetCandidatesByTeamQuery,
  useGetCandidatesByRecruiterQuery,
  useSearchCandidatesQuery,
  // Lazy queries for conditional fetching
  useLazyGetAllCandidatesQuery,
  useLazyGetCandidateByIdQuery,
  useLazySearchCandidatesQuery,
} = candidateApi;