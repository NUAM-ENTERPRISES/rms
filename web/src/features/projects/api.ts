import { baseApi } from "@/app/api/baseApi";
import { Candidate } from "@/features/candidates";

// Types
export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  creatorId: string;
  teamId: string | null;
  countryCode: string | null;
  projectType: "private" | "ministry";
  client: {
    id: string;
    name: string;
    type: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
  } | null;
  rolesNeeded: RoleNeeded[];
  candidateProjects: CandidateProject[];
  documentRequirements?: DocumentRequirement[];
  resumeEditable?: boolean;
  groomingRequired?: "formal" | "casual" | "not_specified";
  hideContactInfo?: boolean;
  requiredScreening?: boolean;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  accommodation?: boolean;
  food?: boolean;
  transport?: boolean;
  country?: {
    code: string;
    name: string;
    region?: string;
    callingCode?: string;
    currency?: string;
    timezone?: string;
  };
}

export interface RoleNeeded {
  id: string;
  designation: string;
  quantity: number;
  priority: string;
  minExperience?: number;
  maxExperience?: number;
  specificExperience?: string;
  ageRequirement?: string;
  educationRequirements?: string;
  educationRequirementsList?: EducationRequirementWithDetails[];
  requiredCertifications?: string;
  institutionRequirements?: string;
  skills?: string;
  technicalSkills?: string;
  employmentType: "contract" | "permanent";
  contractDurationYears?: number;
  visaType?: "contract" | "permanent";
  genderRequirement: "female" | "male" | "all" | "other";
  minAge?: number;
  maxAge?: number;
  accommodation?: boolean;
  food?: boolean;
  transport?: boolean;
  target?: number;
  languageRequirements?: string;
  licenseRequirements?: string;
  backgroundCheckRequired: boolean;
  drugScreeningRequired: boolean;
  shiftType?: string;
  onCallRequired: boolean;
  physicalDemands?: string;
  salaryRange?: string;
  benefits?: string;
  relocationAssistance: boolean;
  additionalRequirements?: string;
  notes?: string;
  roleCatalog?: {
    id: string;
    name: string;
    label: string;
    shortName: string;
    isActive: boolean;
    roleDepartment: {
      id: string;
      name: string;
      label: string;
      shortName: string;
    };
  };
}

export interface EducationRequirement {
  qualificationId: string;
  mandatory: boolean;
}

export interface EducationRequirementWithDetails {
  id: string;
  qualificationId: string;
  mandatory: boolean;
  qualification: {
    id: string;
    name: string;
    shortName: string;
    level: string;
    field: string;
  };
}

export interface CandidateProject {
  id: string;
  candidateId: string;
  projectId: string;
  assignedAt: string;
  status: string;
  candidate: {
    id: string;
    name: string;
    contact: string;
    email: string | null;
    currentStatus: string;
  };
}

export interface ProjectRole {
  id: string;
  name: string;
  category?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRoleCatalogParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface ProjectRoleCatalogResponse {
  roles: ProjectRole[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  deadline: string;
  clientId: string;
  teamId?: string;
  countryCode?: string;
  projectType: "private" | "ministry";
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  rolesNeeded: CreateRoleNeededRequest[];
  documentRequirements: CreateDocumentRequirementRequest[];
}

export interface CreateDocumentRequirementRequest {
  docType: string;
  mandatory: boolean;
  description?: string;
}

export interface DocumentRequirement {
  id: string;
  docType: string;
  mandatory: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleNeededRequest {
  designation: string;
  quantity: number;
  priority?: string;
  minExperience?: number;
  maxExperience?: number;
  specificExperience?: string;
  ageRequirement?: string;
  accommodation?: boolean;
  food?: boolean;
  transport?: boolean;
  target?: number;
  educationRequirements?: string;
  requiredCertifications?: string;
  institutionRequirements?: string;
  skills?: string;
  technicalSkills?: string;
  languageRequirements?: string;
  licenseRequirements?: string;
  backgroundCheckRequired?: boolean;
  drugScreeningRequired?: boolean;
  shiftType?: string;
  onCallRequired?: boolean;
  physicalDemands?: string;
  salaryRange?: string;
  benefits?: string;
  relocationAssistance?: boolean;
  additionalRequirements?: string;
  notes?: string;
  employmentType?: "contract" | "permanent";
  contractDurationYears?: number;
  genderRequirement?: "female" | "male" | "all" | "other";
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: "active" | "completed" | "cancelled";
}

export interface QueryProjectsRequest {
  search?: string;
  status?: "active" | "completed" | "cancelled";
  clientId?: string;
  teamId?: string;
  countryCode?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedProjectsResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  projectsByStatus: {
    active: number;
    completed: number;
    cancelled: number;
  };
  projectsByClient: {
    [clientId: string]: number;
  };
  upcomingDeadlines: Project[];
}

export interface RecruiterAnalytics {
  urgentProject: {
    id: string;
    title: string;
    priority: string;
    deadline: string | null;
    clientName: string | null;
    daysUntilDeadline: number | null;
  } | null;
  overdueProjects: {
    id: string;
    title: string;
    clientName: string | null;
    overdueDays: number | null;
  }[];
  untouchedCandidatesCount: number;
  untouchedCandidates: {
    id: string;
    name: string;
    countryCode: string | null;
    currentRole: string | null;
    assignedProjectId: string | null;
    assignedProjectTitle: string | null;
  }[];
  hiredOrSelectedCount: number;
  activeCandidateCount: number;
  upcomingInterviewsCount: number;
  assignedProjectCount: number;
}

// Eligible Candidate with match score
// API returns candidate data at root level with matchScore property
export interface EligibleCandidate extends Candidate {
  matchScore: number;
}

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all projects with pagination and filtering
    getProjects: builder.query<
      ApiResponse<PaginatedProjectsResponse>,
      QueryProjectsRequest
    >({
      query: (params) => ({
        url: "/projects",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.projects.map(({ id }) => ({
                type: "Project" as const,
                id,
              })),
              { type: "Project", id: "LIST" },
            ]
          : [{ type: "Project", id: "LIST" }],
    }),

    // Get project by ID
    getProject: builder.query<ApiResponse<Project>, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_, __, id) => [{ type: "Project", id }],
    }),

