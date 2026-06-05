import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  useGetProjectsQuery,
  useGetProjectStatsQuery,
  QueryProjectsRequest,
} from "@/features/projects";
import ProjectStats from "@/components/organisms/ProjectStats";
import ProjectGrid from "@/components/organisms/ProjectGrid";
import { ProjectFilters } from "@/components/molecules";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import { Project } from "@/features/projects";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projectsListRef = useRef<HTMLDivElement>(null);
  const canReadProjects = useCan("read:projects");
  const canCreateProject = useCan(["manage:projects", "write:projects"]);
  const { user } = useAppSelector((state) => state.auth);
  const isProcessingExecutive =
    user?.roles?.some?.((role) => role === "Processing Executive") ?? false;

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
    deadlineFrom: undefined,
    deadlineTo: undefined,
  });

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

  const handleStatsSelect = (statFilters: {
    status?: string;
    isUrgent?: boolean;
    priority?: string;
  }) => {
    if (Object.keys(statFilters).length === 0) {
      setFilters((prev) => ({
        page: 1,
        limit: prev.limit,
        sortBy: prev.sortBy,
        sortOrder: prev.sortOrder,
        search: prev.search,
        clientId: prev.clientId,
        teamId: prev.teamId,
        deadlineFrom: prev.deadlineFrom,
        deadlineTo: prev.deadlineTo,
        priority: prev.priority,
      }));
      projectsListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setFilters((prev) => ({
      page: 1,
      limit: prev.limit,
      sortBy: prev.sortBy,
      sortOrder: prev.sortOrder,
      search: prev.search,
      clientId: prev.clientId,
      teamId: prev.teamId,
      deadlineFrom: prev.deadlineFrom,
      deadlineTo: prev.deadlineTo,
      status: undefined,
      isUrgent: undefined,
      priority: undefined,
      ...(statFilters.status !== undefined && {
        status: statFilters.status as QueryProjectsRequest["status"],
      }),
      ...(statFilters.isUrgent !== undefined && {
        isUrgent: statFilters.isUrgent,
      }),
      ...(statFilters.priority !== undefined && {
        priority: statFilters.priority as QueryProjectsRequest["priority"],
      }),
    }));

    projectsListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getActiveFilterLabel = () => {
    if (filters.isUrgent) return "Urgent Deadlines";
    if (filters.status === "active") return "Active Projects";
    if (filters.status === "completed") return "Completed Projects";
    if (filters.status === "cancelled") return "Cancelled Projects";
    if (filters.clientId) return "Filtered by Client";
    if (filters.teamId) return "Filtered by Team";
    if (filters.priority) return `${filters.priority} Priority Projects`;
    if (filters.deadlineFrom || filters.deadlineTo) return "Deadline Range";
    return "Total Projects";
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  if (projectsError || statsError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {canReadProjects
                ? "Error Loading Projects"
                : "Project Access Limited"}
            </h2>
            <p className="text-muted-foreground">
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
                ...(filters.status !== undefined && { status: filters.status }),
                ...(filters.isUrgent !== undefined && {
                  isUrgent: filters.isUrgent,
                }),
                ...(filters.priority !== undefined && {
                  priority: filters.priority,
                }),
              }}
            />
          )}

        {canReadProjects && (
          <div className="rounded-3xl border border-border/60 bg-card shadow-lg shadow-muted/30">
            <div className="p-5">
              <ProjectFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        )}

        {canReadProjects ? (
          <div
            ref={projectsListRef}
            className="rounded-3xl border border-border/60 bg-card shadow-lg shadow-muted/30"
          >
            <div className="flex flex-col gap-2 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Project roster
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  {getActiveFilterLabel()}
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                {projectsData?.data && (
                  <span className="text-sm text-muted-foreground">
                    {projectsData.data.pagination.total}{" "}
                    {projectsData.data.pagination.total === 1
                      ? "project"
                      : "projects"}
                  </span>
                )}
                {canCreateProject && (
                  <Button
                    type="button"
                    onClick={() => navigate("/projects/create")}
                    className="gap-2"
                    aria-label="Create new project"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    Add Project
                  </Button>
                )}
              </div>
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
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              Project access limited
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              You don&apos;t have permission to view project details. Contact
              your administrator to request access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
