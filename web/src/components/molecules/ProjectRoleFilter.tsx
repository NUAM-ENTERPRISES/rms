import { useState, useMemo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { Search, ChevronDown, ChevronLeft, ChevronRight, X, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

export interface ProjectRoleFilterValue {
  projectId: string;
  roleCatalogId: string;
}

export interface ProjectRoleFilterProps {
  value: ProjectRoleFilterValue;
  onChange: (value: ProjectRoleFilterValue) => void;
  className?: string;
  showRoleFilter?: boolean;
  projectLabel?: string;
  roleLabel?: string;
}

export function ProjectRoleFilter({
  value,
  onChange,
  className,
  showRoleFilter = true,
  projectLabel = "Project Filter",
  roleLabel = "Role Filter",
}: ProjectRoleFilterProps) {
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const debouncedProjectSearch = useDebounce(projectSearch, 300);

  // Fetch projects with pagination and search
  const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery({
    limit: 10,
    page: projectPage,
    search: debouncedProjectSearch || undefined,
  });

  const projects = projectsData?.data?.projects || [];
  const projectsPagination = projectsData?.data?.pagination || { total: 0, totalPages: 1, page: 1 };

  // Get the selected project details (for displaying the name and getting roles)
  const { data: selectedProjectData } = useGetProjectsQuery(
    { limit: 1, search: undefined },
    { skip: value.projectId === "all" }
  );

  // Find the selected project from the current page or use a separate lookup
  const selectedProject = useMemo(() => {
    if (value.projectId === "all") return null;
    // First check current page
    const fromCurrentPage = projects.find((p: any) => p.id === value.projectId);
    if (fromCurrentPage) return fromCurrentPage;
    // If not on current page, we'll need the full project data
    return selectedProjectData?.data?.projects?.find((p: any) => p.id === value.projectId) || null;
  }, [value.projectId, projects, selectedProjectData]);

  // Derived roles based on selected project
  const availableRoles = useMemo(() => {
    if (value.projectId === "all") {
      // Get all unique roles across all loaded projects
      const rolesMap = new Map();
      projects.forEach((proj: any) => {
        proj.rolesNeeded?.forEach((rn: any) => {
          if (rn.roleCatalog) {
            rolesMap.set(rn.roleCatalog.id, rn.roleCatalog);
          }
        });
      });
      return Array.from(rolesMap.values());
    } else if (selectedProject) {
      return (
        selectedProject.rolesNeeded
          ?.map((rn: any) => rn.roleCatalog)
          .filter(Boolean) || []
      );
    }
    return [];
  }, [value.projectId, projects, selectedProject]);

  // Reset role when project changes
  const handleProjectChange = useCallback(
    (projectId: string) => {
      onChange({ projectId, roleCatalogId: "all" });
      setIsProjectOpen(false);
    },
    [onChange]
  );

  const handleRoleChange = useCallback(
    (roleCatalogId: string) => {
      onChange({ ...value, roleCatalogId });
    },
    [onChange, value]
  );

  // Reset page when search changes
  useEffect(() => {
    setProjectPage(1);
  }, [debouncedProjectSearch]);

  const selectedProjectName = useMemo(() => {
    if (value.projectId === "all") return "All Projects";
    return selectedProject?.title || "Select Project";
  }, [value.projectId, selectedProject]);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* Project Filter with Search and Pagination */}
      <div className="w-full md:w-auto min-w-[220px]">
        <Popover open={isProjectOpen} onOpenChange={setIsProjectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isProjectOpen}
              className="h-9 w-full justify-between text-sm font-normal"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="truncate">{selectedProjectName}</span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            {/* Search Input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
                {projectSearch && (
                  <button
                    onClick={() => setProjectSearch("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Project List */}
            <div className="max-h-[200px] overflow-y-auto">
              {/* All Projects Option */}
              <button
                onClick={() => handleProjectChange("all")}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition-colors",
                  value.projectId === "all" && "bg-blue-50 text-blue-700"
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    value.projectId === "all" ? "opacity-100" : "opacity-0"
                  )}
                />
                <span>All Projects</span>
              </button>

              {projectsLoading ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : projects.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No projects found
                </div>
              ) : (
                projects.map((project: any) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectChange(project.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition-colors text-left",
                      value.projectId === project.id && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value.projectId === project.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="truncate">
                      <div className="font-medium truncate">{project.title}</div>
                      {project.client?.name && (
                        <div className="text-xs text-gray-500 truncate">
                          {project.client.name}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Pagination */}
            {projectsPagination.totalPages > 1 && (
              <div className="border-t p-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Page {projectsPagination.page} of {projectsPagination.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                    disabled={projectPage === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setProjectPage((p) => Math.min(projectsPagination.totalPages, p + 1))
                    }
                    disabled={projectPage >= projectsPagination.totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Role Filter */}
      {showRoleFilter && (
        <div className="w-full md:w-auto min-w-[180px]">
          <Select value={value.roleCatalogId} onValueChange={handleRoleChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={roleLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {availableRoles.map((role: any) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default ProjectRoleFilter;
