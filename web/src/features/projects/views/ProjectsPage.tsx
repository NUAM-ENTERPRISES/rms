import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  useGetProjectsQuery,
  useGetProjectStatsQuery,
  QueryProjectsRequest,
} from "@/features/projects";
import ProjectStats from "@/components/organisms/ProjectStats";
import ProjectGrid from "@/components/organisms/ProjectGrid";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import { Project } from "@/features/projects";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const canReadProjects = useCan("read:projects");
  const { user } = useAppSelector((state) => state.auth);
  const isProcessingExecutive =
    user?.roles?.some?.((role) => role === "Processing Executive") ?? false;

  // State for search
  const [searchFocused, setSearchFocused] = useState(false);

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

  // Handle stats selection
  const handleStatsSelect = (statFilters: {
    status?: string;
    isUrgent?: boolean;
    priority?: string;
  }) => {
    // If empty filter (Total Projects), reset all filters except search and pagination
    if (Object.keys(statFilters).length === 0) {
      setFilters((prev) => ({
        page: 1,
        limit: prev.limit,
        sortBy: prev.sortBy,
        sortOrder: prev.sortOrder,
        search: prev.search,
      }));
    } else {
      // Set new filters, clearing conflicting ones
      setFilters((prev) => ({
        page: 1,
        limit: prev.limit,
        sortBy: prev.sortBy,
        sortOrder: prev.sortOrder,
        search: prev.search,
        status: statFilters.status as any,
        isUrgent: statFilters.isUrgent,
        priority: statFilters.priority as any,
        // Clear other filters that might conflict
        clientId: undefined,
        teamId: undefined,
        countryCode: undefined,
      }));
    }
  };

  // Get active filter label
  const getActiveFilterLabel = () => {
    if (filters.isUrgent) return "Urgent Deadlines";
    if (filters.status === "active") return "Active Projects";
    if (filters.status === "completed") return "Completed Projects";
    if (filters.status === "cancelled") return "Cancelled Projects";
    return "Total Projects";
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Handle project actions
  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
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
          <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
            <div className="p-5">
              {/* Search Bar */}
              <div className="relative group">
                <div
                  className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${
                    searchFocused ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Search
                    className={`h-5 w-5 transition-transform duration-300 ${
                      searchFocused ? "scale-110" : "scale-100"
                    }`}
                  />
                </div>
                <Input
                  placeholder="Search projects by title, description, or client..."
                  value={filters.search || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
                />
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
                    searchFocused ? "ring-2 ring-blue-500/20" : ""
                  }`}
                />
              </div>
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
                  {getActiveFilterLabel()}
                </h2>
              </div>
              {projectsData?.data && (
                <span className="text-sm text-slate-500">
                  {projectsData.data.pagination.total} {projectsData.data.pagination.total === 1 ? 'project' : 'projects'}
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
