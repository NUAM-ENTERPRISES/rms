import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  TrendingUp,
  ClipboardCheck,
  Mail,
  X,
  Search,
  CalendarDays,
  Send,
  Settings,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Calendar,
  RefreshCw,
  Eye,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { useCan } from "@/hooks/useCan";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import ProjectDetailsModal from "@/components/molecules/ProjectDetailsModal";
import {
  useGetInterviewsQuery,
  useUpdateClientDecisionMutation,
  useGetSummaryStatsQuery,
  useGetAssignedScreeningsQuery,
  useGetUpcomingScreeningsQuery,
} from "../api";
import { useGetScreeningsQuery } from "@/features/screening-coordination/interviews/data";
import { useGetProjectQuery } from "@/features/projects/api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ClientDecisionModal } from "../components/ClientDecisionModal";
import { toast } from "sonner";
import { format } from "date-fns";

type TileDef = {
  key: string;
  label: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  iconBg: string;
  textColor: string;
};

const TILES: TileDef[] = [
  {
    key: "shortlistPending",
    label: "Shortlist Pending",
    icon: Mail,
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-50 to-amber-100/50",
    iconBg: "bg-amber-200/40",
    textColor: "text-amber-600",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    icon: CheckCircle2,
    gradient: "from-teal-500 to-emerald-500",
    bgGradient: "from-teal-50 to-teal-100/50",
    iconBg: "bg-teal-200/40",
    textColor: "text-teal-600",
  },
  {
    key: "shortlistRejected",
    label: "Shortlist Rejected",
    icon: X,
    gradient: "from-rose-500 to-red-500",
    bgGradient: "from-rose-50 to-red-100/50",
    iconBg: "bg-rose-200/40",
    textColor: "text-rose-600",
  },
  {
    key: "interviewScheduled",
    label: "Interview Scheduled",
    icon: Calendar,
    gradient: "from-blue-500 to-indigo-500",
    bgGradient: "from-blue-50 to-indigo-100/50",
    iconBg: "bg-blue-200/40",
    textColor: "text-blue-600",
  },
  {
    key: "interviewPassed",
    label: "Interview Passed",
    icon: CheckCircle,
    gradient: "from-emerald-500 to-green-500",
    bgGradient: "from-emerald-50 to-green-100/50",
    iconBg: "bg-emerald-200/40",
    textColor: "text-emerald-600",
  },
  {
    key: "interviewRejected",
    label: "Interview Rejected",
    icon: AlertTriangle,
    gradient: "from-red-500 to-orange-500",
    bgGradient: "from-red-50 to-orange-100/50",
    iconBg: "bg-red-200/40",
    textColor: "text-red-600",
  },
  {
    key: "screeningAssigned",
    label: "Screening Assigned",
    icon: Send,
    gradient: "from-indigo-500 to-blue-500",
    bgGradient: "from-indigo-50 to-blue-100/50",
    iconBg: "bg-indigo-200/40",
    textColor: "text-indigo-600",
  },
  {
    key: "screeningScheduled",
    label: "Screening Scheduled",
    icon: ClipboardCheck,
    gradient: "from-purple-500 to-violet-500",
    bgGradient: "from-purple-50 to-violet-100/50",
    iconBg: "bg-purple-200/40",
    textColor: "text-purple-600",
  },
  {
    key: "screeningTraining",
    label: "Screening Training",
    icon: Users,
    gradient: "from-fuchsia-500 to-pink-500",
    bgGradient: "from-fuchsia-50 to-pink-100/50",
    iconBg: "bg-fuchsia-200/40",
    textColor: "text-fuchsia-600",
  },
  {
    key: "screeningPassed",
    label: "Screening Passed",
    icon: CheckCircle2,
    gradient: "from-cyan-500 to-blue-500",
    bgGradient: "from-cyan-50 to-blue-100/50",
    iconBg: "bg-cyan-200/40",
    textColor: "text-cyan-600",
  },
  {
    key: "screeningRejected",
    label: "Screening Rejected",
    icon: X,
    gradient: "from-pink-500 to-rose-500",
    bgGradient: "from-pink-50 to-rose-100/50",
    iconBg: "bg-pink-200/40",
    textColor: "text-pink-600",
  },
  {
    key: "onHold",
    label: "Screening On Hold",
    icon: Settings,
    gradient: "from-slate-500 to-gray-500",
    bgGradient: "from-slate-50 to-gray-100/50",
    iconBg: "bg-slate-200/40",
    textColor: "text-slate-600",
  },
];