    // Get project statistics
    getProjectStats: builder.query<ApiResponse<ProjectStats>, void>({
      query: () => "/projects/stats",
      providesTags: ["ProjectStats"],
    }),

    getRecruiterAnalytics: builder.query<ApiResponse<RecruiterAnalytics>, void>(
      {
        query: () => "/projects/recruiter/analytics",
      }
    ),

    // Get eligible candidates for a project
    getEligibleCandidates: builder.query<
      ApiResponse<EligibleCandidate[]>,
      {
        projectId: string;
        search?: string;
        roleCatalogId?: string;
        sortBy?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({
        projectId,
        search,
        roleCatalogId,
        sortBy,
        page = 1,
        limit = 10,
      }) => ({
        url: `/projects/${projectId}/eligible-candidates`,
        params: {
          search,
          roleCatalogId,
          sortBy,
          page,
          limit,
        },
      }),
      providesTags: ["Candidate"],
    }),

    // Create new project
    createProject: builder.mutation<ApiResponse<Project>, CreateProjectRequest>(
      {
        query: (project) => ({
          url: "/projects",
          method: "POST",
          body: project,
        }),
        invalidatesTags: [{ type: "Project", id: "LIST" }, "ProjectStats"],
      }
    ),

    // Update project
    updateProject: builder.mutation<
      ApiResponse<Project>,
      { id: string; data: UpdateProjectRequest }
    >({
      query: ({ id, data }) => ({
        url: `/projects/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "Project", id },
        { type: "Project", id: "LIST" },
        "ProjectStats",
      ],
    }),

    // Delete project
    deleteProject: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Project", id: "LIST" }, "ProjectStats"],
    }),

    // Assign candidate to project
    assignCandidate: builder.mutation<
      ApiResponse<void>,
      { projectId: string; candidateId: string }
    >({
      query: ({ projectId, candidateId }) => ({
        url: `/projects/${projectId}/assign-candidate`,
        method: "POST",
        body: { candidateId },
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),

    // Get project candidates by role
    getProjectCandidatesByRole: builder.query<
      ApiResponse<any[]>,
      { projectId: string; role: string }
    >({
      query: ({ projectId, role }) =>
        `/projects/${projectId}/candidates/role/${role}`,
      providesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
      ],
    }),

    // Get candidates for document verification
    getDocumentVerificationCandidates: builder.query<
      ApiResponse<any[]>,
      string
    >({
      query: (projectId) => `/projects/${projectId}/candidates/verification`,
      providesTags: (_, __, projectId) => [
        { type: "Project", id: projectId },
        "DocumentVerification",
      ],
    }),

    // Send candidate for verification
    sendForVerification: builder.mutation<
      ApiResponse<any>,
      {
        projectId: string;
        candidateId: string;
        roleNeededId?: string;
        recruiterId?: string;
        notes?: string;
      }
    >({
      query: ({
        projectId,
        candidateId,
        roleNeededId,
        recruiterId,
        notes,
      }) => ({
        url: `/candidate-projects/send-for-verification`,
        method: "POST",
        body: {
          candidateId,
          projectId,
          roleNeededId,
          recruiterId,
          notes,
        },
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
        "DocumentVerification",
        // Candidate queries should also refresh so lists that show candidate status update live
        "Candidate",
      ],
    }),

    // Send candidate for interview (either mock or real interview)
    sendForInterview: builder.mutation<
      ApiResponse<any>,
      {
        projectId: string;
        candidateId: string;
        /** Either 'screening_assigned' or 'interview_assigned' */
        type: "screening_assigned" | "interview_assigned";
        recruiterId?: string;
        notes?: string;
      }
    >({
      query: ({ projectId, candidateId, type, recruiterId, notes }) => ({
        url: `/candidate-projects/send-for-interview`,
        method: "POST",
        body: { candidateId, projectId, type, recruiterId, notes },
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
        "Interview",
        "Candidate",
      ],
    }),

    // Send candidate for direct screening (new API)
    sendForScreening: builder.mutation<
      ApiResponse<any>,
      {
        projectId: string;
        candidateId: string;
        roleNeededId: string;
        recruiterId?: string;
        notes?: string;
      }
    >({
      query: ({ projectId, candidateId, roleNeededId, recruiterId, notes }) => ({
        url: `/candidate-projects/send-for-screening`,
        method: "POST",
        body: { candidateId, projectId, roleNeededId, recruiterId, notes },
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
        "Screening",
        "Candidate",
      ],
    }),

    // Get nominated candidates for a project
    getNominatedCandidates: builder.query<
      ApiResponse<{
        candidates: Candidate[];
        roles?: Array<{ id: string; name: string }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>,
      {
        projectId: string;
        search?: string;
        // The backend now accepts readable names for main status and sub-status
        // prefer `status` / `subStatus` (string names) but keep backwards compatible
        // `statusId` / `subStatusId` when only IDs are available.
        status?: string;
        subStatus?: string;
        statusId?: string;
        subStatusId?: string;
        roleCatalogId?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({
        projectId,
        search,
        status,
        subStatus,
        statusId,
        subStatusId,
        roleCatalogId,
        page = 1,
        limit = 10,
      }) => ({
        url: `/projects/${projectId}/nominated-candidates`,
        // Prefer sending readable status/subStatus names. Fall back to IDs for
        // backward compatibility.
        params: {
          search,
          status: status || undefined,
          subStatus: subStatus || undefined,
          // If names are not provided, include legacy id params to support
          // older clients/backends until rollout completes.
          statusId: status ? undefined : statusId || undefined,
          subStatusId: subStatus ? undefined : subStatusId || undefined,
          roleCatalogId,
          page,
          limit,
        },
      }),
      providesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
      ],
    }),

    // Get candidate project statuses
    getCandidateProjectStatuses: builder.query<
      ApiResponse<{
        statuses: Array<{
          id: number | string;
          // new stable name (slug) for this status that can be passed to
          // APIs as `status` / `subStatus` — prefer this over id
          name?: string;
          statusName?: string;
          label?: string;
          description: string;
          stage: string;
          isTerminal: boolean;
          color: string;
          createdAt: string;
          updatedAt: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>,
      void
    >({
      query: () => "/candidate-project-status",
    }),

    // Get project role catalog
    getProjectRoleCatalog: builder.query<
      ApiResponse<ProjectRoleCatalogResponse>,
      ProjectRoleCatalogParams | void
    >({
      query: (params) => ({
        url: "/project-role-catalog",
        method: "GET",
        params: params || {},
      }),
    }),

    // Check bulk candidate eligibility for a project
    checkBulkCandidateEligibility: builder.query<
      ApiResponse<Array<{
        candidateId: string;
        candidateName: string;
        isEligible: boolean;
        roleEligibility: Array<{
          roleId: string;
          designation: string;
          isEligible: boolean;
          flags: {
            gender: boolean;
            age: boolean;
            experience: boolean;
          };
          reasons: string[];
        }>;
      }>>,
      { projectId: string; candidateIds: string[] }
    >({
      query: (body) => ({
        url: "/candidate-projects/bulk-eligibility-check",
        method: "POST",
        body,
      }),
    }),

    // Get role departments (includes roles when includeRoles=true)
    getRoleDepartments: builder.query<
      ApiResponse<{
        departments: Array<{
          id: string;
          name: string;
          label: string;
          shortName?: string;
          description?: string;
          isActive?: boolean;
          roles?: Array<{ id: string; name: string; label?: string; shortName?: string; description?: string; isActive?: boolean }>
        }>;
        pagination?: any;
      }>,
      { id?: string; search?: string; includeRoles?: boolean; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: "/role-departments",
        method: "GET",
        params: params || {},
      }),
    }),

    // Bulk send candidates for interview
    bulkSendForInterview: builder.mutation<
      ApiResponse<any>,
      {
        projectId: string;
        candidateIds: string[];
        type: "interview_assigned";
        notes?: string;
      }
    >({
      query: (data) => ({
        url: "/candidate-projects/bulk-send-for-interview",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
        "Interview",
        "Candidate",
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useGetProjectStatsQuery,
  useGetRecruiterAnalyticsQuery,
  useGetEligibleCandidatesQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAssignCandidateMutation,
  useGetProjectCandidatesByRoleQuery,
  useGetDocumentVerificationCandidatesQuery,
  useSendForVerificationMutation,
  useSendForInterviewMutation,
  useSendForScreeningMutation,
  useGetNominatedCandidatesQuery,
  useGetCandidateProjectStatusesQuery,
  useGetProjectRoleCatalogQuery,
  useCheckBulkCandidateEligibilityQuery,
  useGetRoleDepartmentsQuery,
  useBulkSendForInterviewMutation,
} = projectsApi;
