
import { baseApi } from "@/app/api/baseApi";

// Document types
export interface Document {
  id: string;
  candidateId: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  documentNumber?: string;
  notes?: string;
  status: string;
  uploadedBy: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentRequest {
  candidateId: string;
  formData: FormData;
}

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
  currentStatus: {
    id: number;
    statusName: string;
  };
  totalExperience?: number;
  currentSalary?: number;
  currentEmployer?: string;
  currentRole?: string;
  expectedSalary?: number;

  // New fields for better contact management
  countryCode?: string;
  mobileNumber?: string;
  name?: string; // Computed field: firstName + lastName

  // Educational Qualifications (legacy fields)
  highestEducation?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;

  // Legacy fields for backward compatibility
  experience?: number;
  skills?: string[];
  assignedTo?: string;
  matchScore?: number;
  createdAt: string;
  updatedAt: string;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
  projects?: CandidateProjectMap[];
  workExperiences?: WorkExperience[];
  qualifications?: (CandidateQualification & {
    qualification: {
      id: string;
      name: string;
      shortName?: string;
      level: string;
      field: string;
      program?: string;
      description?: string;
    };
  })[];

  // Additional properties for detailed view
  assignedRecruiter?: {
    id: string;
    name: string;
    email: string;
  };

  // Pipeline data
  pipeline?: {
    projects: Array<{
      projectId: string;
      projectTitle: string;
      stages: Array<{
        stage: string;
        isCurrent: boolean;
        isCompleted: boolean;
        title: string;
        description: string;
        date?: string;
        icon?: string;
        color?: string;
      }>;
      currentStage: string;
      overallProgress: number;
    }>;
    overallProgress: number;
  };

  // Metrics data
  metrics?: {
    applications: number;
    totalApplications: number;
    interviews: number;
    interviewsScheduled: number;
    interviewsCompleted: number;
    offersReceived: number;
    placements: number;
    averageResponseTime: number;
  };

  // History data
  history?: Array<{
    id: string;
    action: string;
    description: string;
    date: string;
    user: string;
  }>;
}

export interface CandidateQualification {
  id: string;
  qualificationId: string;
  qualificationName?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted: boolean;
  notes?: string;
}

export interface WorkExperience {
  id: string;
  candidateId: string;
  companyName: string;
  roleCatalogId: string;
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
  roleCatalogId: string;
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

export interface CreateCandidateQualificationRequest {
  candidateId: string;
  qualificationId: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted?: boolean;
  notes?: string;
}

export interface UpdateCandidateQualificationRequest {
  id: string;
  qualificationId?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted?: boolean;
  notes?: string;
}

export interface UpdateWorkExperienceRequest {
  id: string;
  companyName?: string;
  roleCatalogId?: string;
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
  title?: string;
  client?: string;
  deadline?: string;
  matchScore?: number;
  isAssigned?: boolean;
  assignedAt?: string;
  currentProjectStatus: {
    id: number;
    statusName: string;
  }
  subStatus: {
    id: number;
    label: string;
  };
 
