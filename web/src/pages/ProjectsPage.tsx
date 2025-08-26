import React, { useState } from "react";
import { Plus, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetProjectsQuery,
  useGetProjectStatsQuery,
} from "@/services/projectsApi";
import { QueryProjectsRequest } from "@/services/projectsApi";
import ProjectStats from "@/components/organisms/ProjectStats";
import ProjectFilters from "@/components/molecules/ProjectFilters";
import ProjectGrid from "@/components/organisms/ProjectGrid";
import { useCan } from "@/hooks/useCan";
import { Project } from "@/services/projectsApi";

export default function ProjectsPage() {
  const canManageProjects = useCan("manage:projects");
  const canReadProjects = useCan("read:projects");

  // State for filters and pagination
  const [filters, setFilters] = useState<QueryProjectsRequest>({
    page: 1,
    limit: 12,
    sortBy: "createdAt",
    sortOrder: "desc",
    status: undefined,
    clientId: undefined,
    teamId: undefined,
  });

  // RTK Query hooks
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useGetProjectsQuery(filters);

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useGetProjectStatsQuery();

  // Handle filter changes
  const handleFiltersChange = (newFilters: QueryProjectsRequest) => {
    setFilters(newFilters);
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Handle project actions
  const handleViewProject = (project: Project) => {
    // TODO: Navigate to project detail page
    console.log("View project:", project.id);
  };

  const handleEditProject = (project: Project) => {
    // TODO: Open edit modal or navigate to edit page
    console.log("Edit project:", project.id);
  };

  const handleDeleteProject = (project: Project) => {
    // TODO: Show delete confirmation dialog
    console.log("Delete project:", project.id);
  };

  const handleCreateProject = () => {
    // TODO: Open create project modal or navigate to create page
    console.log("Create new project");
  };

  const handleExportProjects = () => {
    // TODO: Implement export functionality
    toast.info("Export functionality coming soon");
  };

  // Error handling
  if (projectsError || statsError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {canReadProjects
                ? "Error Loading Projects"
                : "Project Access Limited"}
            </h2>
            <p className="text-gray-600">
              {canReadProjects
                ? "There was an error loading the projects. Please try again later."
                : "You have limited access to project information. Contact your administrator for full access."}
            </p>
            {canReadProjects && (
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div></div>

          <div className="flex items-center gap-3">
            {canManageProjects && (
              <Button onClick={handleCreateProject} className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Statistics Dashboard */}
        {!statsLoading && statsData?.data && canReadProjects && (
          <ProjectStats stats={statsData.data} />
        )}

        {/* Filters & Actions */}
        {canReadProjects && (
          <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm">
            <div className="p-4">
              <ProjectFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onExport={handleExportProjects}
              />
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {canReadProjects ? (
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  All Projects
                </h2>

                {projectsData?.data && (
                  <div className="text-sm text-gray-500">
                    {projectsData.data.pagination.total} projects total
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <ProjectGrid
                projects={projectsData?.data?.projects || []}
                pagination={projectsData?.data?.pagination}
                onPageChange={handlePageChange}
                onView={canReadProjects ? handleViewProject : undefined}
                onEdit={canManageProjects ? handleEditProject : undefined}
                onDelete={canManageProjects ? handleDeleteProject : undefined}
                loading={projectsLoading}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Project Access Limited
              </h2>
              <p className="text-gray-600">
                You don't have permission to view project details. Contact your
                administrator to request access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
