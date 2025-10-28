import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/services/baseApi";

interface Candidate {
  id: string;
  name: string;
  contact: string;
  email?: string;
  source: string;
  dateOfBirth?: string;
  currentStatus: string;
  experience?: number;
  skills: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
  projects: CandidateProjectMap[];
}

interface CandidateProjectMap {
  id: string;
  projectId: string;
  candidateId: string;
  status: string;
  nominatedDate: string;
  nominatedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  documentsSubmittedDate?: string;
  documentsVerifiedDate?: string;
  selectedDate?: string;
  hiredDate?: string;
  notes?: string;
  rejectionReason?: string;
  project: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
}

interface CreateCandidateRequest {
  name: string;
  contact: string;
  email?: string;
  source?: string;
  dateOfBirth?: string;
  experience?: number;
  skills?: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;
}

interface UpdateCandidateRequest {
  id: string;
  name?: string;
  contact?: string;
  email?: string;
  currentStatus?: string;
  experience?: number;
  skills?: string[];
  currentEmployer?: string;
  expectedSalary?: number;
  assignedTo?: string;
}

export const candidatesApi = createApi({
  reducerPath: "candidatesApi",
  baseQuery,
  tagTypes: ["Candidate"],
  endpoints: (builder) => ({
    getCandidates: builder.query<Candidate[], void>({
      query: () => "/candidates",
      providesTags: ["Candidate"],
    }),
    getCandidateById: builder.query<Candidate, string>({
      query: (id) => `/candidates/${id}`,
      providesTags: (_, __, id) => [{ type: "Candidate", id }],
    }),
    createCandidate: builder.mutation<Candidate, CreateCandidateRequest>({
      query: (candidateData) => ({
        url: "/candidates",
        method: "POST",
        body: candidateData,
      }),
      invalidatesTags: ["Candidate"],
    }),
    updateCandidate: builder.mutation<Candidate, UpdateCandidateRequest>({
      query: ({ id, ...candidateData }) => ({
        url: `/candidates/${id}`,
        method: "PATCH",
        body: candidateData,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "Candidate", id },
        "Candidate",
      ],
    }),
    deleteCandidate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Candidate"],
    }),
    assignToProject: builder.mutation<
      { success: boolean; data: any; message: string },
      { candidateId: string; projectId: string; notes?: string }
    >({
      query: ({ candidateId, projectId, notes }) => ({
        url: `/candidates/${candidateId}/assign-project`,
        method: "POST",
        body: { projectId, notes },
      }),
      invalidatesTags: ["Candidate"],
    }),

    nominateCandidate: builder.mutation<
      { success: boolean; data: CandidateProjectMap; message: string },
      { candidateId: string; projectId: string; notes?: string }
    >({
      query: ({ candidateId, ...nominationData }) => ({
        url: `/candidates/${candidateId}/nominate`,
        method: "POST",
        body: nominationData,
      }),
      invalidatesTags: ["Candidate"],
    }),

    approveOrRejectCandidate: builder.mutation<
      { success: boolean; data: CandidateProjectMap; message: string },
      {
        candidateProjectMapId: string;
        action: "approve" | "reject";
        notes?: string;
        rejectionReason?: string;
      }
    >({
      query: ({ candidateProjectMapId, ...approvalData }) => ({
        url: `/candidates/project-mapping/${candidateProjectMapId}/approve`,
        method: "POST",
        body: approvalData,
      }),
      invalidatesTags: ["Candidate"],
    }),

    getEligibleCandidates: builder.query<
      { success: boolean; data: Candidate[] },
      string
    >({
      query: (projectId) => `/projects/${projectId}/eligible-candidates`,
      providesTags: ["Candidate"],
    }),
  }),
});

export const {
  useGetCandidatesQuery,
  useGetCandidateByIdQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useAssignToProjectMutation,
  useNominateCandidateMutation,
  useApproveOrRejectCandidateMutation,
  useGetEligibleCandidatesQuery,
} = candidatesApi;
