// Feature-specific hooks for projects
export {
  useGetProjectsQuery,
  useGetProjectQuery,
  useGetProjectStatsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAssignCandidateMutation,
} from "./api";

// Re-export the candidate feature's assign-to-project hook so that
// consumers that import from `@/features/projects` (like
// ProjectDetailPage) can still use the hook without changing imports.
export { useAssignToProjectMutation } from "../candidates";

// Additional feature-specific hooks can be added here
// For example: useProjectFilters, useProjectSearch, etc.
