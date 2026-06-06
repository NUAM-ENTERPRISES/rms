import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Check,
  Loader2,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import RoleHiringChart from "@/components/molecules/RoleHiringChart";
import { useGetCoordinatorProjectRoleHiringStatusQuery } from "../api/projectCoordinatorDashboardApi";

function CompletionRing({
  percentage,
  size = 56,
}: {
  percentage: number;
  size?: number;
}) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 75
      ? "text-emerald-500"
      : percentage >= 50
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700 ease-out", color)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold tabular-nums text-slate-700">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export default function CoordinatorProjectRoleHiringStatus() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const debouncedProjectSearch = useDebounce(projectSearch, 300);

  const {
    data: apiResponse,
    isLoading,
    isError,
  } = useGetCoordinatorProjectRoleHiringStatusQuery({
    search: debouncedProjectSearch,
    page: projectPage,
    limit: 10,
  });

  const projectRoles = apiResponse?.data?.projectRoles ?? [];
  const pagination = apiResponse?.data?.pagination ?? {
    total: 0,
    totalPages: 1,
    page: 1,
  };

  useEffect(() => {
    if (!selectedProjectId && projectRoles.length > 0) {
      setSelectedProjectId(projectRoles[0].projectId);
    }
  }, [projectRoles, selectedProjectId]);

  const selectedProject =
    projectRoles.find((project) => project.projectId === selectedProjectId) ??
    projectRoles[0] ??
    null;
  const roles = selectedProject?.roles ?? [];

  const summary = useMemo(() => {
    const totalRequired = roles.reduce((sum, role) => sum + role.required, 0);
    const totalFilled = roles.reduce((sum, role) => sum + role.filled, 0);
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

  const selectedProjectName =
    selectedProject?.projectName ?? "Select Project";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-700">
              Project Role Hiring Status
            </CardTitle>
            <CardDescription>
              Track candidate fill progress per role in each project
            </CardDescription>
          </div>
          <div className="min-w-[220px]">
            <Popover open={isProjectOpen} onOpenChange={setIsProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isProjectOpen}
                  className="h-9 w-full justify-between border-slate-200 text-sm font-normal shadow-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span className="truncate">{selectedProjectName}</span>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="end">
                <div className="border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                    {projectSearch && (
                      <button
                        type="button"
                        onClick={() => setProjectSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear project search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[200px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center px-3 py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : projectRoles.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No active projects found
                    </div>
                  ) : (
                    projectRoles.map((project) => (
                      <button
                        key={project.projectId}
                        type="button"
                        onClick={() => handleProjectChange(project.projectId)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50",
                          selectedProjectId === project.projectId &&
                            "bg-indigo-50 text-indigo-700"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedProjectId === project.projectId
                              ? "opacity-100 text-indigo-600"
                              : "opacity-0"
                          )}
                        />
                        <div className="truncate font-medium">
                          {project.projectName}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t bg-slate-50/80 p-2">
                    <span className="text-xs text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setProjectPage((page) => Math.max(1, page - 1))
                        }
                        disabled={projectPage === 1}
                        className="h-7 w-7 p-0"
                        aria-label="Previous project page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setProjectPage((page) =>
                            Math.min(pagination.totalPages, page + 1)
                          )
                        }
                        disabled={projectPage >= pagination.totalPages}
                        className="h-7 w-7 p-0"
                        aria-label="Next project page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">
              Failed to load hiring status
            </p>
          </div>
        ) : !selectedProject ? (
          <div className="flex h-32 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-slate-100 p-3">
              <Target className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                No active projects
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Create a project with roles to track hiring progress
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 rounded-xl bg-slate-50/80 p-4">
              <CompletionRing percentage={summary.completion} />
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Required</span>
                  <span className="text-lg font-bold tabular-nums text-slate-700">
                    {summary.totalRequired}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Filled</span>
                  <span className="text-lg font-bold tabular-nums text-emerald-600">
                    {summary.totalFilled}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Remaining</span>
                  <span className="text-lg font-bold tabular-nums text-amber-600">
                    {summary.totalRequired - summary.totalFilled}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-auto text-xs",
                    summary.completion >= 75
                      ? "bg-emerald-100 text-emerald-700"
                      : summary.completion >= 50
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  )}
                >
                  {summary.completion >= 100
                    ? "Fully Filled"
                    : summary.completion >= 75
                      ? "Almost There"
                      : summary.completion >= 50
                        ? "In Progress"
                        : "Getting Started"}
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
