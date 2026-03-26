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
  ChevronLeft,
  ChevronRight,
  Pencil,
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
import { ConfirmationDialog } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/app/hooks";
import {
  useGetScreeningsQuery,
  useGetAssignedScreeningsQuery,
  useGetUpcomingScreeningsQuery,
  useGetCoordinatorStatsQuery,
  useUpdateScreeningDecisionMutation,
} from "../data";
import { useCreateTrainingAssignmentMutation } from "@/features/screening-coordination/training/data";
import { useGetProjectQuery } from "@/features/projects/api";
import { SCREENING_DECISION } from "../../types";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ScheduleScreeningModal from "../components/ScheduleScreeningModal";
import { motion } from "framer-motion";
import { ImageViewer, ProjectRoleFilter, ProjectRoleFilterValue } from "@/components/molecules";
import ProjectDetailsModal from "@/components/molecules/ProjectDetailsModal";
import { AssignToTrainerDialog } from "@/features/screening-coordination/training/components/AssignToTrainerDialog";
import ScheduleTrainingModal from "@/features/screening-coordination/training/components/ScheduleTrainingModal";

type TileKey =
  | "assigned"
  | "scheduled"
  | "retraining"
  | "training_scheduled"
  | "training_completed"
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
    label: "Training Assigned",
    icon: Users,
    value: stats?.byDecision?.needsTraining ?? 0,
    hint: "Candidate assigned to training",
    gradient: "from-yellow-400 to-amber-500",
    bgGradient: "from-yellow-50 to-amber-100/50",
    iconBg: "bg-yellow-200/40",
    textColor: "text-amber-600",
  },
  {
    key: "training_scheduled",
    label: "Training Scheduled",
    icon: Clock,
    value: stats?.byDecision?.trainingScheduled ?? 0,
    hint: "Candidates with scheduled training",
    gradient: "from-blue-400 to-indigo-500",
    bgGradient: "from-blue-50 to-indigo-100/50",
    iconBg: "bg-blue-200/40",
    textColor: "text-indigo-600",
  },
  {
    key: "training_completed",
    label: "Training Done",
    icon: CheckCircle2,
    value: stats?.byDecision?.trainingCompleted ?? 0,
    hint: "Candidates who completed training",
    gradient: "from-emerald-400 to-teal-500",
    bgGradient: "from-emerald-50 to-teal-100/50",
    iconBg: "bg-emerald-200/40",
    textColor: "text-teal-600",
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
  const [assignToTrainerOpen, setAssignToTrainerOpen] = useState(false);
  const [selectedInterviewForTraining, setSelectedInterviewForTraining] = useState<any | null>(null);
  const [isScheduleTrainingOpen, setIsScheduleTrainingOpen] = useState(false);
  const [selectedAssignmentsForTraining, setSelectedAssignmentsForTraining] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectRoleFilterValue>({
    projectId: "all",
    roleCatalogId: "all",
  });

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionScreeningItem, setDecisionScreeningItem] = useState<any | null>(null);
  const [decisionValue, setDecisionValue] = useState<SCREENING_DECISION | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState("");

  const [needsTrainingType, setNeedsTrainingType] = useState<string>("technical");
  const [needsTrainingFocusAreas, setNeedsTrainingFocusAreas] = useState<string[]>([]);
  const [needsTrainingFocusAreaInput, setNeedsTrainingFocusAreaInput] = useState("");
  const [needsTrainingPriority, setNeedsTrainingPriority] = useState<string>("medium");
  const [needsTrainingTargetCompletionDate, setNeedsTrainingTargetCompletionDate] = useState<string>("");
  const [needsTrainingNotes, setNeedsTrainingNotes] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Reset page when tile or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTile, filter, search]);

  const handleAddNeedsTrainingFocusArea = () => {
    const normalized = needsTrainingFocusAreaInput.trim();
    if (!normalized) return;
    if (!needsTrainingFocusAreas.includes(normalized)) {
      setNeedsTrainingFocusAreas((prev) => [...prev, normalized]);
    }
    setNeedsTrainingFocusAreaInput("");
  };

  const handleRemoveNeedsTrainingFocusArea = (area: string) => {
    setNeedsTrainingFocusAreas((prev) => prev.filter((item) => item !== area));
  };

  const openDecisionModal = (item: any) => {
    setDecisionScreeningItem(item);
    setDecisionValue(item.decision || SCREENING_DECISION.APPROVED);
    setDecisionRemarks("");
    setNeedsTrainingType("technical");
    setNeedsTrainingFocusAreas([]);
    setNeedsTrainingFocusAreaInput("");
    setNeedsTrainingPriority("medium");
    setNeedsTrainingTargetCompletionDate("");
    setNeedsTrainingNotes("");
    setIsDecisionModalOpen(true);
  };

  const handleUpdateDecision = async () => {
    if (!decisionScreeningItem || !decisionValue) {
      return;
    }

    try {
      const payload: any = {
        decision: decisionValue,
        remarks: decisionRemarks || undefined,
      };

      if (decisionValue === SCREENING_DECISION.NEEDS_TRAINING) {
        payload.trainingType = needsTrainingType;
        payload.focusAreas = needsTrainingFocusAreas;
        payload.priority = needsTrainingPriority;
        payload.targetCompletionDate = needsTrainingTargetCompletionDate || undefined;
        payload.trainingNotes = needsTrainingNotes || undefined;
      }

      await updateScreeningDecision({
        id: decisionScreeningItem.id,
        data: payload,
      }).unwrap();

      toast.success("Decision updated successfully");
      setIsDecisionModalOpen(false);
      setDecisionScreeningItem(null);
      setDecisionValue(null);
      setDecisionRemarks("");
      refetchDecision();
      refetchStats();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update decision");
    }
  };

  const { data: projectDetailData } = useGetProjectQuery(
    selectedProjectId as string,
    { skip: !selectedProjectId }
  );

  const [createTrainingAssignment, { isLoading: isCreatingTraining }] = useCreateTrainingAssignmentMutation();
  const [updateScreeningDecision, { isLoading: isUpdatingDecision }] = useUpdateScreeningDecisionMutation();

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
      case "training_scheduled":
        return SCREENING_DECISION.NEEDS_TRAINING; // Both use NEEDS_TRAINING decision, filtered by status below
      case "training_completed":
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

  const { data: decisionData, isLoading: decisionLoading, error: decisionError, refetch: refetchDecision } = useGetScreeningsQuery(
    {
      ...queryParams,
      decision: activeDecisionParam,
      status: activeTile === "training_completed"
        ? "training_completed"
        : activeTile === "training_scheduled"
        ? "training_scheduled"
        : activeTile === "retraining"
        ? "training_assigned"
        : undefined,
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
      mode: item.mode,
    }));
  }, [upcomingData]);

  const decisionItems = useMemo(() => {
    const items = decisionData?.data?.items || [];
    return items.map((item: any) => {
      const allAssignments = item.trainingAssignments || [];
      const trainingAssignment = allAssignments.reduce((latest: any, current: any) => {
        if (!latest) return current;
        const latestDate = new Date(latest.assignedAt || latest.createdAt || 0).getTime();
        const currentDate = new Date(current.assignedAt || current.createdAt || 0).getTime();
        return currentDate > latestDate ? current : latest;
      }, null);
      const assignmentStatus = trainingAssignment?.status || item.status;

      return {
        id: item.id,
        candidate: item.candidateProjectMap?.candidate,
        project: item.candidateProjectMap?.project,
        roleNeeded: item.candidateProjectMap?.roleNeeded,
        recruiter: item.candidateProjectMap?.recruiter,
        status: assignmentStatus,
        subStatus: item.decision,
        scheduledTime: item.scheduledTime,
        trainingAssignedAt: trainingAssignment?.assignedAt ?? item.candidateProjectMap?.assignedAt ?? item.createdAt,
        createdAt: item.createdAt,
        decision: item.decision,
        conductedAt: item.conductedAt,
        overallRating: item.overallRating,
        trainingAssignment,
      };
    });
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {allStats.map((tile, i) => {
            const Icon = tile.icon;
            const isActive = activeTile === tile.key;

            return (
              <motion.div
                key={tile.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
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
                  {activeTile === "retraining" && selectedIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white shadow-md animate-in fade-in slide-in-from-right-2 mr-2"
                        onClick={() => {
                          const selected = tableItems.filter((it: any) => selectedIds.includes(it.id));
                          // Map screening items to training assignments if possible
                          // Normally, retraining tile shows screenings with needs_training decision
                          // These already have training assignments created via the completeScreening API
                          setSelectedAssignmentsForTraining(selected.map((s: any) => s.trainingAssignment).filter(Boolean));
                          setIsScheduleTrainingOpen(true);
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule Bulk Training ({selectedIds.length})
                      </Button>
                    </motion.div>
                  )}
                  {activeTile === "training_scheduled" && selectedIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md animate-in fade-in slide-in-from-right-2"
                        onClick={() => {
                          const selected = tableItems.filter((it: any) => selectedIds.includes(it.id));
                          navigate("/screening-coordination/training/conduct", { 
                            state: { 
                              assignments: selected.map((s: any) => ({
                                ...s.trainingAssignment,
                                candidateProjectMap: s.candidateProjectMap || {
                                  candidate: s.candidate,
                                  project: s.project,
                                  roleNeeded: s.roleNeeded
                                }
                              })).filter(Boolean) 
                            } 
                          });
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Conduct Bulk Training ({selectedIds.length})
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 border-b border-gray-200">
                    {((activeTile === "assigned") || (activeTile === "retraining") || (activeTile === "training_scheduled")) && (
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
                    {(activeTile === "retraining" || activeTile === "training_scheduled") && (
                      <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Attempt</TableHead>
                    )}
                    {activeTile === "scheduled" ? (
                      <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Mode</TableHead>
                    ) : activeTile !== "assigned" && (
                      <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Decision</TableHead>
                    )}
                    {((activeTile === "retraining") || (activeTile === "passed") || (activeTile === "rejected") || (activeTile === "on_hold")) && (
                      <>
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Conducted At</TableHead>
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Overall Rating</TableHead>
                      </>
                    )}
                    <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Status</TableHead>
                    <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">
                      {activeTile === "assigned"
                        ? "Assigned At"
                        : activeTile === "scheduled"
                        ? "Scheduled"
                        : activeTile === "retraining"
                        ? "Training Assigned At"
                        : "Scheduled"}
                    </TableHead>
                    {(activeTile !== "retraining" && activeTile !== "training_scheduled") && (
                      <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Recruiter</TableHead>
                    )}
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

                      const trainingAssignment = item.trainingAssignment || item.trainingAssignments?.[0];
                      const attemptText = trainingAssignment?.trainingAttemptTotal
                        ? `${trainingAssignment.trainingAttemptTotal}${trainingAssignment.trainingAttemptCurrent ? ` (Current: ${trainingAssignment.trainingAttemptCurrent})` : ""}`
                        : null;

                      const targetScreeningsUrl = activeTile === "scheduled"
                        ? `/screenings/${item.id}/conduct`
                        : activeTile === "retraining"
                        ? "/screenings/training" // navigate to the training listing page
                        : ["training_scheduled", "training_completed"].includes(activeTile)
                        ? "/screenings/training"
                        : ["passed", "on_hold"].includes(activeTile)
                        ? "/screenings/list"
                        : "/screenings";

                      return (
                        <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors last:border-b-0">
                          {((activeTile === "assigned") || (activeTile === "retraining") || (activeTile === "training_scheduled")) && (
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
                                    navigate(targetScreeningsUrl);
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
                          {(activeTile === "retraining" || activeTile === "training_scheduled") && (
                            <TableCell className="px-4 py-2">
                              {attemptText ? (
                                <Badge className="text-[10px] font-semibold uppercase px-2 py-1 bg-amber-100 text-amber-700 border-amber-200">
                                  {attemptText}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-slate-400">N/A</span>
                              )}
                            </TableCell>
                          )}
                          {activeTile === "scheduled" ? (
                            <TableCell className="px-4 py-2">
                              <Badge
                                variant="outline"
                                className="border font-medium text-[10px] px-2 py-0.5 capitalize bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {item.mode || "Online"}
                              </Badge>
                            </TableCell>
                          ) : activeTile !== "assigned" && (
                            <TableCell className="px-4 py-2">
                              <div className="inline-flex items-center gap-2">
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
                                {activeTile === "training_completed" && item.decision === "needs_training" && (
                                  <div className="relative group flex items-center">
                                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-white border border-red-400 text-red-600 font-extrabold animate-pulse cursor-help">
                                      !
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[100] w-[200px] whitespace-normal break-words text-[11px] font-medium leading-tight text-red-700 bg-white border border-red-200 px-3 py-2 rounded-lg shadow-xl ring-1 ring-black/5">
                                      Training completed, but screening decision is still needs_training. Please update to approved or rejected.
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white drop-shadow-sm" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {((activeTile === "retraining") || (activeTile === "passed") || (activeTile === "rejected") || (activeTile === "on_hold")) && (
                            <>
                              <TableCell className="px-4 py-2 text-[11px] text-gray-600">
                                {item.conductedAt ? format(new Date(item.conductedAt), "dd MMM, HH:mm") : "-"}
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                {item.overallRating != null ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold",
                                      item.overallRating >= 80
                                        ? "bg-emerald-100 text-emerald-700"
                                        : item.overallRating >= 60
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-red-100 text-red-700"
                                    )}
                                  >
                                    {item.overallRating}%
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="px-4 py-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              {item.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-2 text-[11px] text-gray-600">
                            {activeTile === "assigned" ? (
                              item.createdAt ? format(new Date(item.createdAt), "dd MMM, HH:mm") : "-"
                            ) : activeTile === "scheduled" ? (
                              item.scheduledTime ? format(new Date(item.scheduledTime), "dd MMM, HH:mm") : "-"
                            ) : activeTile === "retraining" ? (
                              item.trainingAssignedAt ? format(new Date(item.trainingAssignedAt), "dd MMM, HH:mm") : "-"
                            ) : (
                              item.scheduledTime ? format(new Date(item.scheduledTime), "dd MMM, HH:mm") : "-"
                            )}
                          </TableCell>
                          {(activeTile !== "retraining" && activeTile !== "training_scheduled") && (
                            <TableCell className="px-4 py-2">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-[11px] font-medium text-slate-800">{item.recruiter?.name ?? "-"}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="px-4 py-2 text-right flex items-center justify-end gap-2">
                            {activeTile === "retraining" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={() => {
                                  if (item.trainingAssignment) {
                                    setSelectedAssignmentsForTraining([item.trainingAssignment]);
                                    setIsScheduleTrainingOpen(true);
                                  } else {
                                    toast.error("No training assignment found for this candidate");
                                  }
                                }}
                              >
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                              </Button>
                            )}
                            {activeTile === "training_scheduled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                onClick={() => {
                                  if (item.trainingAssignment) {
                                    navigate("/screening-coordination/training/conduct", { 
                                      state: { 
                                        assignments: [{
                                          ...item.trainingAssignment,
                                          candidateProjectMap: item.candidateProjectMap || {
                                            candidate: item.candidate,
                                            project: item.project,
                                            roleNeeded: item.roleNeeded
                                          }
                                        }] 
                                      } 
                                    });
                                  } else {
                                    toast.error("No training assignment found for this candidate");
                                  }
                                }}
                              >
                                <Users className="h-3.5 w-3.5 mr-1" />
                                Conduct Training
                              </Button>
                            )}
                            {activeTile === "training_completed" && item.decision === SCREENING_DECISION.NEEDS_TRAINING && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => openDecisionModal(item)}
                                title="Edit decision"
                              >
                                <Pencil className="h-3.5 w-3.5 text-amber-600" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                navigate(targetScreeningsUrl);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
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

        <ScheduleTrainingModal
          open={isScheduleTrainingOpen}
          onOpenChange={setIsScheduleTrainingOpen}
          selectedAssignments={selectedAssignmentsForTraining}
          onSuccess={() => {
            refetchStats();
            refetchDecision();
            setSelectedIds([]);
            setSelectedAssignmentsForTraining([]);
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

        <ConfirmationDialog
          isOpen={isDecisionModalOpen}
          onClose={() => {
            setIsDecisionModalOpen(false);
            setDecisionScreeningItem(null);
            setDecisionValue(null);
            setDecisionRemarks("");
          }}
          title="Update Screening Decision"
          description={
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">Current decision</p>
                <p className="text-sm font-bold text-slate-700">{decisionScreeningItem?.decision ? decisionScreeningItem.decision.replace("_", " ") : "—"}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New decision</label>
                <Select value={decisionValue || ""} onValueChange={(value) => setDecisionValue(value as SCREENING_DECISION)}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SCREENING_DECISION.APPROVED}>Passed</SelectItem>
                    <SelectItem value={SCREENING_DECISION.REJECTED}>Rejected</SelectItem>
                    <SelectItem value={SCREENING_DECISION.ON_HOLD}>On Hold</SelectItem>
                    <SelectItem value={SCREENING_DECISION.NEEDS_TRAINING}>Needs Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remarks</label>
                <Textarea
                  value={decisionRemarks}
                  onChange={(e) => setDecisionRemarks(e.target.value)}
                  rows={3}
                  placeholder="Optional remarks"
                />
              </div>

              {decisionValue === SCREENING_DECISION.NEEDS_TRAINING && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Training Type</label>
                    <Select value={needsTrainingType} onValueChange={setNeedsTrainingType}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select training type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interview_skills">Interview Skills</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="role_specific">Role Specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Priority</label>
                    <Select value={needsTrainingPriority} onValueChange={setNeedsTrainingPriority}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Focus Areas</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Add focus area"
                        value={needsTrainingFocusAreaInput}
                        onChange={(e) => setNeedsTrainingFocusAreaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNeedsTrainingFocusArea();
                          }
                        }}
                      />
                      <Button size="sm" onClick={handleAddNeedsTrainingFocusArea} disabled={!needsTrainingFocusAreaInput.trim()}>
                        Add
                      </Button>
                    </div>
                    {needsTrainingFocusAreas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {needsTrainingFocusAreas.map((area) => (
                          <span key={area} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs">
                            {area}
                            <button type="button" className="font-bold" onClick={() => handleRemoveNeedsTrainingFocusArea(area)}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Target completion date</label>
                      <Input
                        type="date"
                        value={needsTrainingTargetCompletionDate}
                        onChange={(e) => setNeedsTrainingTargetCompletionDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Training notes</label>
                      <Textarea
                        value={needsTrainingNotes}
                        onChange={(e) => setNeedsTrainingNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
          confirmText={isUpdatingDecision ? "Updating..." : "Update Decision"}
          cancelText="Cancel"
          isLoading={isUpdatingDecision}
          confirmDisabled={!decisionValue}
          onConfirm={handleUpdateDecision}
        />

        <AssignToTrainerDialog
          open={assignToTrainerOpen}
          onOpenChange={setAssignToTrainerOpen}
          candidateName={
            selectedInterviewForTraining?.candidateProjectMap?.candidate
              ? `${selectedInterviewForTraining.candidateProjectMap.candidate.firstName} ${selectedInterviewForTraining.candidateProjectMap.candidate.lastName}`
              : undefined
          }
          onSubmit={async (formData: any) => {
            if (!selectedInterviewForTraining) return;
            if (!user?.id) {
              return;
            }
            try {
              await createTrainingAssignment({
                candidateProjectMapId: selectedInterviewForTraining?.candidateProjectMap?.id,
                screeningId: selectedInterviewForTraining.id,
                assignedBy: user.id,
                trainingType: formData.trainingType,
                focusAreas: formData.focusAreas,
                priority: formData.priority,
                targetCompletionDate: formData.targetCompletionDate || undefined,
                notes: formData.notes,
              }).unwrap();

              setAssignToTrainerOpen(false);
              setSelectedInterviewForTraining(null);
              refetchAssigned();
              refetchUpcoming();
              refetchStats();
            } catch (err: any) {
              // preserve current behavior with toast
            }
          }}
          isLoading={isCreatingTraining}
          screeningId={selectedInterviewForTraining?.id}
        />
      </div>
    </div>
  );
}
