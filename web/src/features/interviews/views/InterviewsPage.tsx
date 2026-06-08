import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Phone,
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
  Upload,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { useCan, useHasRole } from "@/hooks/useCan";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import CompleteInterviewModal from "@/components/molecules/CompleteInterviewModal";
import ProjectDetailsModal from "@/components/molecules/ProjectDetailsModal";
import ProjectRoleFilter, { ProjectRoleFilterValue } from "@/components/molecules/ProjectRoleFilter";
import {
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import { OfferLetterBadge } from "../components/OfferLetterBadge";
import {
  getOfferLetterOverrideKey,
  getOfferLetterUploaderName,
  getOfferLetterUrlFromUpload,
  hasOfferLetter,
  resolveOfferLetterFileUrl,
} from "../utils/offerLetter";
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
  useSendForProcessingMutation,
  useSendBulkForProcessingMutation,
} from "../api";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import {
  SendForProcessingModal,
  type SendForProcessingCandidate,
} from "../components/SendForProcessingModal";
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
import { FaWhatsapp } from "react-icons/fa";

type TileDef = {
  key: string;
  label: string;
  icon: React.ElementType;
  accent: string;
};

const TILES: TileDef[] = [
  {
    key: "shortlistPending",
    label: "Shortlist Pending",
    icon: Mail,
    accent: "orange",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    icon: CheckCircle2,
    accent: "teal",
  },
  {
    key: "shortlistRejected",
    label: "Shortlist Rejected",
    icon: X,
    accent: "rose",
  },
  {
    key: "interviewScheduled",
    label: "Interview Scheduled",
    icon: Calendar,
    accent: "blue",
  },
  {
    key: "interviewCompleted",
    label: "Interview Completed",
    icon: ClipboardCheck,
    accent: "emerald",
  },
  {
    key: "interviewPassed",
    label: "Interview Passed",
    icon: CheckCircle,
    accent: "green",
  },
  {
    key: "interviewRejected",
    label: "Interview Rejected",
    icon: AlertTriangle,
    accent: "red",
  },
  {
    key: "interviewBackout",
    label: "Interview Backout",
    icon: X,
    accent: "fuchsia",
  },
  {
    key: "screeningAssigned",
    label: "Screening Assigned",
    icon: Send,
    accent: "indigo",
  },
  {
    key: "screeningScheduled",
    label: "Screening Scheduled",
    icon: ClipboardCheck,
    accent: "purple",
  },
  {
    key: "screeningTraining",
    label: "Screening Training",
    icon: Users,
    accent: "pink",
  },
  {
    key: "screeningPassed",
    label: "Screening Passed",
    icon: CheckCircle2,
    accent: "cyan",
  },
  {
    key: "screeningRejected",
    label: "Screening Rejected",
    icon: X,
    accent: "rose",
  },
  {
    key: "onHold",
    label: "Screening On Hold",
    icon: Settings,
    accent: "slate",
  },
];

