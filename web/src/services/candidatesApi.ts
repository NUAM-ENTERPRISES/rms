import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQuery } from '@/services/baseApi'

interface Candidate {
  id: string
  name: string
  contact: string
  email?: string
  source: string
  dateOfBirth?: string
  currentStatus: string
  experience?: number
  skills: string[]
  currentEmployer?: string
  expectedSalary?: number
  assignedTo?: string
  createdAt: string
  updatedAt: string
  recruiter?: {
    id: string
    name: string
    email: string
  }
  projects: CandidateProjectMap[]
}

interface CandidateProjectMap {
  id: string
  projectId: string
  assignedDate: string
  verified: boolean
  shortlisted: boolean
  selected: boolean
  notes?: string
  project: {
    id: string
    title: string
    client: {
      id: string
      name: string
    }
  }
}

interface CreateCandidateRequest {
  name: string
  contact: string
  email?: string
  source?: string
  dateOfBirth?: string
  experience?: number
  skills?: string[]
  currentEmployer?: string
  expectedSalary?: number
  assignedTo?: string
}

interface UpdateCandidateRequest {
  id: string
  name?: string
  contact?: string
  email?: string
  currentStatus?: string
  experience?: number
  skills?: string[]
  currentEmployer?: string
  expectedSalary?: number
  assignedTo?: string
}

export const candidatesApi = createApi({
  reducerPath: 'candidatesApi',
  baseQuery,
  tagTypes: ['Candidate'],
  endpoints: (builder) => ({
    getCandidates: builder.query<Candidate[], void>({
      query: () => '/candidates',
      providesTags: ['Candidate'],
    }),
    getCandidateById: builder.query<Candidate, string>({
      query: (id) => `/candidates/${id}`,
      providesTags: (_, __, id) => [{ type: 'Candidate', id }],
    }),
    createCandidate: builder.mutation<Candidate, CreateCandidateRequest>({
      query: (candidateData) => ({
        url: '/candidates',
        method: 'POST',
        body: candidateData,
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateCandidate: builder.mutation<Candidate, UpdateCandidateRequest>({
      query: ({ id, ...candidateData }) => ({
        url: `/candidates/${id}`,
        method: 'PATCH',
        body: candidateData,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Candidate', id }, 'Candidate'],
    }),
    deleteCandidate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Candidate'],
    }),
    assignToProject: builder.mutation<void, { candidateId: string; projectId: string }>({
      query: ({ candidateId, projectId }) => ({
        url: `/candidates/${candidateId}/projects`,
        method: 'POST',
        body: { projectId },
      }),
      invalidatesTags: ['Candidate'],
    }),
  }),
})

export const {
  useGetCandidatesQuery,
  useGetCandidateByIdQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useAssignToProjectMutation,
} = candidatesApi
