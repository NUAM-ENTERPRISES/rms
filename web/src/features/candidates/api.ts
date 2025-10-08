import { baseApi } from "@/app/api/baseApi";

// Types
export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  contact: string;
  email?: string;
  profileImage?: string;
  source: string;
  dateOfBirth: string; // Now mandatory
  currentStatus: string;
  totalExperience?: number;
  currentSalary?: number;
  currentEmployer?: string;
  currentRole?: string;
  expectedSalary?: number;

  // Educational Qualifications
  highestEducation?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;

  // Legacy fields for backward compatibility
  experience?: number;
  skills: string[];
  assignedTo?: string;
  matchScore?: number;
  createdAt: string;
  updatedAt: string;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
  projects: CandidateProjectMap[];
  workExperiences?: WorkExperience[];
}

export interface WorkExperience {
  id: string;
  candidateId: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  salary?: number;
  location?: string;
  skills: string[];
  achievements?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkExperienceRequest {
  candidateId: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  salary?: number;
  location?: string;
  skills?: string;
  achievements?: string;
}

export interface UpdateWorkExperienceRequest {
  id: string;
  companyName?: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  salary?: number;
  location?: string;
  skills?: string;
  achievements?: string;
}

export interface CandidateProjectMap {
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

export interface CreateCandidateRequest {
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

export interface UpdateCandidateRequest {
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

export const candidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidates: builder.query<Candidate[], void>({
      query: () => "/candidates",
      transformResponse: (response: {
        success: boolean;
        data: { candidates: Candidate[]; pagination: any };
        message: string;
      }) => {
        return response.data.candidates;
      },
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
      void,
      { candidateId: string; projectId: string }
    >({
      query: ({ candidateId, projectId }) => ({
        url: `/candidates/${candidateId}/projects`,
        method: "POST",
        body: { projectId },
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

    // Work Experience endpoints
    getWorkExperiences: builder.query<WorkExperience[], string | void>({
      query: (candidateId) =>
        candidateId
          ? `/work-experience/candidate/${candidateId}`
          : "/work-experience",
      providesTags: ["WorkExperience"],
    }),
    createWorkExperience: builder.mutation<
      WorkExperience,
      CreateWorkExperienceRequest
    >({
      query: (workExperienceData) => ({
        url: "/work-experience",
        method: "POST",
        body: workExperienceData,
      }),
      invalidatesTags: ["WorkExperience", "Candidate"],
    }),
    updateWorkExperience: builder.mutation<
      WorkExperience,
      UpdateWorkExperienceRequest
    >({
      query: ({ id, ...workExperienceData }) => ({
        url: `/work-experience/${id}`,
        method: "PATCH",
        body: workExperienceData,
      }),
      invalidatesTags: ["WorkExperience", "Candidate"],
    }),
    deleteWorkExperience: builder.mutation<void, string>({
      query: (id) => ({
        url: `/work-experience/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["WorkExperience", "Candidate"],
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
  useGetWorkExperiencesQuery,
  useCreateWorkExperienceMutation,
  useUpdateWorkExperienceMutation,
  useDeleteWorkExperienceMutation,
} = candidatesApi;
