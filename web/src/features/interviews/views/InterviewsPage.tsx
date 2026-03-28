import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
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
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { useCan } from "@/hooks/useCan";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import CompleteInterviewModal from "@/components/molecules/CompleteInterviewModal";
import ProjectDetailsModal from "@/components/molecules/ProjectDetailsModal";
import ProjectRoleFilter, { ProjectRoleFilterValue } from "@/components/molecules/ProjectRoleFilter";
import {
  useGetInterviewsQuery,
  useUpdateClientDecisionMutation,
  useUpdateBulkClientDecisionMutation,
  useUpdateBulkInterviewStatusMutation,
  useGetSummaryStatsQuery,
  useGetAssignedScreeningsQuery,
  useGetUpcomingScreeningsQuery,
  useGetShortlistPendingQuery,
  useGetShortlistedQuery,
  useGetNotShortlistedQuery,
  useCreateBulkInterviewsMutation,
} from "../api";
import { useGetScreeningsQuery } from "@/features/screening-coordination/interviews/data";
import { useGetProjectQuery } from "@/features/projects/api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ClientDecisionModal } from "../components/ClientDecisionModal";
import { BulkClientDecisionModal, CandidateDecision } from "../components/BulkClientDecisionModal";
import { BulkScheduleInterviewModal } from "../components/BulkScheduleInterviewModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
    key: "interviewCompleted",
    label: "Interview Completed",
    icon: ClipboardCheck,
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-50 to-emerald-100/50",
    iconBg: "bg-green-200/40",
    textColor: "text-green-600",
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
    key: "interviewBackout",
    label: "Interview Backout",
    icon: X,
    gradient: "from-rose-500 to-fuchsia-500",
    bgGradient: "from-rose-50 to-fuchsia-100/50",
    iconBg: "bg-rose-200/40",
    textColor: "text-rose-600",
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
  interview_completed: {
    textColor: "text-green-700",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
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
  interview_backout: {
    textColor: "text-rose-700",
    bgColor: "bg-rose-100",
    borderColor: "border-rose-300",
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

  const [projectRoleFilter, setProjectRoleFilter] = useState<ProjectRoleFilterValue>({
    projectId: "all",
    roleCatalogId: "all",
  });

  const projectId = projectRoleFilter.projectId === "all" ? undefined : projectRoleFilter.projectId;
  const roleCatalogId = projectRoleFilter.roleCatalogId === "all" ? undefined : projectRoleFilter.roleCatalogId;

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
    projectId,
    roleCatalogId,
    status: activeFilter === "interviewCompleted" ? "completed" : 
            activeFilter === "interviewPassed" ? "passed" : 
            activeFilter === "interviewRejected" ? "failed" : 
            activeFilter === "interviewBackout" ? "backout" : 
            activeFilter === "interviewScheduled" ? "scheduled" : undefined,
  }, { skip: !["interviewScheduled", "interviewCompleted", "interviewPassed", "interviewRejected", "interviewBackout"].includes(activeFilter) });

  const {
    data: shortlistPendingData,
    isLoading: isShortlistPendingLoading,
    isFetching: isShortlistPendingFetching,
    isError: isShortlistPendingError,
    refetch: refetchShortlistPending,
  } = useGetShortlistPendingQuery({
    page,
    limit,
    search: search || undefined,
    projectId,
    roleCatalogId,
  }, { skip: activeFilter !== "shortlistPending" });

  const {
    data: shortlistedData,
    isLoading: isShortlistedLoading,
    isFetching: isShortlistedFetching,
    isError: isShortlistedError,
    refetch: refetchShortlisted,
  } = useGetShortlistedQuery({
    page,
    limit,
    search: search || undefined,
    projectId,
    roleCatalogId,
  }, { skip: activeFilter !== "shortlisted" });

  const {
    data: notShortlistedData,
    isLoading: isNotShortlistedLoading,
    isFetching: isNotShortlistedFetching,
    isError: isNotShortlistedError,
    refetch: refetchNotShortlisted,
  } = useGetNotShortlistedQuery({
    page,
    limit,
    search: search || undefined,
    projectId,
    roleCatalogId,
  }, { skip: activeFilter !== "shortlistRejected" });

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
    projectId,
    roleCatalogId,
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
    projectId,
    roleCatalogId,
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
    decision: "needs_training",
    projectId,
    roleCatalogId,
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
    decision: "approved",
    projectId,
    roleCatalogId,
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
    decision: "rejected",
    projectId,
    roleCatalogId,
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
    decision: "on_hold",
    projectId,
    roleCatalogId,
  }, { skip: activeFilter !== "onHold" });

  const isLoading =
    isInterviewsLoading ||
    isShortlistPendingLoading ||
    isShortlistedLoading ||
    isNotShortlistedLoading ||
    isAssignedScreeningsLoading ||
    isUpcomingScreeningsLoading ||
    isScreeningTrainingLoading ||
    isScreeningPassedLoading ||
    isScreeningRejectedLoading ||
    isScreeningOnHoldLoading;

  const isFetching =
    isInterviewsFetching ||
    isShortlistPendingFetching ||
    isShortlistedFetching ||
    isNotShortlistedFetching ||
    isAssignedScreeningsFetching ||
    isUpcomingScreeningsFetching ||
    isScreeningTrainingFetching ||
    isScreeningPassedFetching ||
    isScreeningRejectedFetching ||
    isScreeningOnHoldFetching;

  const isError =
    isInterviewsError ||
    isShortlistPendingError ||
    isShortlistedError ||
    isNotShortlistedError ||
    isAssignedScreeningsError ||
    isUpcomingScreeningsError ||
    isScreeningTrainingError ||
    isScreeningPassedError ||
    isScreeningRejectedError ||
    isScreeningOnHoldError;

  const refetch = () => {
    refetchInterviews();
    refetchShortlistPending();
    refetchShortlisted();
    refetchNotShortlisted();
    refetchAssignedScreenings();
    refetchUpcomingScreenings();
    refetchScreeningTraining();
    refetchScreeningPassed();
    refetchScreeningRejected();
    refetchScreeningOnHold();
  };

  const refetchCurrent = () => {
    switch (activeFilter) {
      case "shortlistPending":
        refetchShortlistPending();
        break;
      case "shortlisted":
        refetchShortlisted();
        break;
      case "shortlistRejected":
        refetchNotShortlisted();
        break;
      case "screeningAssigned":
        refetchAssignedScreenings();
        break;
      case "screeningScheduled":
        refetchUpcomingScreenings();
        break;
      case "screeningTraining":
        refetchScreeningTraining();
        break;
      case "screeningPassed":
        refetchScreeningPassed();
        break;
      case "screeningRejected":
        refetchScreeningRejected();
        break;
      case "onHold":
        refetchScreeningOnHold();
        break;
      case "interviewBackout":
        refetchInterviews();
        break;
      default:
        refetchInterviews();
    }
  };

  const candidates = useMemo<any[]>(() => {
    if (activeFilter === "shortlistPending") {
      return (shortlistPendingData as any)?.data?.items ?? [];
    }
    if (activeFilter === "shortlisted") {
      return (shortlistedData as any)?.data?.items ?? [];
    }
    if (activeFilter === "shortlistRejected") {
      return (notShortlistedData as any)?.data?.items ?? [];
    }
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
  }, [
    activeFilter,
    interviewsData,
    shortlistPendingData,
    shortlistedData,
    notShortlistedData,
    assignedScreeningsData,
    upcomingScreeningsData,
    screeningTrainingData,
    screeningPassedData,
    screeningRejectedData,
    screeningOnHoldData,
  ]);

  const meta = useMemo(() => {
    if (activeFilter === "shortlistPending") {
      return (shortlistPendingData as any)?.data?.pagination;
    }
    if (activeFilter === "shortlisted") {
      return (shortlistedData as any)?.data?.pagination;
    }
    if (activeFilter === "shortlistRejected") {
      return (notShortlistedData as any)?.data?.pagination;
    }
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
  }, [
    activeFilter,
    interviewsData,
    shortlistPendingData,
    shortlistedData,
    notShortlistedData,
    assignedScreeningsData,
    upcomingScreeningsData,
    screeningTrainingData,
    screeningPassedData,
    screeningRejectedData,
    screeningOnHoldData,
  ]);

  const counts = useMemo(() => {
    const stats = summaryStatsData?.data;
    return {
      shortlistPending: stats?.shortlistPending ?? 0,
      shortlisted: stats?.shortlisted ?? 0,
      shortlistRejected: stats?.shortlistRejected ?? 0,
      interviewScheduled: stats?.interviewScheduled ?? 0,
      interviewPassed: stats?.interviewPassed ?? 0,
      interviewRejected: stats?.interviewRejected ?? 0,
      interviewBackout: stats?.interviewBackout ?? 0,
      screeningAssigned: stats?.screeningAssigned ?? 0,
      screeningScheduled: stats?.screeningScheduled ?? 0,
      screeningPassed: stats?.screeningPassed ?? 0,
      screeningRejected: stats?.screeningRejected ?? 0,
      onHold: stats?.onHold ?? 0,
      screeningTraining: stats?.screeningTraining ?? 0,
      interviewCompleted: stats?.interviewCompleted ?? 0,
      passRate: stats?.passRate ?? 0,
    };
  }, [summaryStatsData]);

  // Modals / Dialogs
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedShortlisting, setSelectedShortlisting] = useState<any | null>(null);
  const [updateClientDecision] = useUpdateClientDecisionMutation();

  const [bulkDecisionModalOpen, setBulkDecisionModalOpen] = useState(false);
  const [bulkScheduleModalOpen, setBulkScheduleModalOpen] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedReviewInterview, setSelectedReviewInterview] = useState<any | null>(null);
  const [updateBulkClientDecision, { isLoading: isBulkUpdating }] = useUpdateBulkClientDecisionMutation();
  const [updateBulkInterviewStatus, { isLoading: isReviewSubmitting }] = useUpdateBulkInterviewStatusMutation();
  const [createBulkInterviews, { isLoading: isBulkScheduling }] = useCreateBulkInterviewsMutation();

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCandidateProjectMapId, setSelectedCandidateProjectMapId] = useState<string | null>(null);
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
      refetchCurrent();
      setDecisionModalOpen(false);
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        err?.error?.message ||
        (typeof err === "string" ? err : undefined) ||
        "Failed to update decision";
      toast.error(errorMessage);
    }
  };

  const selectedCandidatesForBulk = useMemo(() => {
    return candidates
      .filter((item) => selectedBulkIds.includes(item.id))
      .map((item) => {
        const candidateProjectMap = item.candidateProjectMap || item;
        return {
          id: item.id,
          candidate: candidateProjectMap.candidate || item.candidate,
          roleNeeded: candidateProjectMap.roleNeeded || item.roleNeeded,
          project: candidateProjectMap.project || item.project,
        };
      });
  }, [candidates, selectedBulkIds]);

  const handleBulkClientDecision = async (decisions: CandidateDecision[]) => {
    if (decisions.length === 0) return;

    try {
      const res = await updateBulkClientDecision({ updates: decisions }).unwrap();
      const results = Array.isArray(res?.data) ? res.data : [];

      const shortlisted = results.filter((r: any) => r.success && r.data?.subStatus?.name === "shortlisted").length;
      const notShortlisted = results.filter((r: any) => r.success && r.data?.subStatus?.name === "not_shortlisted").length;
      const failed = results.filter((r: any) => !r.success).length;

      if (failed > 0) {
        toast.error(`Bulk update partial failure: ${shortlisted} shortlisted, ${notShortlisted} not shortlisted, ${failed} failed`);
      } else {
        toast.success(`Bulk update applied — ${shortlisted} shortlisted, ${notShortlisted} not shortlisted`);
      }

      setBulkDecisionModalOpen(false);
      setSelectedBulkIds([]);
      refetchCurrent();
      refetchStats();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        err?.error?.message ||
        (typeof err === "string" ? err : undefined) ||
        "Bulk update failed";
      toast.error(errorMessage);
    }
  };

  const handleBulkSchedule = async (schedules: { candidateProjectMapId: string; scheduledTime: Date; mode: string; meetingLink?: string; location?: string; notes?: string; }[]) => {
    if (schedules.length === 0) return;

    try {
      await createBulkInterviews(
        schedules.map((s) => ({
          candidateProjectMapId: s.candidateProjectMapId,
          scheduledTime: s.scheduledTime.toISOString(),
          mode: s.mode,
          meetingLink: s.meetingLink,
          location: s.location,
          notes: s.notes,
        }))
      ).unwrap();

      toast.success(`${schedules.length} Interviews scheduled successfully`);
      setBulkScheduleModalOpen(false);
      setSelectedBulkIds([]);
      refetch();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to schedule bulk interviews");
    }
  };

  const handleReviewSubmit = async (updates: { id: string; interviewStatus: any; subStatus?: string; reason?: string }[]) => {
    try {
      await updateBulkInterviewStatus({ updates }).unwrap();
      toast.success(`${updates.length} Interview(s) reviewed successfully`);
      setIsReviewModalOpen(false);
      setSelectedReviewInterview(null);
      refetchCurrent();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  useEffect(() => {
    if (activeFilter !== "shortlistPending") {
      setSelectedBulkIds([]);
      setBulkDecisionModalOpen(false);
    }
  }, [activeFilter]);

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
          <CardContent className="pt-4 pb-4 border-b border-gray-100">
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

            <div className="mb-4">
              <ProjectRoleFilter
                value={projectRoleFilter}
                onChange={(value) => {
                  setProjectRoleFilter(value);
                  setPage(1);
                }}
                className="max-w-[600px]"
              />
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
              {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected" || activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected") && selectedBulkIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">{selectedBulkIds.length} selected</span>

                  {activeFilter === "shortlistPending" && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white h-8"
                      onClick={() => setBulkDecisionModalOpen(true)}
                    >
                      Bulk Shortlist
                    </Button>
                  )}

                  {(activeFilter === "shortlisted" || activeFilter === "shortlistRejected") && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white h-8"
                      onClick={() => setBulkDecisionModalOpen(true)}
                    >
                      Bulk Client Decision
                    </Button>
                  )}

                  {activeFilter === "shortlisted" && (
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white h-8"
                      onClick={() => setBulkScheduleModalOpen(true)}
                    >
                      Bulk Schedule
                    </Button>
                  )}

                  {activeFilter === "interviewScheduled" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-8"
                      onClick={() => {
                        setSelectedReviewInterview(candidates.filter((item) => selectedBulkIds.includes(item.id)));
                        setIsCompleteModalOpen(true);
                      }}
                    >
                      Bulk Complete
                    </Button>
                  )}

                                  {activeFilter === "interviewCompleted" && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                      onClick={() => {
                        setSelectedReviewInterview(candidates.filter((item) => selectedBulkIds.includes(item.id)));
                        setIsReviewModalOpen(true);
                      }}
                    >
                      Bulk Review
                    </Button>
                  )}

                  {activeFilter === "interviewRejected" && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                      onClick={() => {
                        setSelectedReviewInterview(candidates.filter((item) => selectedBulkIds.includes(item.id)));
                        setIsReviewModalOpen(true);
                      }}
                    >
                      Bulk Review
                    </Button>
                  )}

                  {activeFilter === "interviewPassed" && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                      onClick={() => {
                        setSelectedReviewInterview(candidates.filter((item) => selectedBulkIds.includes(item.id)));
                        setIsReviewModalOpen(true);
                      }}
                    >
                      Bulk Review
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setSelectedBulkIds([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
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
                        {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected" || activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected") && (
                          <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">
                            <Checkbox
                              id="select-all-candidates"
                              checked={candidates.length > 0 && candidates.every((it) => selectedBulkIds.includes(it.id))}
                              onCheckedChange={(value) => {
                                if (value) {
                                  setSelectedBulkIds(candidates.map((it) => it.id));
                                } else {
                                  setSelectedBulkIds([]);
                                }
                              }}
                            />
                          </TableHead>
                        )}
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Candidate</TableHead>
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Current Stage</TableHead>
                        <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Project / Role</TableHead>
                        {(activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected") && (
                          <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Mode</TableHead>
                        )}
                        {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected" || activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected" || activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                          <>
                            <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Recruiter</TableHead>
                            {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected") && (
                              <>
                                <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Sent to Client</TableHead>
                                <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Screening Details</TableHead>
                                {activeFilter === "shortlistRejected" && (
                                  <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Rejection Reason</TableHead>
                                )}
                              </>
                            )}
                            {(activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                              <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Trainer</TableHead>
                            )}
                            {(activeFilter !== "screeningAssigned" && activeFilter !== "interviewScheduled" && activeFilter !== "interviewCompleted" && activeFilter !== "interviewPassed" && activeFilter !== "interviewBackout" && activeFilter !== "interviewRejected" && activeFilter !== "shortlistPending" && activeFilter !== "shortlisted" && activeFilter !== "shortlistRejected") && (
                              <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">Attempts</TableHead>
                            )}
                          </>
                        )}
                        {(!["shortlistPending", "shortlisted", "shortlistRejected"].includes(activeFilter)) && (
                          <TableHead className="h-10 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-gray-600">
                            {activeFilter === "screeningAssigned"
                              ? "Assigned At"
                              : activeFilter === "screeningScheduled" || activeFilter === "interviewScheduled"
                              ? "Scheduled Time"
                              : activeFilter === "interviewPassed"
                              ? "Passed At"
                              : activeFilter === "interviewCompleted" || activeFilter === "interviewRejected"
                              ? "Completed At"
                              : activeFilter === "interviewBackout"
                              ? "Backout At"
                              : ["screeningTraining", "screeningPassed", "screeningRejected"].includes(activeFilter)
                              ? "Overall Rating"
                              : "Updated At"}
                          </TableHead>
                        )}
                        {(["shortlistPending", "shortlisted", "shortlistRejected", "interviewScheduled", "interviewRejected"].includes(activeFilter) || !["screeningAssigned", "shortlistPending", "shortlisted", "shortlistRejected"].includes(activeFilter)) && (
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
                            : activeFilter === "interviewCompleted"
                            ? "interview_completed"
                            : activeFilter === "interviewPassed"
                            ? "interview_passed"
                            : activeFilter === "interviewRejected"
                            ? "rejected_interview"
                            : activeFilter === "interviewBackout"
                            ? "interview_backout"
                            : subStatus?.name || "";
                        const badgeStyle =
                          STATUS_BADGE[statusKey] || { textColor: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-300" };
                        const stageLabel =
                          activeFilter === "screeningRejected"
                            ? "Screening Rejected"
                            : activeFilter === "onHold"
                            ? "On Hold"
                            : activeFilter === "interviewCompleted"
                            ? "Interview Completed"
                            : activeFilter === "interviewPassed"
                            ? "Interview Passed"
                            : activeFilter === "interviewRejected"
                            ? "Interview Rejected"
                            : activeFilter === "interviewBackout"
                            ? "Interview Backout"
                            : subStatus?.label || "Scheduled";
                        const candidate = candidateProjectMap?.candidate || item.candidate;

                        return (
                          <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-gray-100 last:border-0 group">
                            {["shortlistPending", "shortlisted", "shortlistRejected", "interviewScheduled", "interviewCompleted", "interviewPassed", "interviewBackout", "interviewRejected"].includes(activeFilter) && (
                              <TableCell className="px-4 py-3">
                                <Checkbox
                                  checked={selectedBulkIds.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedBulkIds((prev) => [...prev, item.id]);
                                    } else {
                                      setSelectedBulkIds((prev) => prev.filter((id) => id !== item.id));
                                    }
                                  }}
                                />
                              </TableCell>
                            )}
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
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="outline"
                                  className={`${badgeStyle.bgColor} ${badgeStyle.textColor} ${badgeStyle.borderColor} border px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold shadow-sm inline-flex items-center rounded-md`}
                                >
                                  {stageLabel}
                                </Badge>
                                {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected") && candidateProjectMap.screening && (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] px-2 py-0.5 mt-1 font-bold rounded-md w-fit">
                                    Screened
                                  </Badge>
                                )}
                              </div>
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
                                  {(candidateProjectMap?.project?.id || candidateProjectMap?.projectId) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProjectId(candidateProjectMap.project?.id || candidateProjectMap.projectId);
                                      }}
                                      className="p-1 hover:bg-blue-50 rounded-md transition-all flex-shrink-0"
                                      title="View Project Details"
                                    >
                                      <Eye className="h-4 w-4 text-blue-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                        {(activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected") && (
                              <TableCell className="px-4 py-3 text-[11px] text-slate-700 font-medium">
                                <div>
                                  {item.mode ? item.mode.replace("-", " ") : "—"}
                                </div>
                                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                                  {item.mode === "in-person" ? (
                                    <p>Location: {item.location ?? "—"}</p>
                                  ) : (
                                    <p>
                                      Meeting link:{" "}
                                      {item.meetingLink ? (
                                        <button
                                          type="button"
                                          onClick={() => window.open(item.meetingLink, "_blank")}
                                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                          title="Open meeting link"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                          <span className="text-xs">Open</span>
                                        </button>
                                      ) : "—"}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected" || activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected" || activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                              <>
                                <TableCell className="px-4 py-3 text-[11px] font-medium text-slate-700">
                                  {(item.recruiter?.name || candidateProjectMap?.recruiter?.name || item.candidateProjectMap?.recruiter?.name) ? (
                                    item.recruiter?.name || candidateProjectMap?.recruiter?.name || item.candidateProjectMap?.recruiter?.name
                                  ) : "—"}
                                </TableCell>
                                {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected") && (
                                  <TableCell className="px-4 py-3">
                                    <div className="flex flex-col gap-0.5">
                                      <p className="text-[11px] font-bold text-slate-700">
                                        {candidateProjectMap?.latestForward?.sender?.name || "—"}
                                      </p>
                                      {candidateProjectMap?.latestForward?.sentAt && (
                                        <p className="text-[10px] text-slate-500">
                                          {format(new Date(candidateProjectMap.latestForward.sentAt), "dd MMM yyyy, hh:mm a")}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                                {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected") && (
                                  <>
                                    <TableCell className="px-4 py-3">
                                      <div className="flex flex-col gap-1">
                                        {(candidateProjectMap?.screening || item.candidateProjectMap?.screening) ? (
                                          <>
                                            <div className="flex items-center gap-1.5">
                                              {(candidateProjectMap?.screening?.coordinator?.name || item.candidateProjectMap?.screening?.coordinator?.name) && (
                                                <span className="text-[11px] font-bold text-slate-700">
                                                  {candidateProjectMap?.screening?.coordinator?.name || item.candidateProjectMap?.screening?.coordinator?.name}
                                                </span>
                                              )}
                                              <div className="flex items-center gap-1">
                                                {(candidateProjectMap?.screening?.decision || item.candidateProjectMap?.screening?.decision) && (
                                                  <Badge
                                                    variant="outline"
                                                    className={cn(
                                                      "text-[9px] px-1 h-3.5 uppercase font-bold",
                                                      (candidateProjectMap?.screening?.decision || item.candidateProjectMap?.screening?.decision) === "approved"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : (candidateProjectMap?.screening?.decision || item.candidateProjectMap?.screening?.decision) === "rejected"
                                                        ? "bg-rose-50 text-rose-700 border-rose-100"
                                                        : "bg-amber-50 text-amber-700 border-amber-100"
                                                    )}
                                                  >
                                                    {candidateProjectMap?.screening?.decision || item.candidateProjectMap?.screening?.decision}
                                                  </Badge>
                                                )}
                                                {(candidateProjectMap?.screening?.overallRating != null || item.candidateProjectMap?.screening?.overallRating != null) && (
                                                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] px-1 h-3.5 font-bold">
                                                    {(candidateProjectMap?.screening?.overallRating ?? item.candidateProjectMap?.screening?.overallRating)}%
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            {(candidateProjectMap?.screening?.passedAt || item.candidateProjectMap?.screening?.passedAt) && (
                                              <p className="text-[10px] text-slate-500">
                                                {format(new Date(candidateProjectMap?.screening?.passedAt || item.candidateProjectMap?.screening?.passedAt), "dd MMM yyyy")}
                                              </p>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-slate-400 text-[11px]">No Screening</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    {activeFilter === "shortlistRejected" && (
                                      <TableCell className="px-4 py-3">
                                        <p className="text-[11px] text-slate-700 truncate">
                                          {candidateProjectMap?.notShortlistedReason || '—'}
                                        </p>
                                      </TableCell>
                                    )}
                                  </>
                                )}
                                {(activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                                  <TableCell className="px-4 py-3 text-[11px] font-medium text-slate-700">
                                    {activeFilter === "screeningAssigned"
                                      ? item.trainer?.name || item.trainer?.id || "—"
                                      : ((activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "screeningScheduled" || activeFilter === "onHold")
                                        ? item.coordinator?.name || item.coordinatorId
                                        : item.trainingAssignments?.[0]?.trainer?.name || item.trainingAssignments?.[0]?.trainerId || "—")}
                                  </TableCell>
                                )}
                                {(activeFilter !== "screeningAssigned" && activeFilter !== "interviewScheduled" && activeFilter !== "interviewCompleted" && activeFilter !== "interviewPassed" && activeFilter !== "interviewBackout" && activeFilter !== "interviewRejected" && activeFilter !== "shortlistPending" && activeFilter !== "shortlisted" && activeFilter !== "shortlistRejected") && (
                                  <TableCell className="px-4 py-3 text-[11px] font-medium text-slate-700">
                                    {(() => {
                                      const attemptTotal =
                                        item.trainingAssignments?.[0]?.trainingAttemptTotal ||
                                        item.trainingAttemptTotal;
                                      return attemptTotal != null && attemptTotal !== "" ? (
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
                            {(!["shortlistPending", "shortlisted", "shortlistRejected"].includes(activeFilter)) && (
                              <TableCell className="px-4 py-3 text-xs text-slate-600 font-medium">
                                <div className="flex flex-col gap-1">
                                  <span>
                                    {activeFilter === "screeningAssigned"
                                      ? formatDate(candidateProjectMap?.assignedAt)
                                      : activeFilter === "interviewBackout"
                                        ? (item.updatedAt ? format(new Date(item.updatedAt), "dd MMM yyyy, hh:mm a") : "—")
                                      : activeFilter === "interviewPassed"
                                        ? (item.updatedAt ? format(new Date(item.updatedAt), "dd MMM yyyy, hh:mm a") : "—")
                                      : activeFilter === "interviewCompleted" || activeFilter === "interviewRejected"
                                        ? (item.completedAt ? format(new Date(item.completedAt), "dd MMM yyyy, hh:mm a") : (item.updatedAt ? format(new Date(item.updatedAt), "dd MMM yyyy, hh:mm a") : "—"))
                                        : activeFilter === "screeningScheduled" || activeFilter === "interviewScheduled"
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
                            )}
                            {["shortlistPending", "shortlisted", "shortlistRejected"].includes(activeFilter) && (
                              <TableCell className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {activeFilter !== "shortlistRejected" && (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700"
                                      onClick={() => {
                                        setSelectedCandidateProjectMapId(candidateProjectMap?.id || item.id);
                                        setScheduleDialogOpen(true);
                                      }}
                                      title="Schedule Interview"
                                    >
                                      <Calendar className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                    onClick={() => {
                                      setSelectedShortlisting(item);
                                      setDecisionModalOpen(true);
                                    }}
                                    title="Update Client Decision"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                            {!['screeningAssigned', 'shortlistPending', 'shortlisted', 'shortlistRejected'].includes(activeFilter) && (
                              <TableCell className="px-4 py-3 text-right">
                                {activeFilter === "interviewScheduled" ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700"
                                      onClick={() => {
                                        if (item.id) {
                                          navigate(`/interviews/${item.id}`);
                                        }
                                      }}
                                      title="View Interview"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                      onClick={() => {
                                        setSelectedReviewInterview(item);
                                        setIsCompleteModalOpen(true);
                                      }}
                                      title="Complete Interview"
                                    >
                                      <ClipboardCheck className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected" ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700"
                                      onClick={() => {
                                        if (item.id) {
                                          navigate(`/interviews/${item.id}`);
                                        }
                                      }}
                                      title="View Interview"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700"
                                      onClick={() => {
                                        setSelectedReviewInterview(item);
                                        setIsReviewModalOpen(true);
                                      }}
                                      title="Review Interview"
                                    >
                                      <UserCheck className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg px-3 transition-colors"
                                    onClick={() => {
                                      if ((activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected") && item.id) {
                                        navigate(`/screenings/${item.id}`);
                                      } else if (item.id) {
                                        setSelectedInterviewId(item.id);
                                        setEditDialogOpen(true);
                                      } else {
                                        navigate(`/interviews/list`);
                                      }
                                    }}
                                  >
                                    View
                                  </Button>
                                )}
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

      <BulkClientDecisionModal
        open={bulkDecisionModalOpen}
        onOpenChange={setBulkDecisionModalOpen}
        selectedCandidates={selectedCandidatesForBulk}
        onSubmit={handleBulkClientDecision}
        isSubmitting={isBulkUpdating}
      />

      <BulkScheduleInterviewModal
        open={bulkScheduleModalOpen}
        onOpenChange={setBulkScheduleModalOpen}
        selectedCandidates={selectedCandidatesForBulk}
        onSubmit={handleBulkSchedule}
        isSubmitting={isBulkScheduling}
      />

      <ReviewInterviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedReviewInterview(null);
        }}
        interview={selectedReviewInterview ? (Array.isArray(selectedReviewInterview) ? selectedReviewInterview : [selectedReviewInterview]) : []}
        onSubmit={handleReviewSubmit}
      />

      <CompleteInterviewModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedReviewInterview(null);
        }}
        interview={selectedReviewInterview ? (Array.isArray(selectedReviewInterview) ? selectedReviewInterview : [selectedReviewInterview]) : []}
        onSubmit={handleReviewSubmit}
      />

      <ScheduleInterviewDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedCandidateProjectMapId(null);
          setScheduleDialogOpen(open);
        }}
        initialCandidateProjectMapId={selectedCandidateProjectMapId ?? undefined}
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