const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
  orange: { card: "from-amber-50 via-white to-amber-50/30 border-amber-100", icon: "text-amber-600", iconBg: "bg-amber-100", value: "text-amber-700", ring: "ring-amber-400/50", dot: "bg-amber-500" },
  teal: { card: "from-teal-50 via-white to-teal-50/30 border-teal-100", icon: "text-teal-600", iconBg: "bg-teal-100", value: "text-teal-700", ring: "ring-teal-400/50", dot: "bg-teal-500" },
  rose: { card: "from-rose-50 via-white to-rose-50/30 border-rose-100", icon: "text-rose-600", iconBg: "bg-rose-100", value: "text-rose-700", ring: "ring-rose-400/50", dot: "bg-rose-500" },
  blue: { card: "from-blue-50 via-white to-blue-50/30 border-blue-100", icon: "text-blue-600", iconBg: "bg-blue-100", value: "text-blue-700", ring: "ring-blue-400/50", dot: "bg-blue-500" },
  emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
  green: { card: "from-green-50 via-white to-green-50/30 border-green-100", icon: "text-green-600", iconBg: "bg-green-100", value: "text-green-700", ring: "ring-green-400/50", dot: "bg-green-500" },
  red: { card: "from-red-50 via-white to-red-50/30 border-red-100", icon: "text-red-600", iconBg: "bg-red-100", value: "text-red-700", ring: "ring-red-400/50", dot: "bg-red-500" },
  fuchsia: { card: "from-fuchsia-50 via-white to-fuchsia-50/30 border-fuchsia-100", icon: "text-fuchsia-600", iconBg: "bg-fuchsia-100", value: "text-fuchsia-700", ring: "ring-fuchsia-400/50", dot: "bg-fuchsia-500" },
  indigo: { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100", icon: "text-indigo-600", iconBg: "bg-indigo-100", value: "text-indigo-700", ring: "ring-indigo-400/50", dot: "bg-indigo-500" },
  purple: { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600", iconBg: "bg-purple-100", value: "text-purple-700", ring: "ring-purple-400/50", dot: "bg-purple-500" },
  pink: { card: "from-pink-50 via-white to-pink-50/30 border-pink-100", icon: "text-pink-600", iconBg: "bg-pink-100", value: "text-pink-700", ring: "ring-pink-400/50", dot: "bg-pink-500" },
  cyan: { card: "from-cyan-50 via-white to-cyan-50/30 border-cyan-100", icon: "text-cyan-600", iconBg: "bg-cyan-100", value: "text-cyan-700", ring: "ring-cyan-400/50", dot: "bg-cyan-500" },
  slate: { card: "from-slate-50 via-white to-slate-50/30 border-slate-100", icon: "text-slate-600", iconBg: "bg-slate-100", value: "text-slate-700", ring: "ring-slate-400/50", dot: "bg-slate-500" },
};

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

function formatPhoneForLink(candidate: {
  countryCode?: string | null;
  mobileNumber?: string | null;
  mobile?: string | null;
  contact?: string | null;
}) {
  const raw =
    String(candidate?.countryCode ?? "") +
    String(candidate?.mobileNumber ?? candidate?.mobile ?? candidate?.contact ?? "");
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

export default function InterviewsPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const isInterviewCoordinator = useHasRole("Interview Coordinator");
  const isRecruiter = useHasRole("Recruiter");
  const canUploadOfferLetterOnPassedInterview =
    isInterviewCoordinator || isRecruiter;

  // Basic search & filter states
  const [activeFilter, setActiveFilter] = useState("shortlistPending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);
  const limit = 10;

  const [projectRoleFilter, setProjectRoleFilter] = useState<ProjectRoleFilterValue>({
    projectId: "all",
    roleCatalogId: "all",
  });

  const projectId = projectRoleFilter.projectId === "all" ? undefined : projectRoleFilter.projectId;

  const handleTileClick = (filterKey: string) => {
    setActiveFilter(filterKey);
    setPage(1);
    window.requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
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

  const safeRefetch = (fn: () => void) => {
    try {
      fn();
    } catch (err: any) {
      if (!(err?.message?.includes("Cannot refetch a query that has not been started yet") || err?.message?.includes("started yet"))) {
        console.error("Unexpected refetch error", err);
      }
    }
  };

  const refetch = () => {
    safeRefetch(refetchInterviews);
    safeRefetch(refetchShortlistPending);
    safeRefetch(refetchShortlisted);
    safeRefetch(refetchNotShortlisted);
    safeRefetch(refetchAssignedScreenings);
    safeRefetch(refetchUpcomingScreenings);
    safeRefetch(refetchScreeningTraining);
    safeRefetch(refetchScreeningPassed);
    safeRefetch(refetchScreeningRejected);
    safeRefetch(refetchScreeningOnHold);
  };

  const refetchCurrent = () => {
    switch (activeFilter) {
      case "shortlistPending":
        safeRefetch(refetchShortlistPending);
        break;
      case "shortlisted":
        safeRefetch(refetchShortlisted);
        break;
      case "shortlistRejected":
        safeRefetch(refetchNotShortlisted);
        break;
      case "screeningAssigned":
        safeRefetch(refetchAssignedScreenings);
        break;
      case "screeningScheduled":
        safeRefetch(refetchUpcomingScreenings);
        break;
      case "screeningTraining":
        safeRefetch(refetchScreeningTraining);
        break;
      case "screeningPassed":
        safeRefetch(refetchScreeningPassed);
        break;
      case "screeningRejected":
        safeRefetch(refetchScreeningRejected);
        break;
      case "onHold":
        safeRefetch(refetchScreeningOnHold);
        break;
      case "interviewBackout":
        safeRefetch(refetchInterviews);
        break;
      default:
        safeRefetch(refetchInterviews);
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

  useEffect(() => {
    if (activeFilter !== "interviewPassed") return;

    setOfferLetterOverrides((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const item of candidates) {
        const serverUrl = item.offerLetterData?.document?.fileUrl;
        if (!serverUrl) continue;

        const key = getOfferLetterOverrideKey(item);
        if (next[key] !== serverUrl) {
          next[key] = serverUrl;
          changed = true;
        }

        const legacyCandidateId =
          item.candidateProjectMap?.candidate?.id || item.candidate?.id;
        if (legacyCandidateId && next[legacyCandidateId] !== serverUrl) {
          delete next[legacyCandidateId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [activeFilter, candidates]);

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

  const [offerLetterModal, setOfferLetterModal] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    projectId: string;
    projectTitle: string;
    roleCatalogId: string;
    roleDesignation: string;
    existingFileUrl?: string;
    isAlreadyUploaded?: boolean;
  } | null>(null);
  const [offerLetterOverrides, setOfferLetterOverrides] = useState<Record<string, string>>({});

  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({ isOpen: false, fileUrl: "", fileName: "" });

  const [sendForProcessing, { isLoading: isSendingForProcessing }] = useSendForProcessingMutation();
  const [sendBulkForProcessing, { isLoading: isBulkSendingForProcessing }] = useSendBulkForProcessingMutation();
  const [sendForProcessingModal, setSendForProcessingModal] = useState<{
    mode: "single" | "bulk";
    candidates: SendForProcessingCandidate[];
  } | null>(null);

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
      const errorMessage =
        err?.data?.message ||
        err?.error ||
        err?.message ||
        (typeof err === "string" ? err : undefined) ||
        "Failed to schedule bulk interviews";
      toast.error(errorMessage);
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

  const openOfferLetterModal = (item: any) => {
    const candidateProjectMap = item.candidateProjectMap || item;
    const candidate = candidateProjectMap?.candidate || item.candidate;
    const project = candidateProjectMap?.project || item.project;
    const roleCatalogId =
      candidateProjectMap?.roleNeeded?.roleCatalog?.id ||
      candidateProjectMap?.roleNeeded?.roleCatalogId;
    const candidateId = candidate?.id;
    const projectId = project?.id || item.projectId;

    if (!candidateId || !projectId || !roleCatalogId) {
      toast.error("Missing project or role information for offer letter upload");
      return;
    }

    const existingFileUrl = resolveOfferLetterFileUrl(item, offerLetterOverrides);

    setOfferLetterModal({
      isOpen: true,
      candidateId,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      projectId,
      projectTitle: project.title || "Project",
      roleCatalogId,
      roleDesignation: candidateProjectMap?.roleNeeded?.designation || "Role",
      existingFileUrl,
      isAlreadyUploaded: isRecruiter
        ? false
        : hasOfferLetter(item, offerLetterOverrides),
    });
  };

  const toSendForProcessingCandidate = (item: any): SendForProcessingCandidate => {
    const candidateProjectMap = item.candidateProjectMap || item;
    const candidate = candidateProjectMap?.candidate || item.candidate;
    const project = candidateProjectMap?.project || item.project;
    const roleCatalogId =
      candidateProjectMap?.roleNeeded?.roleCatalog?.id ||
      candidateProjectMap?.roleNeeded?.roleCatalogId ||
      "";
    return {
      interviewId: item.id,
      candidateId: candidate?.id || "",
      candidateName: candidate
        ? `${candidate.firstName} ${candidate.lastName}`
        : "Unknown Candidate",
      projectId: project?.id || item.projectId || "",
      projectTitle: project?.title || "Unknown Project",
      roleCatalogId,
      roleDesignation: candidateProjectMap?.roleNeeded?.designation || "Role",
      recruiterName:
        item.recruiter?.name ||
        candidateProjectMap?.recruiter?.name ||
        item.candidateProjectMap?.recruiter?.name ||
        null,
      hasOfferLetter: hasOfferLetter(item, offerLetterOverrides),
      offerLetterUploadedBy: getOfferLetterUploaderName(item),
      existingFileUrl: resolveOfferLetterFileUrl(item, offerLetterOverrides),
    };
  };

  const openSendForProcessingModal = (item: any) => {
    setSendForProcessingModal({
      mode: "single",
      candidates: [toSendForProcessingCandidate(item)],
    });
  };

  const openBulkSendForProcessingModal = () => {
    const unsent = candidates.filter(
      (item) => selectedBulkIds.includes(item.id) && !item.readyForProcessingAt
    );

    if (unsent.length === 0) {
      toast.error("No unsent interviews selected");
      return;
    }

    setSendForProcessingModal({
      mode: "bulk",
      candidates: unsent.map(toSendForProcessingCandidate),
    });
  };

  const handleConfirmSendForProcessing = async () => {
    if (!sendForProcessingModal) return;

    const interviewIds = sendForProcessingModal.candidates.map((c) => c.interviewId);

    try {
      if (sendForProcessingModal.mode === "single") {
        await sendForProcessing(interviewIds[0]).unwrap();
        toast.success("Candidate sent for processing");
      } else {
        const res = await sendBulkForProcessing({ interviewIds }).unwrap();
        const results = res?.data ?? [];
        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        if (failed > 0) {
          toast.error(`Sent ${succeeded}, failed ${failed}`);
        } else {
          toast.success(`${succeeded} candidate(s) sent for processing`);
        }
        setSelectedBulkIds([]);
      }

      setSendForProcessingModal(null);
      refetchCurrent();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send for processing");
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
        <DashboardWelcomeHeader
          userName={user?.name || "Recruiter"}
          subtitle="Orchestrate every panel with clarity and track candidate progress"
        />

        {/* ── Status Tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            const isActive = activeFilter === tile.key;
            const countValue = counts[tile.key as keyof typeof counts];
            const s = accentStyles[tile.accent];

            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => handleTileClick(tile.key)}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive
                    ? `ring-2 shadow-md ${s.ring}`
                    : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tile.label}</p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{countValue}</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <Icon className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Candidates Table ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 sm:px-6 py-4">
            <div className="flex flex-col gap-3 lg:gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                <div className="relative min-w-0 flex-1 w-full group">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search candidates by name, project, or role..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 w-full pl-10 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-blue-500/10 rounded-xl transition-all"
                  />
                </div>

                <div className="w-full min-w-0 lg:w-auto lg:min-w-[280px] lg:max-w-[420px] [&_button]:h-11 [&_button]:rounded-xl">
                  <ProjectRoleFilter
                    value={projectRoleFilter}
                    onChange={(value) => {
                      setProjectRoleFilter(value);
                      setPage(1);
                    }}
                    className="w-full gap-2"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-11 shrink-0 items-center gap-1.5 pr-1">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </span>
                </div>
                {["all", "today", "this_week", "this_month"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDateRange(preset);
                      setPage(1);
                    }}
                    className={cn(
                      "h-9 shrink-0 px-3 text-xs font-medium rounded-full border transition-all",
                      dateRange === preset
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1).replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Calendar className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{getActiveTileLabel()}</h2>
                  <p className="text-xs text-slate-500">
                    {meta?.total ?? 0} candidate{(meta?.total ?? 0) !== 1 ? "s" : ""} found
                  </p>
                </div>
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
                    <>
                      {isInterviewCoordinator && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          disabled={isBulkSendingForProcessing}
                          onClick={openBulkSendForProcessingModal}
                        >
                          Send for Processing
                        </Button>
                      )}
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
                    </>
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
          </div>

          <div className="p-0">
            <div ref={tableRef} className="overflow-hidden">
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
                      <TableRow className="bg-slate-50/80 border-b border-gray-200">
                        {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected" || activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected") && (
                          <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                        <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Candidate</TableHead>
                        <TableHead className="h-10 min-w-[10rem] whitespace-normal px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Contact</TableHead>
                        <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Stage</TableHead>
                        <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Project / Role</TableHead>
                        {(activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected") && (
                          <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Mode</TableHead>
                        )}
                        {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected" || activeFilter === "interviewScheduled" || activeFilter === "interviewCompleted" || activeFilter === "interviewPassed" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected" || activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                          <>
                            <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Recruiter</TableHead>
                            {(activeFilter === "shortlistPending" || activeFilter === "shortlisted" || activeFilter === "shortlistRejected") && (
                              <>
                                <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Sent to Client</TableHead>
                                <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Screening Details</TableHead>
                                {activeFilter === "shortlisted" && (
                                  <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Reason</TableHead>
                                )}
                                {activeFilter === "shortlistRejected" && (
                                  <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Rejection Reason</TableHead>
                                )}
                              </>
                            )}
                            {(activeFilter === "screeningAssigned" || activeFilter === "screeningScheduled" || activeFilter === "screeningTraining" || activeFilter === "screeningPassed" || activeFilter === "screeningRejected" || activeFilter === "onHold") && (
                              <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Trainer</TableHead>
                            )}
                            {(activeFilter !== "screeningAssigned" && activeFilter !== "interviewScheduled" && activeFilter !== "interviewCompleted" && activeFilter !== "interviewPassed" && activeFilter !== "interviewBackout" && activeFilter !== "interviewRejected" && activeFilter !== "shortlistPending" && activeFilter !== "shortlisted" && activeFilter !== "shortlistRejected") && (
                              <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Attempts</TableHead>
                            )}
                          </>
                        )}
                        {(!["shortlistPending", "shortlisted", "shortlistRejected"].includes(activeFilter)) && (
                          <TableHead className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                        const rejectionReason =
                          candidateProjectMap?.notShortlistedReason ||
                          candidateProjectMap?.projectStatusHistory?.[0]?.reason ||
                          candidateProjectMap?.projectStatusHistory?.[0]?.notes ||
                          '—';

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
                                  {[
                                    "interviewScheduled",
                                    "interviewCompleted",
                                    "interviewPassed",
                                    "interviewRejected",
                                    "interviewBackout",
                                  ].includes(activeFilter) ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (item.id) {
                                          navigate(`/interviews/detail/${item.id}`);
                                        }
                                      }}
                                      className="text-sm font-bold text-slate-900 truncate text-left transition-colors hover:text-blue-600"
                                    >
                                      {candidate?.firstName} {candidate?.lastName}
                                    </button>
                                  ) : (
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                      {candidate?.firstName} {candidate?.lastName}
                                    </p>
                                  )}
                                  {candidate?.candidateCode ? (
                                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                                      {candidate.candidateCode}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[10rem] whitespace-normal px-4 py-3 text-center">
                              <div className="flex flex-col items-stretch gap-2">
                                <div className="flex items-center justify-center gap-1.5 w-full">
                                  {(() => {
                                    const phoneDigits = formatPhoneForLink(candidate ?? {});
                                    return (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 shadow-sm border border-green-100/50"
                                          onClick={() =>
                                            phoneDigits &&
                                            window.open(`https://wa.me/${phoneDigits}`, "_blank")
                                          }
                                          disabled={!phoneDigits}
                                          title={`WhatsApp ${candidate?.firstName ?? ""}`}
                                          aria-label={`WhatsApp ${candidate?.firstName ?? "candidate"}`}
                                        >
                                          <FaWhatsapp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 rounded-full text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm border border-blue-100/50"
                                          onClick={() =>
                                            phoneDigits && (window.location.href = `tel:${phoneDigits}`)
                                          }
                                          disabled={!phoneDigits}
                                          title={`Call ${candidate?.firstName ?? ""}`}
                                          aria-label={`Call ${candidate?.firstName ?? "candidate"}`}
                                        >
                                          <Phone className="h-4 w-4" />
                                        </Button>
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className="w-full min-w-0 text-center text-xs text-slate-500 space-y-1">
                                  {candidate?.email ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Mail className="h-3 w-3 shrink-0 text-gray-400" />
                                      <span className="break-all text-gray-700">
                                        {candidate.email}
                                      </span>
                                    </div>
                                  ) : null}
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                                    <span className="text-gray-700">
                                      {candidate?.countryCode ? `${candidate.countryCode} ` : ""}
                                      {candidate?.mobileNumber || "—"}
                                    </span>
                                  </div>
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
                                {activeFilter === "interviewPassed" && item.readyForProcessingAt && (
                                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 text-[10px] px-2 py-0.5 mt-1 font-bold rounded-md w-fit">
                                    Sent
                                  </Badge>
                                )}
                                {activeFilter === "interviewPassed" &&
                                  hasOfferLetter(item, offerLetterOverrides) && (
                                  <OfferLetterBadge
                                    className="mt-1"
                                    uploaderName={getOfferLetterUploaderName(item)}
                                  />
                                )}
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
                                    {activeFilter === "shortlisted" && (
                                      <TableCell className="px-4 py-3">
                                        <p className="text-[11px] text-slate-700 truncate">
                                          {candidateProjectMap?.notes || '—'}
                                        </p>
                                      </TableCell>
                                    )}
                                    {activeFilter === "shortlistRejected" && (
                                      <TableCell className="px-4 py-3">
                                        <p className="text-[11px] text-slate-700 truncate">
                                          {rejectionReason}
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
                                  {activeFilter === "shortlisted" && (
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
                                          navigate(`/interviews/detail/${item.id}`);
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
                                ) : activeFilter === "interviewPassed" ? (
                                  (() => {
                                    const showSendForProcessing =
                                      isInterviewCoordinator && !item.readyForProcessingAt;
                                    const offerLetterUploaded = hasOfferLetter(
                                      item,
                                      offerLetterOverrides,
                                    );
                                    const offerLetterUploader = getOfferLetterUploaderName(item);

                                    const iconActions = (
                                      <>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700"
                                          onClick={() => {
                                            if (item.id) navigate(`/interviews/detail/${item.id}`);
                                          }}
                                          title="View Interview"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        {offerLetterUploaded && (
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                            onClick={() => {
                                              const fileUrl = resolveOfferLetterFileUrl(
                                                item,
                                                offerLetterOverrides,
                                              );
                                              if (fileUrl) {
                                                setPdfViewerState({
                                                  isOpen: true,
                                                  fileUrl,
                                                  fileName: `Offer Letter - ${candidate?.firstName} ${candidate?.lastName}`,
                                                });
                                              }
                                            }}
                                            title={
                                              offerLetterUploader
                                                ? `View Offer Letter (uploaded by ${offerLetterUploader})`
                                                : "View Offer Letter"
                                            }
                                          >
                                            <FileText className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {canUploadOfferLetterOnPassedInterview &&
                                          (!isRecruiter || !offerLetterUploaded) && (
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700"
                                            onClick={() => openOfferLetterModal(item)}
                                            title="Upload Offer Letter"
                                          >
                                            <Upload className="h-4 w-4" />
                                          </Button>
                                        )}
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
                                      </>
                                    );

                                    if (showSendForProcessing) {
                                      return (
                                        <div className="flex flex-col items-end gap-2">
                                          <div className="flex items-center justify-end gap-2">
                                            {iconActions}
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-full min-w-[10.5rem] px-3 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 whitespace-nowrap"
                                            disabled={isSendingForProcessing}
                                            onClick={() => openSendForProcessingModal(item)}
                                            title="Send for Processing"
                                          >
                                            <Send className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                            Send for Processing
                                          </Button>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="flex items-center justify-end gap-2">
                                        {iconActions}
                                      </div>
                                    );
                                  })()
                                ) : activeFilter === "interviewCompleted" || activeFilter === "interviewBackout" || activeFilter === "interviewRejected" ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700"
                                      onClick={() => {
                                        if (item.id) {
                                          navigate(`/interviews/detail/${item.id}`);
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
          </div>
        </div>
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

      {offerLetterModal && (
        <OfferLetterUploadModal
          isOpen={offerLetterModal.isOpen}
          onClose={() => setOfferLetterModal(null)}
          candidateId={offerLetterModal.candidateId}
          candidateName={offerLetterModal.candidateName}
          projectId={offerLetterModal.projectId}
          projectTitle={offerLetterModal.projectTitle}
          roleCatalogId={offerLetterModal.roleCatalogId}
          roleDesignation={offerLetterModal.roleDesignation}
          isAlreadyUploaded={offerLetterModal.isAlreadyUploaded}
          existingFileUrl={offerLetterModal.existingFileUrl}
          onSuccess={(uploadData) => {
            const fileUrl = getOfferLetterUrlFromUpload(uploadData);
            if (fileUrl && offerLetterModal) {
              const overrideKey = `${offerLetterModal.candidateId}:${offerLetterModal.projectId}:${offerLetterModal.roleCatalogId}`;
              setOfferLetterOverrides((prev) => ({
                ...prev,
                [overrideKey]: fileUrl,
              }));
            }
            refetchCurrent();
          }}
        />
      )}

      <PDFViewer
        isOpen={pdfViewerState.isOpen}
        onClose={() => setPdfViewerState({ isOpen: false, fileUrl: "", fileName: "" })}
        fileUrl={pdfViewerState.fileUrl}
        fileName={pdfViewerState.fileName}
      />

      <SendForProcessingModal
        isOpen={!!sendForProcessingModal}
        onClose={() => setSendForProcessingModal(null)}
        onConfirm={handleConfirmSendForProcessing}
        isLoading={isSendingForProcessing || isBulkSendingForProcessing}
        mode={sendForProcessingModal?.mode ?? "single"}
        candidates={sendForProcessingModal?.candidates ?? []}
        onOfferLetterUploaded={(interviewId, fileUrl) => {
          const item = candidates.find((c) => c.id === interviewId);
          if (!item) return;
          const overrideKey = getOfferLetterOverrideKey(item);
          setOfferLetterOverrides((prev) => ({
            ...prev,
            [overrideKey]: fileUrl,
          }));
        }}
      />
    </div>
  );
}
