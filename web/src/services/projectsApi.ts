import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQuery } from '@/services/baseApi'

interface Project {
  id: string
  clientId: string
  title: string
  description?: string
  deadline?: string
  status: string
  createdBy: string
  teamId?: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    type: string
  }
  rolesNeeded: RoleNeeded[]
}

interface RoleNeeded {
  id: string
  designation: string
  quantity: number
  priority: string
  minExperience?: number
  maxExperience?: number
  skills: string[]
}

interface CreateProjectRequest {
  clientId: string
  title: string
  description?: string
  deadline?: string
  teamId?: string
  rolesNeeded: Omit<RoleNeeded, 'id'>[]
}

interface UpdateProjectRequest {
  id: string
  title?: string
  description?: string
  deadline?: string
  status?: string
  teamId?: string
}

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery,
  tagTypes: ['Project'],
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    getProjectById: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (projectData) => ({
        url: '/projects',
        method: 'POST',
        body: projectData,
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<Project, UpdateProjectRequest>({
      query: ({ id, ...projectData }) => ({
        url: `/projects/${id}`,
        method: 'PATCH',
        body: projectData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),
    deleteProject: builder.mutation<void, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
  }),
})

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi
