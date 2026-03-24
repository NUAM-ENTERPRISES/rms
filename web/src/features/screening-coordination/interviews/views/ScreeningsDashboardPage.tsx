import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Calendar,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Search,
  UserCheck,
  Eye,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/app/hooks";
import {
  useGetScreeningsQuery,
  useGetAssignedScreeningsQuery,
  useGetUpcomingScreeningsQuery,
  useGetCoordinatorStatsQuery,
} from "../data";
import { useGetProjectQuery } from "@/features/projects/api";
import { SCREENING_DECISION } from "../../types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ScheduleScreeningModal from "../components/ScheduleScreeningModal";
import { motion } from "framer-motion";
import { ImageViewer, ProjectRoleFilter, ProjectRoleFilterValue } from "@/components/molecules";
import ProjectDetailsModal from "@/components/molecules/ProjectDetailsModal";

type TileKey =
  | "assigned"
  | "scheduled"
  | "retraining"
  | "passed"
  | "rejected"
  | "on_hold"
  | "pass_rate";

interface TileConfig {
  key: TileKey;
  label: string;
  icon: React.ElementType;
  value: number | string;
  hint: string;
  gradient: string;
  bgGradient: string;
  iconBg: string;
  textColor: string;
}

const TILE_DEFINITIONS = (stats: any, assigned: number, scheduled: number): TileConfig[] => [
  {
    key: "assigned",
    label: "Assigned",
    icon: ClipboardCheck,
    value: assigned,
    hint: "Screenings assigned to you",
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-blue-100/50",
    iconBg: "bg-blue-200/40",
    textColor: "text-blue-600",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    icon: Calendar,
    value: scheduled,
    hint: "Upcoming scheduled screenings",
    gradient: "from-indigo-500 to-blue-500",
    bgGradient: "from-indigo-50 to-blue-100/50",
    iconBg: "bg-indigo-200/40",
    textColor: "text-indigo-600",
  },
  {
    key: "retraining",
    label: "Re-Training",
    icon: Users,
    value: stats?.byDecision?.needsTraining ?? 0,
    hint: "Candidates requiring retraining",
    gradient: "from-yellow-400 to-amber-500",
    bgGradient: "from-yellow-50 to-amber-100/50",
    iconBg: "bg-yellow-200/40",
    textColor: "text-amber-600",
  },
  {
    key: "passed",
    label: "Passed",
    icon: CheckCircle2,
    value: stats?.byDecision?.approved ?? 0,
    hint: "Candidates with passed decision",
    gradient: "from-emerald-500 to-green-500",
    bgGradient: "from-emerald-50 to-green-100/50",
    iconBg: "bg-emerald-200/40",
    textColor: "text-emerald-600",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: Shield,
    value: stats?.byDecision?.rejected ?? 0,
    hint: "Candidates rejected",
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-50 to-red-100/50",
    iconBg: "bg-orange-200/40",
    textColor: "text-orange-600",
  },
  {
    key: "on_hold",
    label: "OnHold",
    icon: Clock,
    value: stats?.byDecision?.onHold ?? 0,
    hint: "Candidates on hold",
    gradient: "from-slate-500 to-slate-700",
    bgGradient: "from-slate-50 to-slate-100/50",
    iconBg: "bg-slate-200/40",
    textColor: "text-slate-600",
  },
  {
    key: "pass_rate",
    label: "Pass Rate",
    icon: TrendingUp,
    value: `${stats?.passRate ?? stats?.approvalRate ?? 0}%`,
    hint: "Percentage of passed interviews",
    gradient: "from-purple-500 to-violet-500",
    bgGradient: "from-purple-50 to-violet-100/50",
    iconBg: "bg-purple-200/40",
    textColor: "text-purple-600",
  },
];

