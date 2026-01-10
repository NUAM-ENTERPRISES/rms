import { baseApi } from "@/app/api/baseApi";

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
}

export interface RoleNeeded {
  id: string;
  roleCatalogId?: string;
  designation: string;
  quantity: number;
  priority: string;
  minExperience?: number;
  maxExperience?: number;
  specificExperience?: string;
  educationRequirements?: string;
  requiredCertifications?: string;
  institutionRequirements?: string;
  skills?: string;
  technicalSkills?: string;
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
  rolesNeeded: CreateRoleNeededRequest[];
}

export interface CreateRoleNeededRequest {
  designation: string;
  quantity: number;
  priority?: string;
  minExperience?: number;
  maxExperience?: number;
  specificExperience?: string;
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
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: "active" | "completed" | "cancelled";
}

export interface QueryProjectsRequest {
  search?: string;
  status?: "active" | "completed" | "cancelled";
  clientId?: string;
  teamId?: string;
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

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const projectsApi = baseApi.injectEndpoints({
  overrideExisting: true,
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
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useGetProjectStatsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAssignCandidateMutation,
  useGetProjectRoleCatalogQuery,
} = projectsApi;
