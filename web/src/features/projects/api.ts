import { ProjectStatusType } from "@/entities/project/constants";
import { baseApi } from "@/app/api/baseApi";
import { Candidate } from "@/features/candidates";

// Types
export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatusType;
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  creatorId: string;
  teamId: string | null;
  countryCode: string | null;
  projectType: "private" | "ministry";
  sector?: "healthcare" | "non-healthcare";
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
  introductionVideoRequired?: boolean;
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
  requiredSkills?: string[];
  employmentType: "contract" | "permanent";
  contractDurationYears?: number;
  visaType?: "company_visa" | "direct_visa";
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
  minSalaryRange?: number;
  maxSalaryRange?: number;
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

export interface AgentCandidateRequestItemInput {
  roleNeededId: string;
  requestedCount: number;
}

export interface CreateAgentCandidateRequestPayload {
  projectId: string;
  items: AgentCandidateRequestItemInput[];
  notes?: string;
}

export type AgentCandidateRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AgentCandidateRequestListItem {
  id: string;
  status: AgentCandidateRequestStatus;
  notes: string | null;
  createdAt: string;
  project: {
    id: string;
    title: string;
    countryCode: string | null;
    country: { name: string } | null;
    client: { name: string } | null;
  };
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    requestedCount: number;
    roleNeeded: { designation: string } | null;
  }>;
}

export interface GetAgentCandidateRequestsParams {
  page?: number;
  limit?: number;
  status?: AgentCandidateRequestStatus;
}

export interface RoleFillSummaryItem {
  roleNeededId: string;
  designation: string;
  priority: string;
  targetCount: number;
  filledCount: number;
}