export default function ScreeningsDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const coordinatorId = (user?.id as string) || "";

  const [activeTile, setActiveTile] = useState<TileKey>("assigned");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectRoleFilterValue>({
    projectId: "all",
    roleCatalogId: "all",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Reset page when tile or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTile, filter, search]);

  const { data: projectDetailData, isLoading: projectDetailLoading } = useGetProjectQuery(
    selectedProjectId as string,
    { skip: !selectedProjectId }
  );

  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    projectId: filter.projectId !== "all" ? filter.projectId : undefined,
    roleCatalogId: filter.roleCatalogId !== "all" ? filter.roleCatalogId : undefined,
    search: search || undefined,
  }), [currentPage, filter, search]);

  const { data: assignedData, isLoading: assignedLoading, refetch: refetchAssigned } = useGetAssignedScreeningsQuery(
    queryParams,
    { skip: !coordinatorId }
  );

  const { data: upcomingData, isLoading: upcomingLoading, refetch: refetchUpcoming } = useGetUpcomingScreeningsQuery(
    queryParams,
    { skip: !coordinatorId }
  );

  const { data: coordinatorStats, isLoading: statsLoading, refetch: refetchStats } = useGetCoordinatorStatsQuery(
    coordinatorId,
    { skip: !coordinatorId }
  );

  const activeDecisionParam = useMemo(() => {
    switch (activeTile) {
      case "retraining":
        return SCREENING_DECISION.NEEDS_TRAINING;
      case "passed":
        return SCREENING_DECISION.APPROVED;
      case "rejected":
        return SCREENING_DECISION.REJECTED;
      case "on_hold":
        return SCREENING_DECISION.ON_HOLD;
      default:
        return undefined;
    }
  }, [activeTile]);

  const { data: decisionData, isLoading: decisionLoading, error: decisionError } = useGetScreeningsQuery(
    {
      ...queryParams,
      decision: activeDecisionParam,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    { skip: !coordinatorId }
  );

  const assignedItems = assignedData?.data?.items ?? [];
  const assignedNormalized = useMemo(() => {
    return assignedItems
      .filter((it: any) => it.assignedAt)
      .map((it: any) => ({
        id: it.id,
        candidate: it.candidate,
        project: it.project,
        roleNeeded: it.roleNeeded,
        recruiter: it.recruiter,
        status: it.subStatus?.label || it.subStatus?.name || "Assigned",
        subStatus: it.subStatus?.label || it.subStatus?.name,
        scheduledTime: it.assignedAt,
        createdAt: it.assignedAt,
      }));
  }, [assignedItems]);

  const upcomingItems = useMemo(() => {
    const items = upcomingData?.data?.items || [];
    return items.map((item: any) => ({
      id: item.id,
      candidate: item.candidateProjectMap?.candidate,
      project: item.candidateProjectMap?.project,
      roleNeeded: item.candidateProjectMap?.roleNeeded,
      recruiter: item.candidateProjectMap?.recruiter,
      status: item.status,
      subStatus: item.decision || item.status,
      scheduledTime: item.scheduledTime,
      createdAt: item.createdAt,
      decision: item.decision,
    }));
  }, [upcomingData]);

  const decisionItems = useMemo(() => {
    const items = decisionData?.data?.items || [];
    return items.map((item: any) => ({
      id: item.id,
      candidate: item.candidateProjectMap?.candidate,
      project: item.candidateProjectMap?.project,
      roleNeeded: item.candidateProjectMap?.roleNeeded,
      recruiter: item.candidateProjectMap?.recruiter,
      status: item.status,
      subStatus: item.decision,
      scheduledTime: item.scheduledTime,
      createdAt: item.createdAt,
      decision: item.decision,
    }));
  }, [decisionData]);

  const tableItems = useMemo(() => {
    if (activeTile === "assigned") return assignedNormalized;
    if (activeTile === "scheduled") return upcomingItems;
    return decisionItems;
  }, [activeTile, assignedNormalized, upcomingItems, decisionItems]);

  const totalCount = useMemo(() => {
    if (activeTile === "assigned") return assignedData?.data?.pagination?.total || 0;
    if (activeTile === "scheduled") return upcomingData?.data?.pagination?.total || 0;
    return decisionData?.data?.pagination?.total || 0;
  }, [activeTile, assignedData, upcomingData, decisionData]);

  const allStats = useMemo(
    () => TILE_DEFINITIONS(
      coordinatorStats?.data || coordinatorStats, 
      assignedData?.data?.pagination?.total || 0, 
      upcomingData?.data?.pagination?.total || (coordinatorStats?.data?.pending ?? coordinatorStats?.pending ?? 0)
    ),
    [coordinatorStats, assignedData, upcomingData]
  );

  const isLoading = (activeTile === "assigned" && assignedLoading) || 
                  (activeTile === "scheduled" && upcomingLoading) || 
                  (activeTile !== "assigned" && activeTile !== "scheduled" && decisionLoading) || 
                  statsLoading;
  const hasError = !!decisionError;

  const getRowCandidateFullName = (item: any) => {
    const candidate = item.candidate;
    if (!candidate) return "-";
    return `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load screenings dashboard data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-full mx-auto space-y-3 mt-1 px-3">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-indigo-600" />
              <span>Screenings Dashboard</span>
            </h1>
            <p className="text-slate-500 text-sm">
              Overview of training screening assignments, scheduling, decisions, and performance.
            </p>
          </div>
        </div>

        {/* ── Status Tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {allStats.map((tile, i) => {
            const Icon = tile.icon;
            const isActive = activeTile === tile.key;

            return (
              <motion.div
                key={tile.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={cn(
                  tile.key === "pass_rate" ? "md:col-start-1" : ""
                )}
              >
                <Card
                  onClick={() => setActiveTile(tile.key)}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "h-full border-0 shadow-sm bg-gradient-to-br backdrop-blur-sm transition-all duration-200 cursor-pointer hover:shadow-md transform hover:-translate-y-0.5",
                    tile.bgGradient,
                    isActive ? "ring-2 ring-indigo-500/30 shadow-md scale-[1.02]" : ""
                  )}
                >
                  <CardContent className="py-2 px-2.5 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-600 mb-0.5 truncate uppercase tracking-wider">
                          {tile.label}
                        </p>
                        <h3 className={cn("text-xl font-extrabold tracking-tight", tile.textColor)}>
                          {tile.value}
                        </h3>
                      </div>
                      <div className={cn("p-1.5 rounded-lg shrink-0 shadow-sm", tile.iconBg)}>
                        <Icon className={cn("h-4 w-4", tile.textColor)} />
                      </div>
                    </div>
                    <p className="mt-1 text-[9px] text-slate-500 font-medium line-clamp-1 italic">
                      {tile.hint}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="border-0 shadow-lg bg-white/90">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  {allStats.find((t) => t.key === activeTile)?.label ?? "Screenings"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tableItems.length} record{tableItems.length === 1 ? "" : "s"} found
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <ProjectRoleFilter
                  value={filter}
                  onChange={(newFilter) => setFilter(newFilter)}
                  className="w-auto min-w-[300px]"
                />
                <div className="relative group w-64">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    placeholder="Search in list..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs border-slate-200 bg-slate-50 focus:bg-white transition-all rounded-xl"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTile("assigned");
                    setFilter({ projectId: "all", roleCatalogId: "all" });
                    setSearch("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-2 shadow-lg shadow-purple-500/20">
                    <ClipboardCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900">
                      {allStats.find((t) => t.key === activeTile)?.label ?? "Screenings"}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5 font-medium">
                      {tableItems.length} candidate{tableItems.length !== 1 ? "s" : ""} in total
                    </p>
                  </div>
                  {activeTile === "assigned" && selectedIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md animate-in fade-in slide-in-from-right-2"
                        onClick={() => setIsBulkScheduleOpen(true)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Bulk Schedule ({selectedIds.length})
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 border-b border-gray-200">
                    {activeTile === "assigned" && filter.projectId !== "all" && (
                      <TableHead className="w-[40px] px-4">
                        <Checkbox
                          checked={tableItems.length > 0 && selectedIds.length === tableItems.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(tableItems.map((it: any) => it.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Candidate</TableHead>
                    <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Project & Role</TableHead>
                    {activeTile !== "assigned" && (
                      <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Decision</TableHead>
                    )}
                    <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Status</TableHead>
                    <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">
                      {activeTile === "assigned" ? "Assigned At" : "Scheduled"}
                    </TableHead>
                    <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Recruiter</TableHead>
                    <TableHead className="h-10 px-4 text-right text-[11px] font-medium uppercase tracking-wider text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableItems.length > 0 ? (
                    tableItems.map((item: any) => {
                      const candidate = item.candidate;
                      const candidateName = getRowCandidateFullName(item);
                      const projectName = item.project?.title || "-";
                      const roleName = item.roleNeeded?.designation || item.roleNeeded?.roleCatalog?.label || "-";
                      const decision = String(item.decision || item.subStatus || "-")
                        .replace("needs_training", "Needs Training")
                        .replace("on_hold", "On Hold")
                        .replace("approved", "Passed");

                      return (
                        <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors last:border-b-0">
                          {activeTile === "assigned" && filter.projectId !== "all" && (
                            <TableCell className="px-4 py-2">
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedIds((prev) => [...prev, item.id]);
                                  } else {
                                    setSelectedIds((prev) => prev.filter((i) => i !== item.id));
                                  }
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <ImageViewer
                                src={candidate?.profileImage}
                                title={candidateName}
                                className="h-10 w-10 shadow-sm"
                              />
                              <div className="flex-1">
                                <button
                                  onClick={() => {
                                    if (activeTile === "assigned") {
                                      setSelectedAssignment(item);
                                      setIsScheduleOpen(true);
                                    } else {
                                      navigate(`/screenings/${item.id}`);
                                    }
                                  }}
                                  className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline transition-all duration-200 text-left text-sm"
                                >
                                  {candidateName}
                                </button>
                                <div className="text-[11px] text-slate-500 space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-700">{candidate?.email || "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800 line-clamp-1 flex items-center gap-1.5">
                                {projectName}
                                {item.project && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProjectId(item.project.id);
                                      setIsProjectModalOpen(true);
                                    }}
                                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all duration-200"
                                    title="View Project Details"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">{roleName}</span>
                            </div>
                          </TableCell>
                          {activeTile !== "assigned" && (
                            <TableCell className="px-4 py-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border font-medium text-[10px] px-2 py-0.5 capitalize",
                                  decision.toLowerCase().includes("pass") ? "bg-emerald-100 text-emerald-700 border-emerald-300" :
                                  decision.toLowerCase().includes("rejected") ? "bg-red-100 text-red-700 border-red-300" :
                                  decision.toLowerCase().includes("training") ? "bg-amber-100 text-amber-700 border-amber-300" :
                                  "bg-slate-100 text-slate-700 border-slate-300"
                                )}
                              >
                                {decision}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="px-4 py-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              {item.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-2 text-[11px] text-gray-600">
                            {activeTile === "assigned"
                              ? item.createdAt ? format(new Date(item.createdAt), "dd MMM, HH:mm") : "-"
                              : item.scheduledTime ? format(new Date(item.scheduledTime), "dd MMM, HH:mm") : "-"}
                          </TableCell>
                          <TableCell className="px-4 py-2">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-[11px] font-medium text-slate-800">{item.recruiter?.name ?? "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2 text-right">
                            {activeTile === "assigned" ? (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-[10px] h-7 px-2"
                                onClick={() => {
                                  setSelectedAssignment(item);
                                  setIsScheduleOpen(true);
                                }}
                              >
                                Schedule
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigate(`/screenings/${item.id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={activeTile === "assigned" ? 7 : 7} className="px-6 py-12 text-center">
                        <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-600 mb-1">No items found</h3>
                        <p className="text-xs text-slate-500">Try selecting a different filter or search term.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination UI */}
              {totalCount > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage * pageSize >= totalCount}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, totalCount)}
                        </span>{" "}
                        of <span className="font-medium">{totalCount}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-l-md"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-none border-x-0"
                          disabled
                        >
                          Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-r-md"
                          onClick={() => setCurrentPage((p) => p + 1)}
                          disabled={currentPage * pageSize >= totalCount}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <ScheduleScreeningModal
          open={isScheduleOpen || isBulkScheduleOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsScheduleOpen(false);
              setIsBulkScheduleOpen(false);
              setSelectedAssignment(null);
            }
          }}
          selectedAssignment={selectedAssignment}
          selectedAssignments={
            isBulkScheduleOpen
              ? tableItems.filter((it: any) =>
                  selectedIds.includes(it.id)
                )
              : []
          }
          refetchAssigned={() => {
            refetchAssigned();
            refetchUpcoming();
            refetchStats();
            setSelectedIds([]);
            setIsBulkScheduleOpen(false);
          }}
        />

        <ProjectDetailsModal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setSelectedProjectId(null);
          }}
          project={projectDetailData?.data}
        />
      </div>
    </div>
  );
}