const STATUS_BADGE: Record<
  string,
  { textColor: string; bgColor: string; borderColor: string }
> = {
  submitted_to_client: {
    textColor: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
  },
  shortlisted: {
    textColor: "text-teal-700",
    bgColor: "bg-teal-100",
    borderColor: "border-teal-300",
  },
  not_shortlisted: {
    textColor: "text-rose-700",
    bgColor: "bg-rose-100",
    borderColor: "border-rose-300",
  },
  interview_scheduled: {
    textColor: "text-blue-700",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
  },
  interview_passed: {
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
  },
  rejected_interview: {
    textColor: "text-red-700",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
  },
  screening_assigned: {
    textColor: "text-indigo-700",
    bgColor: "bg-indigo-100",
    borderColor: "border-indigo-300",
  },
  screening_scheduled: {
    textColor: "text-purple-700",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
  },
  screening_passed: {
    textColor: "text-cyan-700",
    bgColor: "bg-cyan-100",
    borderColor: "border-cyan-300",
  },
  screening_failed: {
    textColor: "text-pink-700",
    bgColor: "bg-pink-100",
    borderColor: "border-pink-300",
  },
};

export default function InterviewsPage() {
  const navigate = useNavigate();

  // Basic search & filter states
  const [activeFilter, setActiveFilter] = useState("shortlistPending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Date filter state
  const [dateRange, setDateRange] = useState<string>("all");

  const { data: summaryStatsData, refetch: refetchStats } = useGetSummaryStatsQuery();

  const {
    data: interviewsData,
    isLoading: isInterviewsLoading,
    isFetching: isInterviewsFetching,
    isError: isInterviewsError,
    refetch: refetchInterviews,
  } = useGetInterviewsQuery({
    page,
    limit,
    search: search || undefined,
  }, { skip: !["shortlistPending", "shortlisted", "shortlistRejected", "interviewScheduled", "interviewPassed", "interviewRejected"].includes(activeFilter) });

  const {
    data: assignedScreeningsData,
    isLoading: isAssignedScreeningsLoading,
    isFetching: isAssignedScreeningsFetching,
    isError: isAssignedScreeningsError,
    refetch: refetchAssignedScreenings,
  } = useGetAssignedScreeningsQuery({
    page,
    limit,
    search: search || undefined,
  }, { skip: activeFilter !== "screeningAssigned" });

  const {
    data: upcomingScreeningsData,
    isLoading: isUpcomingScreeningsLoading,
    isFetching: isUpcomingScreeningsFetching,
    isError: isUpcomingScreeningsError,
    refetch: refetchUpcomingScreenings,
  } = useGetUpcomingScreeningsQuery({
    page,
    limit,
    search: search || undefined,
  }, { skip: activeFilter !== "screeningScheduled" });

  const {
    data: screeningTrainingData,
    isLoading: isScreeningTrainingLoading,
    isFetching: isScreeningTrainingFetching,
    isError: isScreeningTrainingError,
    refetch: refetchScreeningTraining,
  } = useGetScreeningsQuery({
    page,
    limit,
    search: search || undefined,
    decision: "needs_training",
  }, { skip: activeFilter !== "screeningTraining" });

  const {
    data: screeningPassedData,
    isLoading: isScreeningPassedLoading,
    isFetching: isScreeningPassedFetching,
    isError: isScreeningPassedError,
    refetch: refetchScreeningPassed,
  } = useGetScreeningsQuery({
    page,
    limit,
    search: search || undefined,
    decision: "approved",
  }, { skip: activeFilter !== "screeningPassed" });

  const {
    data: screeningRejectedData,
    isLoading: isScreeningRejectedLoading,
    isFetching: isScreeningRejectedFetching,
    isError: isScreeningRejectedError,
    refetch: refetchScreeningRejected,
  } = useGetScreeningsQuery({
    page,
    limit,
    search: search || undefined,
    decision: "rejected",
  }, { skip: activeFilter !== "screeningRejected" });

  const {
    data: screeningOnHoldData,
    isLoading: isScreeningOnHoldLoading,
    isFetching: isScreeningOnHoldFetching,
    isError: isScreeningOnHoldError,
    refetch: refetchScreeningOnHold,
  } = useGetScreeningsQuery({
    page,
    limit,
    search: search || undefined,
    decision: "on_hold",
  }, { skip: activeFilter !== "onHold" });

  const isLoading = isInterviewsLoading || isAssignedScreeningsLoading || isUpcomingScreeningsLoading || isScreeningTrainingLoading || isScreeningPassedLoading || isScreeningRejectedLoading || isScreeningOnHoldLoading;
  const isFetching = isInterviewsFetching || isAssignedScreeningsFetching || isUpcomingScreeningsFetching || isScreeningTrainingFetching || isScreeningPassedFetching || isScreeningRejectedFetching || isScreeningOnHoldFetching;
  const isError = isInterviewsError || isAssignedScreeningsError || isUpcomingScreeningsError || isScreeningTrainingError || isScreeningPassedError || isScreeningRejectedError || isScreeningOnHoldError;

  const refetch = () => {
    refetchInterviews();
    refetchAssignedScreenings();
    refetchUpcomingScreenings();
    refetchScreeningTraining();
    refetchScreeningPassed();
    refetchScreeningRejected();
    refetchScreeningOnHold();
  };

  const candidates = useMemo(() => {
    if (activeFilter === "screeningAssigned") {
      return (assignedScreeningsData as any)?.data?.items ?? [];
    }
    if (activeFilter === "screeningScheduled") {
      return (upcomingScreeningsData as any)?.data?.items ?? (upcomingScreeningsData as any)?.data?.interviews ?? [];
    }
    if (activeFilter === "screeningTraining") {
      return (screeningTrainingData as any)?.data?.items ?? [];
    }
    if (activeFilter === "screeningPassed") {
      return (screeningPassedData as any)?.data?.items ?? [];
    }
    if (activeFilter === "screeningRejected") {
      return (screeningRejectedData as any)?.data?.items ?? [];
    }
    if (activeFilter === "onHold") {
      return (screeningOnHoldData as any)?.data?.items ?? [];
    }
    return (interviewsData?.data?.interviews ?? []) as any[];
  }, [activeFilter, interviewsData, assignedScreeningsData, upcomingScreeningsData, screeningTrainingData, screeningPassedData, screeningRejectedData, screeningOnHoldData]);

  const meta = useMemo(() => {
    if (activeFilter === "screeningAssigned") {
      return (assignedScreeningsData as any)?.data?.pagination;
    }
    if (activeFilter === "screeningScheduled") {
      return (upcomingScreeningsData as any)?.data?.pagination;
    }
    if (activeFilter === "screeningTraining") {
      return (screeningTrainingData as any)?.data?.pagination;
    }
    if (activeFilter === "screeningPassed") {
      return (screeningPassedData as any)?.data?.pagination;
    }
    if (activeFilter === "screeningRejected") {
      return (screeningRejectedData as any)?.data?.pagination;
    }
    if (activeFilter === "onHold") {
      return (screeningOnHoldData as any)?.data?.pagination;
    }
    return interviewsData?.data?.pagination;
  }, [activeFilter, interviewsData, assignedScreeningsData, upcomingScreeningsData, screeningTrainingData, screeningPassedData, screeningRejectedData]);

  const counts = useMemo(() => {
    const stats = summaryStatsData?.data;
    return {
      shortlistPending: stats?.shortlistPending ?? 0,
      shortlisted: stats?.shortlisted ?? 0,
      shortlistRejected: stats?.shortlistRejected ?? 0,
      interviewScheduled: stats?.interviewScheduled ?? 0,
      interviewPassed: stats?.interviewPassed ?? 0,
      interviewRejected: stats?.interviewRejected ?? 0,
      screeningAssigned: stats?.screeningAssigned ?? 0,
      screeningScheduled: stats?.screeningScheduled ?? 0,
      screeningPassed: stats?.screeningPassed ?? 0,
      screeningRejected: stats?.screeningRejected ?? 0,
      onHold: stats?.onHold ?? 0,
      screeningTraining: stats?.screeningTraining ?? 0,
      passRate: stats?.passRate ?? 0,
    };
  }, [summaryStatsData]);

  // Modals / Dialogs
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedShortlisting, setSelectedShortlisting] = useState<any | null>(null);
  const [updateClientDecision] = useUpdateClientDecisionMutation();

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: projectDetailData } = useGetProjectQuery(selectedProjectId as string, {
    skip: !selectedProjectId,
  });

  const handleClientDecision = async (decision: "shortlisted" | "not_shortlisted", reason: string) => {
    if (!selectedShortlisting) return;
    try {
      await updateClientDecision({
        id: selectedShortlisting.id,
        data: {
          decision,
          notes: reason,
        },
      }).unwrap();
      toast.success("Decision updated successfully");
      refetchStats();
      refetch();
      setDecisionModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update decision");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    return format(d, "dd MMM yyyy");
  };

  const getActiveTileLabel = () =>
    TILES.find((t) => t.key === activeFilter)?.label ?? "All Candidates";

  useCan("read:interviews");

  return (
    <div className="min-h-screen">
      <div className="w-full space-y-4 mt-2 px-1">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <span>Interview Dashboard</span>
            </h1>
            <p className="text-slate-500 text-sm">
              Orchestrate every panel with clarity and track candidate progress
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchStats();
            }}
            className="bg-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* ── Search & Filter ── */}
        <Card className="border-0 shadow-lg bg-white/90">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative group flex-1">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <Input
                  placeholder="Search candidates by name, project, or role..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all h-14"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 mr-1">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">Filter By</span>
                </div>
                {["all", "today", "this_week", "this_month"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setDateRange(preset);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      dateRange === preset
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1).replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Status Tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {TILES.map((tile, i) => {
            const Icon = tile.icon;
            const isActive = activeFilter === tile.key;
            const countValue = counts[tile.key as keyof typeof counts];

            return (
              <motion.div
                key={tile.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card
                  onClick={() => {
                    setActiveFilter(tile.key);
                    setPage(1);
                  }}
                  className={`h-full border-0 shadow-sm bg-gradient-to-br ${
                    tile.bgGradient
                  } backdrop-blur-sm transition-all duration-200 cursor-pointer hover:shadow-md transform hover:-translate-y-0.5 ${
                    isActive ? "ring-2 ring-indigo-500/30 shadow-md scale-[1.02]" : ""
                  }`}
                >
                  <CardContent className="py-2.5 px-3 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-600 mb-0.5 truncate uppercase tracking-wider">
                          {tile.label}
                        </p>
                        <h3 className={`text-xl font-extrabold tracking-tight ${tile.textColor}`}>
                          {tile.key === "passRate" ? `${Number(countValue).toFixed(1)}%` : countValue}
                        </h3>
                      </div>
                      <div className={`p-1.5 rounded-lg shrink-0 shadow-sm ${tile.iconBg}`}>
                        <Icon className={`h-4 w-4 ${tile.textColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ── Candidates Table ── */}
        <Card className="border-0 shadow-lg bg-white/90">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  {getActiveTileLabel()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {meta?.total ?? 0} candidate{(meta?.total ?? 0) !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-2 shadow-lg shadow-blue-500/20">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {getActiveTileLabel()}
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
                      {meta?.total ?? 0} candidate{(meta?.total ?? 0) !== 1 ? "s" : ""} in total
                    </p>
                  </div>
                </div>
              </div>

              {isError ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                  <p className="text-red-500 font-medium">Failed to load interview data</p>
                  <Button variant="outline" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              ) : isLoading || isFetching ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium animate-pulse">Loading candidates...</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 border-b border-gray-200">
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Candidate</TableHead>
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Current Stage</TableHead>
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Project / Role</TableHead>
                        {(activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                          <>
                            <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Recruiter</TableHead>
                            <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Trainer</TableHead>
                            {activeFilter !== "screeningAssigned" && (
                              <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Attempts</TableHead>
                            )}
                          </>
                        )}
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">
                          {activeFilter === "screeningAssigned"
                            ? "Assigned At"
                            : activeFilter === "screeningScheduled"
                            ? "Scheduled Time"
                            : ["screeningTraining", "screeningPassed", "screeningRejected"].includes(activeFilter)
                            ? "Overall Rating"
                            : "Updated At"}
                        </TableHead>
                        {activeFilter !== "screeningAssigned" && (
                          <TableHead className="h-10 px-4 text-right text-[11px] font-medium uppercase tracking-wider text-gray-600">Action</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((item) => {
                        const candidateProjectMap = item.candidateProjectMap || item;
                        const subStatus = candidateProjectMap?.subStatus;
                        const statusKey =
                          activeFilter === "screeningRejected"
                            ? "screening_failed"
                            : activeFilter === "onHold"
                            ? "on_hold"
                            : subStatus?.name || "";
                        const badgeStyle =
                          STATUS_BADGE[statusKey] || { textColor: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-300" };
                        const stageLabel =
                          activeFilter === "screeningRejected"
                            ? "Screening Rejected"
                            : activeFilter === "onHold"
                            ? "On Hold"
                            : subStatus?.label || "Scheduled";
                        const candidate = candidateProjectMap?.candidate || item.candidate;

                        return (
                          <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-gray-100 last:border-0 group">
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <ImageViewer
                                  src={candidate?.profileImage}
                                  title={`${candidate?.firstName} ${candidate?.lastName}`}
                                  className="h-9 w-9 shadow-sm rounded-full border border-slate-200 transition-transform group-hover:scale-105"
                                  enableHoverPreview={false}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {candidate?.firstName} {candidate?.lastName}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">{candidate?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={`${badgeStyle.bgColor} ${badgeStyle.textColor} ${badgeStyle.borderColor} border px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold shadow-sm inline-flex items-center rounded-md`}
                              >
                                {stageLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {candidateProjectMap?.roleNeeded?.designation}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 group/project">
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {candidateProjectMap?.project?.title}
                                  </p>
                                  {candidateProjectMap?.project?.id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProjectId(candidateProjectMap.project.id);
                                      }}
                                      className="p-1 hover:bg-blue-50 rounded-md transition-all opacity-0 group-hover/project:opacity-100 flex-shrink-0"
                                      title="View Project Details"
                                    >
                                      <Eye className="h-3 w-3 text-blue-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            {(activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                              <>
                                <TableCell className="px-4 py-3 text-[11px] font-medium text-slate-700">
                                  {candidateProjectMap?.recruiter?.name || "—"}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-[11px] font-medium text-slate-700">
                                  {activeFilter === "screeningAssigned"
                                    ? item.trainer?.name || item.trainer?.id || "—"
                                    : ((activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "screeningScheduled" || activeFilter === "onHold")
                                      ? item.coordinator?.name || item.coordinatorId
                                      : item.trainingAssignments?.[0]?.trainer?.name || item.trainingAssignments?.[0]?.trainerId || "—")}
                                </TableCell>
                                {activeFilter !== "screeningAssigned" && (
                                  <TableCell className="px-4 py-3 text-[11px] font-medium text-slate-700">
                                    {(() => {
                                      const attemptTotal =
                                        item.trainingAssignments?.[0]?.trainingAttemptTotal ??
                                        item.trainingAttemptTotal;
                                      return attemptTotal != null && attemptTotal !== '' ? (
                                        <Badge className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-1 text-[11px] font-bold">
                                          {attemptTotal}
                                        </Badge>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      );
                                    })()}
                                  </TableCell>
                                )}
                              </>
                            )}
                            <TableCell className="px-4 py-3 text-xs text-slate-600 font-medium">
                              <div className="flex flex-col gap-1">
                                <span>
                                  {activeFilter === "screeningAssigned" 
                                    ? formatDate(candidateProjectMap?.assignedAt) 
                                    : activeFilter === "screeningScheduled" 
                                      ? (item.scheduledTime ? format(new Date(item.scheduledTime), "dd MMM yyyy, hh:mm a") : "—")
                                      : ["screeningTraining", "screeningPassed", "screeningRejected"].includes(activeFilter)
                                        ? item.overallRating != null ? (
                                            <Badge className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                                              item.overallRating >= 80 ? "bg-emerald-100 text-emerald-700" :
                                              item.overallRating >= 60 ? "bg-amber-100 text-amber-700" :
                                              "bg-rose-100 text-rose-700"
                                            }`}>
                                              {item.overallRating}/100
                                            </Badge>
                                          ) : (
                                            <span className="text-slate-400">—</span>
                                          )
                                        : formatDate(candidateProjectMap?.updatedAt)}
                                </span>
                                {activeFilter === "screeningScheduled" && item.isExpired && (
                                  <Badge variant="destructive" className="w-fit text-[9px] h-4 px-1 py-0 uppercase font-bold">
                                    Expired
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            {activeFilter !== "screeningAssigned" && (
                              <TableCell className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg px-3 transition-colors"
                                  onClick={() => {
                                    if (activeFilter === "shortlistPending") {
                                      setSelectedShortlisting(candidateProjectMap);
                                      setDecisionModalOpen(true);
                                    } else if ((activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected") && item.id) {
                                      navigate(`/screenings/${item.id}`);
                                    } else if (item.id) {
                                      setSelectedInterviewId(item.id);
                                      setEditDialogOpen(true);
                                    } else {
                                      navigate(`/interviews/list`);
                                    }
                                  }}
                                >
                                  {activeFilter === "shortlistPending" ? "Update Decision" : "View"}
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {candidates.length === 0 && (
                    <div className="text-center py-20">
                      <UserCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-600 mb-2">
                        No candidates found
                      </h3>
                      <p className="text-slate-500">Try selecting a different filter or search.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, meta.total)} of {meta.total} candidates
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientDecisionModal
        open={decisionModalOpen}
        onOpenChange={(open) => {
          setDecisionModalOpen(open);
          if (!open) setSelectedShortlisting(null);
        }}
        candidateName={
          selectedShortlisting?.candidate
            ? `${selectedShortlisting.candidate.firstName} ${selectedShortlisting.candidate.lastName}`
            : "Unknown Candidate"
        }
        onSubmit={(decision: any, reason: string) => handleClientDecision(decision, reason)}
      />

      <ScheduleInterviewDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => setScheduleDialogOpen(open)}
      />

      <EditInterviewDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        interviewId={selectedInterviewId}
      />

      <ProjectDetailsModal
        isOpen={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
        project={projectDetailData?.data}
      />
    </div>
  );
}
