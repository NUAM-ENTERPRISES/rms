import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetProjectsQuery,
  useGetProjectStatsQuery,
  QueryProjectsRequest,
} from "@/features/projects";
import ProjectStats from "@/components/organisms/ProjectStats";
import ProjectFilters from "@/components/molecules/ProjectFilters";
import ProjectGrid from "@/components/organisms/ProjectGrid";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import { Project } from "@/features/projects";
import {
  AlertTriangle,
  CalendarClock,
  Target,
  UserCheck2,
  UserMinus,
} from "lucide-react";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const canManageProjects = useCan("manage:projects");
  const canReadProjects = useCan("read:projects");
  const { user } = useAppSelector((state) => state.auth);
  const isProcessingExecutive =
    user?.roles?.some?.((role) => role === "Processing Executive") ?? false;

  // State for filters and pagination
  const [filters, setFilters] = useState<QueryProjectsRequest>({
    page: 1,
    limit: 12,
    sortBy: undefined,
    sortOrder: "desc",
    status: undefined,
    priority: undefined,
    isUrgent: undefined,
    clientId: undefined,
    teamId: undefined,
    countryCode: undefined,
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

  const handleStatsSelect = (statFilters: {
    status?: string;
    isUrgent?: boolean;
    priority?: string;
  }) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: statFilters.status as any,
      isUrgent: statFilters.isUrgent,
      priority: statFilters.priority as any,
    }));
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Handle project actions
  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleCreateProject = () => {
    navigate("/projects/create");
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
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6 py-2">
        {!statsLoading &&
          statsData?.data &&
          canReadProjects &&
          !isProcessingExecutive && (
            <ProjectStats
              stats={statsData.data}
              className="px-0"
              onSelect={handleStatsSelect}
              activeFilter={{
                status: filters.status,
                isUrgent: filters.isUrgent,
                priority: filters.priority,
              }}
            />
          )}

        {canReadProjects && (
          <div ref={tableRef} className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
            <div className="p-5">
              <ProjectFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onExport={handleExportProjects}
                onCreateProject={handleCreateProject}
                canCreateProject={canManageProjects}
                showCountryFilter={false}
              />
            </div>
          </div>
        )}

        {canReadProjects ? (
          <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/60">
            <div className="flex flex-col gap-2 border-b border-slate-100/80 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Project roster
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  All active engagements
                </h2>
              </div>
              {projectsData?.data && (
                <span className="text-sm text-slate-500">
                  {projectsData.data.pagination.total} total projects
                </span>
              )}
            </div>
            <div className="p-6">
              <ProjectGrid
                projects={projectsData?.data?.projects || []}
                pagination={projectsData?.data?.pagination}
                onPageChange={handlePageChange}
                onView={canReadProjects ? handleViewProject : undefined}
                loading={projectsLoading}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/90 p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Project access limited
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              You don&apos;t have permission to view project details. Contact
              your administrator to request access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
