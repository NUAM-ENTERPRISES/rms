import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Briefcase,
  Check,
  Loader2,
  GitBranch,
  Send,
  FileText,
  Mic,
  Settings,
  CheckCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetCoordinatorMyProjectsQuery,
  useGetCoordinatorProjectPipelineQuery,
} from "../api/projectCoordinatorDashboardApi";

const STAGE_TILES = [
  {
    key: "nominated",
    label: "Nominated",
    subtitle: "Submitted candidates",
    icon: Send,
    accent: "indigo",
    chartFill: "#6366f1",
  },
  {
    key: "documents",
    label: "Documents",
    subtitle: "In document stage",
    icon: FileText,
    accent: "amber",
    chartFill: "#f59e0b",
  },
  {
    key: "interview",
    label: "Interview",
    subtitle: "Scheduled / completed",
    icon: Mic,
    accent: "purple",
    chartFill: "#a855f7",
  },
  {
    key: "processing",
    label: "Processing",
    subtitle: "Under processing",
    icon: Settings,
    accent: "orange",
    chartFill: "#f97316",
  },
  {
    key: "deployed",
    label: "Deployed",
    subtitle: "Successfully deployed",
    icon: CheckCircle,
    accent: "emerald",
    chartFill: "#10b981",
  },
] as const;

const TILE_ACCENT_STYLES: Record<
  string,
  { card: string; icon: string; iconBg: string; value: string }
> = {
  indigo: {
    card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100",
    icon: "text-indigo-600",
    iconBg: "bg-indigo-100",
    value: "text-indigo-700",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    value: "text-amber-700",
  },
  purple: {
    card: "from-purple-50 via-white to-purple-50/30 border-purple-100",
    icon: "text-purple-600",
    iconBg: "bg-purple-100",
    value: "text-purple-700",
  },
  orange: {
    card: "from-orange-50 via-white to-orange-50/30 border-orange-100",
    icon: "text-orange-600",
    iconBg: "bg-orange-100",
    value: "text-orange-700",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    value: "text-emerald-700",
  },
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; count: number; fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.fill }}
        />
        <span className="text-sm font-medium text-slate-700">{item.label}</span>
      </div>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
        {item.count} {item.count === 1 ? "candidate" : "candidates"}
      </p>
    </div>
  );
}

export default function CoordinatorProjectPipelineChart() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const debouncedProjectSearch = useDebounce(projectSearch, 300);

  const {
    data: projectsResponse,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
  } = useGetCoordinatorMyProjectsQuery({
    search: debouncedProjectSearch,
    page: projectPage,
    limit: 10,
  });

  const projects = projectsResponse?.data?.projects ?? [];
  const pagination = projectsResponse?.data?.pagination ?? {
    total: 0,
    totalPages: 1,
    page: 1,
  };

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].projectId);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    setProjectPage(1);
  }, [debouncedProjectSearch]);

  const {
    data: pipelineResponse,
    isLoading: isPipelineLoading,
    isError: isPipelineError,
  } = useGetCoordinatorProjectPipelineQuery(
    { projectId: selectedProjectId },
    { skip: !selectedProjectId }
  );

  const pipelineData = pipelineResponse?.data;
  const selectedProject =
    projects.find((p) => p.projectId === selectedProjectId) ??
    pipelineData?.project ??
    null;

  const stageCounts = useMemo(() => {
    const pipeline = pipelineData?.pipeline;
    if (!pipeline) {
      return STAGE_TILES.reduce(
        (acc, tile) => {
          acc[tile.key] = 0;
          return acc;
        },
        {} as Record<string, number>
      );
    }
    return {
      nominated: pipeline.nominated,
      documents: pipeline.documents,
      interview: pipeline.interview,
      processing: pipeline.processing,
      deployed: pipeline.deployed,
    };
  }, [pipelineData?.pipeline]);

  const chartData = useMemo(
    () =>
      STAGE_TILES.map((tile) => ({
        key: tile.key,
        label: tile.label,
        count: stageCounts[tile.key] ?? 0,
        fill: tile.chartFill,
      })),
    [stageCounts]
  );

  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setIsProjectOpen(false);
  }, []);

  const selectedProjectName =
    selectedProject?.projectName ?? "Select Project";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-700">
              Project Candidate Pipeline
            </CardTitle>
            <CardDescription>
              Candidate counts by workflow stage for each project
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
                    <Briefcase className="h-4 w-4 shrink-0 text-indigo-500" />
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
                  {isProjectsLoading ? (
                    <div className="flex items-center justify-center px-3 py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No projects found
                    </div>
                  ) : (
                    projects.map((project) => (
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
                        <div className="min-w-0 truncate font-medium">
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

      <CardContent className="space-y-5 pt-2">
        {isProjectsError ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">Failed to load projects</p>
          </div>
        ) : isProjectsLoading && projects.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-slate-100 p-3">
              <GitBranch className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                No projects yet
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Create a project to track candidate pipeline stages
              </p>
            </div>
          </div>
        ) : (
          <>
            {selectedProject && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <span className="font-medium text-slate-800">
                    {selectedProject.projectName}
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">
                  {selectedProject.clientName}
                </span>
                <span className="text-slate-300">|</span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {(pipelineData?.pipeline.total ?? 0).toLocaleString()}{" "}
                  candidate
                  {(pipelineData?.pipeline.total ?? 0) === 1 ? "" : "s"} in
                  pipeline
                </span>
              </div>
            )}

            {isPipelineLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isPipelineError ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2">
                <p className="text-sm text-destructive">
                  Failed to load pipeline data
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {STAGE_TILES.map((tile) => {
                    const Icon = tile.icon;
                    const styles = TILE_ACCENT_STYLES[tile.accent];
                    return (
                      <div
                        key={tile.key}
                        className={cn(
                          "rounded-xl border bg-gradient-to-br p-3 shadow-sm",
                          styles.card
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              {tile.label}
                            </p>
                            <p
                              className={cn(
                                "text-2xl font-bold tabular-nums",
                                styles.value
                              )}
                            >
                              {stageCounts[tile.key] ?? 0}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {tile.subtitle}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "shrink-0 rounded-lg p-1.5",
                              styles.iconBg
                            )}
                          >
                            <Icon
                              className={cn("h-3.5 w-3.5", styles.icon)}
                              aria-hidden
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {pipelineData?.pipeline.total === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                    <Users className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      No candidates in this project yet
                    </p>
                    <p className="text-xs text-slate-400">
                      Pipeline counts will appear once candidates are nominated
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      barSize={48}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