  project: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCandidateRequest {
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email?: string;
  source?: string;
  dateOfBirth: string;
  totalExperience?: number;
  currentSalary?: number;
  currentEmployer?: string;
  currentRole?: string;
  expectedSalary?: number;
  highestEducation?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  qualifications?: Array<{
    qualificationId: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
    isCompleted: boolean;
    notes?: string;
  }>;
  workExperiences?: Array<{
    companyName: string;
    roleCatalogId: string;
    jobTitle: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
    salary?: number;
    location?: string;
    skills?: string;
    achievements?: string;
  }>;
  skills?: string;
  teamId?: string;
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

export interface UpdateCandidateStatusRequest {
  currentStatusId: number;
  reason?: string;
}

export interface AssignRecruiterRequest {
  recruiterId: string;
  reason?: string;
}

export interface RecruiterAssignment {
  id: string;
  candidateId: string;
  recruiterId: string;
  assignedBy: string;
  assignedAt: string;
  unassignedAt?: string;
  unassignedBy?: string;
  reason?: string;
  isActive: boolean;
  recruiter: {
    id: string;
    name: string;
    email: string;
  };
  assignedByUser: {
    id: string;
    name: string;
    email: string;
  };
  unassignedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface GetCandidatesParams {
  assignedTo?: string;
  page?: number;
  limit?: number;
  status?: string;
}

export interface GetRecruiterMyCandidatesParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface RecruiterMyCandidatesResponse {
  success: boolean;
  data: Candidate[];
  counts: {
    totalAssigned: number;
    untouched: number;
    rnr: number;
    onHold: number;
    interested: number;
    qualified: number;
    future: number;
    working: number;
    notInterested: number;
    otherEnquiry: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message: string;
}

export interface AllCandidatesResponse {
  success?: boolean;
  data?: Candidate[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  counts?: {
    total?: number;
    totalAssigned?: number;
    untouched?: number;
    rnr?: number;
    onHold?: number;
    interested?: number;
    qualified?: number;
    future?: number;
    working?: number;
    notInterested?: number;
    otherEnquiry?: number;
  };
  message?: string;
}

export interface GetCandidateProjectPipelineResponse {
    success: boolean;
    data: {
      candidate: Candidate & {
        mobileNumber?: string;
        countryCode?: string;
        profileImage?: string;
        teamId?: string;
        currentStatusId?: number;
        qualifications?: Array<{
          id: string;
          qualificationId: string;
          university?: string;
          graduationYear?: number;
          gpa?: number;
          isCompleted: boolean;
          notes?: string;
          qualification: {
            id: string;
            name: string;
            shortName?: string;
            description?: string;
          };
        }>;
        experience?: number;
        expectedSalary?: number;
        currentEmployer?: string;
        currentRole?: string;
        graduationYear?: number;
        highestEducation?: string;
        gpa?: number;
        university?: string;
        skills?: string[];
        source?: string;
      };
      project: {
        id: string;
        title: string;
        status: string;
        description?: string;
        deadline?: string;
        createdAt?: string;
        updatedAt?: string;
        priority?: string;
        countryCode?: string;
        projectType?: string;
        resumeEditable?: boolean;
        groomingRequired?: string;
        hideContactInfo?: boolean;
        clientId?: string;
        teamId?: string;
        client?: {
          id: string;
          name: string;
          type?: string;
        };
        team?: {
          id: string;
          name: string;
        };
        rolesNeeded?: Array<{
          id: string;
          designation: string;
          quantity: number;
        }>;
        documentRequirements?: Array<{
          id: string;
          docType: string;
          mandatory: boolean;
        }>;
        interviews?: Array<{
          id: string;
          scheduledTime: string;
          type: string;
        }>;
      };
      history: Array<{
        id: string;
        candidateProjectMapId: string;
        projectStatus: {
          id: number;
          statusName: string;
        };
        changedBy: {
          id: string;
          name: string;
          email: string;
        };
        reason: string;
        notes: string;
        statusChangedAt: string;
        createdAt: string;
        updatedAt: string;
      }>;
      totalEntries: number;
    };
    message: string;
}

export const candidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidates: builder.query<
      {
        data: Candidate[];
        pagination?: any;
        counts?: {
          total?: number;
          totalAssigned?: number;
          untouched?: number;
          rnr?: number;
          onHold?: number;
          interested?: number;
          notInterested?: number;
          otherEnquiry?: number;
          qualified?: number;
          future?: number;
          working?: number;
        };
      },
      GetCandidatesParams | void
    >({
      query: (params) => {
        if (!params) return "/candidates";
        
        const queryParams = new URLSearchParams();
        if (params.assignedTo) queryParams.append('assignedTo', params.assignedTo);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.status) queryParams.append('status', params.status);
        
        const queryString = queryParams.toString();
        return queryString ? `/candidates?${queryString}` : "/candidates";
      },
      transformResponse: (response: any) => {
        const candidates = Array.isArray(response?.data?.candidates)
          ? response.data.candidates
          : Array.isArray(response?.data)
            ? response.data
            : [];

        return {
          data: candidates,
          pagination: response?.data?.pagination ?? response?.pagination,
          counts: response?.counts ?? response?.data?.counts,
        };
      },
      providesTags: ["Candidate"],
    }),
    

    getCandidateProjectPipeline: builder.query<
      GetCandidateProjectPipelineResponse,
      { candidateId: string; projectId: string }
    >({
      query: ({ candidateId, projectId }) =>
        `/candidate-project-pipeline/candidate/${candidateId}/project/${projectId}`,
      transformResponse: (response: GetCandidateProjectPipelineResponse) => {
        return response;
      },
      providesTags: (_, __, { candidateId }) => [{ type: "Candidate", id: candidateId }],
    }),


    getCandidateById: builder.query<Candidate, string>({
      query: (id) => `/candidates/${id}`,
      transformResponse: (response: {
        success: boolean;
        data: Candidate;
        message: string;
      }) => {
        return response.data;
      },
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
      { 
        candidateId: string; 
        projectId: string; 
        roleNeededId?: string;
        recruiterId?: string;
        notes?: string 
      }
    >({
      query: ({ candidateId, projectId, roleNeededId, recruiterId, notes }) => ({
        url: `/candidate-projects/assign`,
        method: "POST",
        body: { candidateId, projectId, roleNeededId, recruiterId, notes },
      }),
      invalidatesTags: (_, __, { projectId, candidateId }) => [
        "Candidate",
        { type: "Project", id: projectId },
        "ProjectCandidates",
      ],
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

    // Candidate Qualifications endpoints
    getCandidateQualifications: builder.query<
      CandidateQualification[],
      string | void
    >({
      query: (candidateId) =>
        candidateId
          ? `/candidate-qualifications/candidate/${candidateId}`
          : "/candidate-qualifications",
      providesTags: ["CandidateQualification"],
    }),
    createCandidateQualification: builder.mutation<
      CandidateQualification,
      CreateCandidateQualificationRequest
    >({
      query: (qualificationData) => ({
        url: "/candidate-qualifications",
        method: "POST",
        body: qualificationData,
      }),
      invalidatesTags: ["CandidateQualification", "Candidate"],
    }),
    updateCandidateQualification: builder.mutation<
      CandidateQualification,
      UpdateCandidateQualificationRequest
    >({
      query: ({ id, ...qualificationData }) => ({
        url: `/candidate-qualifications/${id}`,
        method: "PATCH",
        body: qualificationData,
      }),
      invalidatesTags: ["CandidateQualification", "Candidate"],
    }),
    deleteCandidateQualification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/candidate-qualifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CandidateQualification", "Candidate"],
    }),

    // Document endpoints
    getDocuments: builder.query<
      { documents: Document[]; pagination: any },
      { candidateId: string; page?: number; limit?: number }
    >({
      query: ({ candidateId, page = 1, limit = 20 }) => ({
        url: "/documents",
        params: { candidateId, page, limit },
      }),
      providesTags: ["Document"],
    }),
    uploadDocument: builder.mutation<Document, UploadDocumentRequest>({
      query: ({ candidateId, formData }) => ({
        url: `/upload/document/${candidateId}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Document", "Candidate"],
    }),

    // Status update endpoints
    updateCandidateStatus: builder.mutation<
      { success: boolean; data: Candidate; message: string },
      { candidateId: string; status: UpdateCandidateStatusRequest }
    >({
      query: ({ candidateId, status }) => ({
        url: `/candidates/${candidateId}/status`,
        method: "PATCH",
        body: status,
      }),
      invalidatesTags: (_, __, { candidateId }) => [
        { type: "Candidate", id: candidateId },
        "Candidate",
      ],
    }),

    // Recruiter assignment endpoints
    assignRecruiter: builder.mutation<
      { success: boolean; data: RecruiterAssignment; message: string },
      { candidateId: string; assignment: AssignRecruiterRequest }
    >({
      query: ({ candidateId, assignment }) => ({
        url: `/candidates/${candidateId}/assign-recruiter`,
        method: "POST",
        body: assignment,
      }),
      invalidatesTags: (_, __, { candidateId }) => [
        { type: "Candidate", id: candidateId },
        "Candidate",
      ],
    }),

    getCurrentRecruiterAssignment: builder.query<
      { success: boolean; data: RecruiterAssignment; message: string },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/recruiter-assignment`,
      providesTags: (_, __, candidateId) => [
        { type: "RecruiterAssignment", id: candidateId },
      ],
    }),

    getRecruiterAssignmentHistory: builder.query<
      { success: boolean; data: RecruiterAssignment[]; message: string },
      string
    >({
      query: (candidateId) =>
        `/candidates/${candidateId}/recruiter-assignment-history`,
      providesTags: (_, __, candidateId) => [
        { type: "RecruiterAssignment", id: candidateId },
      ],
    }),

    // Get recruiter's assigned candidates
    getRecruiterMyCandidates: builder.query<
      RecruiterMyCandidatesResponse,
      GetRecruiterMyCandidatesParams | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.status) queryParams.append('status', params.status);
        if (params?.search) queryParams.append('search', params.search);
        
        const queryString = queryParams.toString();
        return queryString 
          ? `/candidates/recruiter/my-candidates?${queryString}` 
          : '/candidates/recruiter/my-candidates';
      },
      providesTags: ["Candidate"],
    }),

    // Status configuration
    getStatusConfig: builder.query<
      { success: boolean; data: Record<string, any>; message: string },
      void
    >({
      query: () => "/candidates/status-config",
      providesTags: ["StatusConfig"],
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
  useGetCandidateQualificationsQuery,
  useCreateCandidateQualificationMutation,
  useUpdateCandidateQualificationMutation,
  useDeleteCandidateQualificationMutation,
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateCandidateStatusMutation,
  useAssignRecruiterMutation,
  useGetCurrentRecruiterAssignmentQuery,
  useGetRecruiterAssignmentHistoryQuery,
  useGetRecruiterMyCandidatesQuery,
  useGetStatusConfigQuery,
  useGetCandidateProjectPipelineQuery,
} = candidatesApi;