export interface ProjectAgentCandidateRequestHistoryItem {
  id: string;
  status: AgentCandidateRequestStatus;
  notes: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string; email: string };
  items: Array<{
    id: string;
    requestedCount: number;
    roleNeeded: { designation: string } | null;
  }>;
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
  minSalaryRange?: number;
  maxSalaryRange?: number;
  benefits?: string;
  relocationAssistance?: boolean;
  additionalRequirements?: string;
  notes?: string;
  employmentType?: "contract" | "permanent";
  contractDurationYears?: number;
  genderRequirement?: "female" | "male" | "all" | "other";
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export interface QueryProjectsRequest {
  search?: string;
  status?: ProjectStatusType;
  priority?: "low" | "medium" | "high" | "urgent";
  isUrgent?: boolean;
  clientId?: string;
  teamId?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  /** When true, GET /projects returns slim rows only (see ProjectSummaryListItem). */
  summary?: boolean;
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

/** Row shape for GET /projects?summary=true */
export interface ProjectSummaryListItem {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  priority: string;
  createdAt: string;
  projectType: string;
  countryCode: string | null;
  country: { code: string; name: string | null } | null;
}

export interface PaginatedProjectSummaryResponse {
  projects: ProjectSummaryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Minimal project row from GET /projects/picker (link dialogs, pickers). */
export interface ProjectPickerItem {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  client: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface PaginatedProjectPickerResponse {
  projects: ProjectPickerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryProjectPickerRequest {
  status?: ProjectStatusType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProjectStats {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  projectsByStatus: {
    IN_PROGRESS?: number;
    COMPLETED?: number;
    ON_HOLD?: number;
    CANCELLED?: number;
  };
  projectsByClient: {
    [clientId: string]: number;
  };
  urgentProjectsCount?: number;
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

    /**
     * Slim project list for client detail (id, title, deadline, status, country, priority, createdAt, projectType).
     * Uses GET /projects?summary=true with pagination and search.
     */
    getClientProjectsSummary: builder.query<
      ApiResponse<PaginatedProjectSummaryResponse>,
      Pick<QueryProjectsRequest, "clientId" | "page" | "limit" | "search">
    >({
      query: ({ clientId, page = 1, limit = 10, search }) => ({
        url: "/projects",
        params: {
          clientId,
          page,
          limit,
          search: search?.trim() || undefined,
          summary: true,
        },
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

    /** Minimal project list for pickers (no roles, documents, candidates). */
    getProjectsPicker: builder.query<
      ApiResponse<PaginatedProjectPickerResponse>,
      QueryProjectPickerRequest | void
    >({
      query: (params) => ({
        url: "/projects/picker",
        params: params ?? {},
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
      providesTags: (_, __, { projectId }) => [
        "Candidate",
        { type: "Project", id: projectId },
      ],
    }),

    // Create new project
    createProject: builder.mutation<ApiResponse<Project>, CreateProjectRequest>(
      {
        query: (project) => ({
          url: "/projects",
          method: "POST",
          body: project,
        }),
        invalidatesTags: (_, __, body) => [
          { type: "Project", id: "LIST" },
          "ProjectStats",
          { type: "Client", id: body.clientId },
        ],
      }
    ),

    // Update project
    updateProject: builder.mutation<
      ApiResponse<Project>,
      { id: string; data: UpdateProjectRequest }
    >({
      query: ({ id, data }) => {
        const { status: _status, ...body } = data as UpdateProjectRequest & {
          status?: ProjectStatusType;
        };
        return {
          url: `/projects/${id}`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: (result, _, { id }) => {
        const tags: Array<
          "ProjectStats" | { type: "Project"; id: string } | { type: "Client"; id: string }
        > = [
          { type: "Project", id },
          { type: "Project", id: "LIST" },
          "ProjectStats",
        ];
        const cid = result?.data?.clientId;
        if (cid) {
          tags.push({ type: "Client", id: cid });
        }
        return tags;
      },
    }),

    updateProjectStatus: builder.mutation<
      ApiResponse<Project>,
      { id: string; status: ProjectStatusType }
    >({
      query: ({ id, status }) => ({
        url: `/projects/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, _, { id }) => {
        const tags: Array<
          "ProjectStats" | { type: "Project"; id: string } | { type: "Client"; id: string }
        > = [
          { type: "Project", id },
          { type: "Project", id: "LIST" },
          "ProjectStats",
        ];
        const cid = result?.data?.clientId;
        if (cid) {
          tags.push({ type: "Client", id: cid });
        }
        return tags;
      },
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
        "Candidate",
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
        "Candidate",
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
        "VerificationCandidates",
        // Candidate queries should also refresh so lists that show candidate status update live
        "Candidate",
        "CandidateProject",
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
        "CandidateProject",
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
        coordinatorId?: string;
      }
    >({
      query: ({ projectId, candidateId, roleNeededId, recruiterId, notes, coordinatorId }) => ({
        url: `/candidate-projects/send-for-screening`,
        method: "POST",
        body: { candidateId, projectId, roleNeededId, recruiterId, notes, coordinatorId },
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
        { type: "Screening", id: "LIST" },
        { type: "Interview", id: "LIST" },
        "Candidate",
        "CandidateProject",
      ],
    }),

    bulkSendForScreening: builder.mutation<
      ApiResponse<any>,
      {
        projectId: string;
        assignments: Array<{
          candidateId: string;
          roleNeededId: string;
          notes?: string;
        }>;
        coordinatorId?: string;
      }
    >({
      query: (body) => ({
        url: `/candidate-projects/bulk-send-for-screening`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
        { type: "Screening", id: "LIST" },
        "Candidate",
        "CandidateProject",
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
        "Candidate",
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
      { stage?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/candidate-project-status",
        params: params || undefined,
      }),
    }),

    // Get sub-statuses by main status name
    getProjectSubStatus: builder.query<
      ApiResponse<{
        mainStatus: {
          id: string;
          name: string;
          label: string;
          color: string;
        };
        subStatuses: Array<{
          id: string;
          name: string;
          label: string;
          order: number;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>,
      { mainStatusName: string; search?: string; page?: number; limit?: number }
    >({
      query: ({ mainStatusName, search, page = 1, limit = 10 }) => ({
        url: `/candidate-project-status/sub-status/${mainStatusName}`,
        params: { search, page, limit },
      }),
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
        activeCountryRestriction?: {
          countryCode: string;
          countryName: string;
          message: string;
        } | null;
        processingConflict?: {
          projectId: string;
          projectTitle: string;
        } | null;
        pipelineBlockedOnThisProject?: boolean;
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
      providesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "Candidate",
      ],
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

    // Bulk assign candidates to project
    bulkAssignToProject: builder.mutation<
      ApiResponse<any>,
      {
        projectId: string;
        assignments: Array<{
          candidateId: string;
          roleNeededId: string;
          notes?: string;
        }>;
      }
    >({
      query: (data) => ({
        url: "/candidate-projects/bulk-assign",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        "ProjectCandidates",
        "Candidate",
        "CandidateProject",
      ],
    }),

    getAgentCandidateRequests: builder.query<
      {
        success: boolean;
        data: AgentCandidateRequestListItem[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      },
      GetAgentCandidateRequestsParams
    >({
      query: ({ page = 1, limit = 20, status } = {}) => ({
        url: "/projects/agent-candidate-requests",
        params: { page, limit, ...(status ? { status } : {}) },
      }),
      providesTags: [{ type: "Project", id: "AGENT_REQUESTS" }],
    }),

    getProjectAgentCandidateRequests: builder.query<
      {
        success: boolean;
        data: ProjectAgentCandidateRequestHistoryItem[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      },
      { projectId: string; page?: number; limit?: number }
    >({
      query: ({ projectId, page = 1, limit = 10 }) => ({
        url: `/projects/${projectId}/agent-candidate-requests`,
        params: { page, limit },
      }),
      providesTags: (_, __, { projectId }) => [
        { type: "Project", id: `AGENT_REQUESTS_${projectId}` },
      ],
    }),

    getProjectRoleFillSummary: builder.query<
      {
        success: boolean;
        data: RoleFillSummaryItem[];
        summary: { totalFilled: number; totalTarget: number };
      },
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/projects/${projectId}/role-fill-summary`,
      }),
      providesTags: (_, __, { projectId }) => [
        { type: "Project", id: `ROLE_FILL_${projectId}` },
        { type: "Project", id: projectId },
      ],
    }),

    createAgentCandidateRequest: builder.mutation<
      ApiResponse<{
        id: string;
        projectId: string;
        requestedById: string;
        status: string;
        notes?: string | null;
        items: Array<{
          id: string;
          roleNeededId: string;
          requestedCount: number;
        }>;
        createdAt: string;
      }>,
      CreateAgentCandidateRequestPayload
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/agent-candidate-requests`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_, __, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
        { type: "Project", id: "AGENT_REQUESTS" },
        { type: "Project", id: `ROLE_FILL_${projectId}` },
        { type: "Project", id: `AGENT_REQUESTS_${projectId}` },
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetClientProjectsSummaryQuery,
  useGetProjectsPickerQuery,
  useGetProjectQuery,
  useGetProjectStatsQuery,
  useGetEligibleCandidatesQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useUpdateProjectStatusMutation,
  useDeleteProjectMutation,
  useAssignCandidateMutation,
  useGetProjectCandidatesByRoleQuery,
  useGetDocumentVerificationCandidatesQuery,
  useSendForVerificationMutation,
  useSendForInterviewMutation,
  useSendForScreeningMutation,
  useBulkSendForScreeningMutation,
  useGetNominatedCandidatesQuery,
  useGetCandidateProjectStatusesQuery,
  useGetProjectSubStatusQuery,
  useGetProjectRoleCatalogQuery,
  useCheckBulkCandidateEligibilityQuery,
  useGetRoleDepartmentsQuery,
  useBulkSendForInterviewMutation,
  useBulkAssignToProjectMutation,
  useCreateAgentCandidateRequestMutation,
  useGetAgentCandidateRequestsQuery,
  useGetProjectAgentCandidateRequestsQuery,
  useGetProjectRoleFillSummaryQuery,
} = projectsApi;
