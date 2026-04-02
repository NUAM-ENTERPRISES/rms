import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, ChevronDown, ChevronLeft, ChevronRight, X, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import RoleHiringChart from "./RoleHiringChart";
import { useGetProjectRoleHiringStatusQuery } from "../../admin/api/adminDashboardApi";



export default function ProjectRoleHiringStatus() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const debouncedProjectSearch = useDebounce(projectSearch, 300);

  const {
    data: apiResponse,
    isLoading,
    isError,
  } = useGetProjectRoleHiringStatusQuery({
    search: debouncedProjectSearch,
    page: projectPage,
    limit: 10,
  });

  const projectRoles = apiResponse?.data?.projectRoles ?? [];
  const pagination = apiResponse?.data?.pagination ?? { total: 0, totalPages: 1, page: 1 };

  useEffect(() => {
    if (!selectedProjectId && projectRoles.length > 0) {
      setSelectedProjectId(projectRoles[0].projectId);
    }
  }, [projectRoles, selectedProjectId]);

  // If selectedProjectId is not in current page, we might need to fetch it specifically or just show what we have.
  // For the dashboard, usually we show the first one or the one they picked.
  const selectedProject = projectRoles.find((p) => p.projectId === selectedProjectId) ?? projectRoles[0] ?? null;
  const roles = selectedProject?.roles ?? [];

  const summary = useMemo(() => {
    const totalRequired = roles.reduce((s, r) => s + r.required, 0);
    const totalFilled = roles.reduce((s, r) => s + r.filled, 0);
    const completion =
      totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;
    return { totalRequired, totalFilled, completion };
  }, [roles]);

  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setIsProjectOpen(false);
  }, []);

  useEffect(() => {
    setProjectPage(1);
  }, [debouncedProjectSearch]);

  const selectedProjectName = useMemo(() => {
    if (selectedProject) return selectedProject.projectName;
    return "Select Project";
  }, [selectedProject]);

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">
          Project Role Hiring Status
        </CardTitle>
        <div className="min-w-[200px]">
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
            <PopoverContent className="w-[280px] p-0" align="end">
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

              <div className="max-h-[200px] overflow-y-auto">
                {isLoading ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </div>
                ) : projectRoles.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    No projects found
                  </div>
                ) : (
                  projectRoles.map((project) => (
                    <button
                      key={project.projectId}
                      onClick={() => handleProjectChange(project.projectId)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition-colors text-left",
                        selectedProjectId === project.projectId && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedProjectId === project.projectId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="truncate font-medium">{project.projectName}</div>
                    </button>
                  ))
                )}
              </div>

              {pagination.totalPages > 1 && (
                <div className="border-t p-2 flex items-center justify-between bg-slate-50">
                  <span className="text-xs text-gray-500">
                    Page {pagination.page} of {pagination.totalPages}
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
                        setProjectPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      disabled={projectPage >= pagination.totalPages}
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
      </CardHeader>

      <CardContent className="pt-2 space-y-4">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading project role hiring status...</div>
        ) : isError ? (
          <div className="text-sm text-red-600">Failed to load project role hiring status.</div>
        ) : !selectedProject ? (
          <div className="text-sm text-slate-500">No project role hiring status available.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Total Required:</span>
                <Badge variant="outline" className="font-semibold">
                  {summary.totalRequired}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Total Filled:</span>
                <Badge
                  variant="outline"
                  className="font-semibold text-emerald-600 border-emerald-300"
                >
                  {summary.totalFilled}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Completion:</span>
                <Badge
                  variant="secondary"
                  className={
                    summary.completion >= 75
                      ? "bg-emerald-100 text-emerald-700"
                      : summary.completion >= 50
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {summary.completion}%
                </Badge>
              </div>
            </div>
            <RoleHiringChart roles={roles} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
