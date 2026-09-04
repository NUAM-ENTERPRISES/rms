import { useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toWhatsAppHref } from "@/lib/phone-links";
import { PhoneCallButton } from "@/components/molecules/PhoneCallButton";
import { getTileAccent } from "@/lib/tile-accent-styles";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  ArrowUpRight,
  ArrowRightLeft,
  SlidersHorizontal,
  FilterX,
  UserX,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { CandidateListIdentityCell, ImageViewer } from "@/components/molecules";
import { format } from "date-fns";
import { useCan } from "@/hooks/useCan";
import {
  useGetCandidatesQuery,
  useGetRecruiterMyCandidatesQuery,
  useTransferCandidateMutation,
  useBulkTransferCandidatesMutation,
  type RecruiterMyCandidatesResponse,
  type AllCandidatesResponse,
} from "@/features/candidates";
import { useAppSelector } from "@/app/hooks";
import { hasAllCandidatesView } from "@/config/role-capabilities";
import { ROLE_NAMES, isRecruiterRole } from "@/config/role-names";
import { motion } from "framer-motion";
import { TransferCandidateDialog } from "../components/TransferCandidateDialog";
import { BulkTransferCandidateDialog } from "../components/BulkTransferCandidateDialog";
import { AdvancedFiltersSheet } from "../components/AdvancedFiltersSheet";
import { CandidateProfileCompletionCell } from "../components/CandidateProfileCompletion";
import { toast } from "sonner";
import { getCandidateOperationsState } from "../utils/operations-candidate";
import { getCandidateCreatedByDisplay } from "../utils/getCandidateCreatedByDisplay";
import { isOperationsRole } from "@/config/role-names";
import { LogOperationsCallModal } from "../components/LogOperationsCallModal";
import { OperationsCallFollowUpIndicators } from "../components/OperationsCallFollowUpIndicators";
import { useOperationsCallModal } from "../hooks/useOperationsCallModal";
import {
  canOpenOperationsCallModal,
  getOperationsFollowUpStage,
} from "../utils/operations-follow-up.util";




const CANDIDATE_STATUS_FILTERS = new Set([
  "all",
  "untouched",
  "rnr",
  "call_back",
  "on_hold",
  "interested",
  "future",
  "deployed",
  "not_interested",
  "not_eligible",
  "other_enquiry",
]);

export default function CandidatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const tableRef = useRef<HTMLDivElement>(null);

  // Check if user is a recruiter (non-manager)
  const isRecruiter = user?.roles?.some(isRecruiterRole);
  const isManager = hasAllCandidatesView(user?.roles);
  const isOperationsUser = user?.roles?.some(isOperationsRole) ?? false;
  const canReadOperationsCallHistory = useCan("read:operations_call_history");
  // All roles can read candidates
  const canReadCandidates = true;
  const canWriteCandidates = useCan("write:candidates");
  const canBulkCreateCandidates = useCan("bulk_create:candidates");
  const canImportCandidates = useCan("import:candidates");
  const canTransferCandidates = user?.roles?.some((role) =>
    [
      "Managing Director",
      "Director",
      "Manager",
      "Recruitment Lead",
      "Team Head",
      "Team Lead",
      "System Admin",
      ROLE_NAMES.PROJECT_COORDINATOR,
    ].includes(role)
  );

  // Transfer candidate state
  const [transferDialog, setTransferDialog] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
    currentRecruiter?: { id: string; name?: string; email?: string } | null;
  }>({ isOpen: false });

  const [transferCandidate, { isLoading: isTransferring }] = useTransferCandidateMutation();
  const [bulkTransferCandidates, { isLoading: isBulkTransferring }] =
    useBulkTransferCandidatesMutation();

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkTransferDialog, setBulkTransferDialog] = useState(false);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const statusFromUrl = searchParams.get("status");
  const initialStatus =
    statusFromUrl && CANDIDATE_STATUS_FILTERS.has(statusFromUrl)
      ? statusFromUrl
      : "all";

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    status: initialStatus,
    source: "all" as string,
    dateFilter: "all",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    countryPreferences: [] as string[],
    sectorTypes: [] as string[],
    facilityPreferences: [] as string[],
    gender: "all",
    sources: [] as string[],
    minExperience: undefined as number | undefined,
    maxExperience: undefined as number | undefined,
    minSalary: undefined as number | undefined,
    maxSalary: undefined as number | undefined,
    minAge: undefined as number | undefined,
    maxAge: undefined as number | undefined,
    visaType: undefined as string | undefined,
    qualification: "",
    departmentId: undefined as string | undefined,
    roleCatalogId: undefined as string | undefined,
    heightMin: undefined as number | undefined,
    heightMax: undefined as number | undefined,
    weightMin: undefined as number | undefined,
    weightMax: undefined as number | undefined,
    skinTone: "",
    languageProficiency: "",
    smartness: "",
    licensingExam: "",
    dataFlow: undefined as boolean | undefined,
    eligibility: undefined as boolean | undefined,
    workExperienceCompany: "",
    workExperienceTitle: "",
    page: 1,
    limit: 10,
  });

  const listRequestPayload = useMemo(() => {
    const sourceParam =
      filters.sources.length > 0
        ? undefined
        : filters.source !== "all"
          ? filters.source
          : undefined;

    return {
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      dateFilter: filters.dateFilter !== "all" ? filters.dateFilter : undefined,
      dateFrom: filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : undefined,
      dateTo: filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : undefined,
      gender: filters.gender === "all" ? undefined : filters.gender,
      sources: filters.sources.length > 0 ? filters.sources : undefined,
      source: sourceParam,
      countryPreferences:
        filters.countryPreferences.length > 0 ? filters.countryPreferences : undefined,
      sectorTypes: filters.sectorTypes.length > 0 ? filters.sectorTypes : undefined,
      facilityPreferences:
        filters.facilityPreferences.length > 0 ? filters.facilityPreferences : undefined,
      minExperience: filters.minExperience,
      maxExperience: filters.maxExperience,
      minSalary: filters.minSalary,
      maxSalary: filters.maxSalary,
      minAge: filters.minAge,
      maxAge: filters.maxAge,
      visaType: filters.visaType,
      qualification: filters.qualification || undefined,
      roleCatalogId: filters.roleCatalogId || undefined,
      heightMin: filters.heightMin,
      heightMax: filters.heightMax,
      weightMin: filters.weightMin,
      weightMax: filters.weightMax,
      skinTone: filters.skinTone || undefined,
      languageProficiency: filters.languageProficiency || undefined,
      smartness: filters.smartness || undefined,
      licensingExam: filters.licensingExam || undefined,
      dataFlow: filters.dataFlow,
      eligibility: filters.eligibility,
      workExperienceCompany: filters.workExperienceCompany || undefined,
      workExperienceTitle: filters.workExperienceTitle || undefined,
    };
  }, [filters]);

  const activeFilterCount = [
    filters.countryPreferences.length > 0,
    filters.sectorTypes.length > 0,
    filters.facilityPreferences.length > 0,
    filters.sources.length > 0,
    filters.dateFilter !== "all",
    filters.gender !== "all",
    filters.minExperience !== undefined,
    filters.maxExperience !== undefined,
    filters.minSalary !== undefined,
    filters.maxSalary !== undefined,
    filters.minAge !== undefined,
    filters.maxAge !== undefined,
    !!filters.visaType,
    !!filters.qualification,
    !!filters.workExperienceCompany,
    !!filters.workExperienceTitle,
    !!filters.skinTone,
    !!filters.languageProficiency,
    !!filters.smartness,
    !!filters.licensingExam,
    filters.dataFlow !== undefined,
    filters.eligibility !== undefined,
    !!filters.roleCatalogId,
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      source: "all",
      dateFilter: "all",
      dateFrom: undefined,
      dateTo: undefined,
      countryPreferences: [],
      sectorTypes: [],
      facilityPreferences: [],
      gender: "all",
      sources: [],
      minExperience: undefined,
      maxExperience: undefined,
      minSalary: undefined,
      maxSalary: undefined,
      minAge: undefined,
      maxAge: undefined,
      visaType: undefined,
      qualification: "",
      departmentId: undefined,
      roleCatalogId: undefined,
      heightMin: undefined,
      heightMax: undefined,
      weightMin: undefined,
      weightMax: undefined,
      skinTone: "",
      languageProficiency: "",
      smartness: "",
      licensingExam: "",
      dataFlow: undefined,
      eligibility: undefined,
      workExperienceCompany: "",
      workExperienceTitle: "",
      page: 1,
      limit: 10,
    });
  };

  // Fetch candidates - use different API for Recruiter users
  const allCandidatesQuery = useGetCandidatesQuery(
    listRequestPayload,
    { skip: isRecruiter && !isManager } // Skip this query if user is recruiter without manager role
  );

  const allCandidatesData = allCandidatesQuery.data as
    | AllCandidatesResponse
    | undefined
    | any;
  const isLoadingAll = allCandidatesQuery.isLoading;
  const errorAll = allCandidatesQuery.error;
  const allCandidatesRefetch = allCandidatesQuery.refetch;

  const recruiterCandidatesQuery = useGetRecruiterMyCandidatesQuery(
    listRequestPayload,
    { skip: !isRecruiter || isManager } // Skip this query if user is not recruiter or is manager
  );

  const recruiterCandidatesData = recruiterCandidatesQuery.data as
    | RecruiterMyCandidatesResponse
    | undefined
    | any;
  const isLoadingRecruiter = recruiterCandidatesQuery.isLoading;
  const errorRecruiter = recruiterCandidatesQuery.error;
  const recruiterRefetch = recruiterCandidatesQuery.refetch;

  // Use the appropriate data source
  const candidates: any[] =
    isRecruiter && !isManager
      ? recruiterCandidatesData?.data || []
      : Array.isArray(allCandidatesData)
        ? allCandidatesData
        : Array.isArray(allCandidatesData?.data)
        ? allCandidatesData.data
        : [];

  const isLoading = isLoadingRecruiter || isLoadingAll;
  const error = errorRecruiter || errorAll;

  const refetchCandidates = () => {
    if (isRecruiter && !isManager) {
      recruiterRefetch();
    } else {
      allCandidatesRefetch();
    }
  };

  const {
    openLogCall,
    openCallHistory,
    resolveAssignment,
    isLoggingCall,
    handleLogOperationsCall,
    handleInterestedReassign,
    handleNotInterestedJunk,
    callModalCandidate,
    logCallAttempts,
    logCallNextAttempt,
    logCallFollowUpStage,
    canOpenCallModal,
    canLogNoAnswerCall,
    logCallCandidateName,
    logCallRecruiterName,
    logCallCurrentStatus,
    isTransferring: isOperationsTransferring,
    isMarkingNotInterested,
    closeCallModal,
    callModalState,
  } = useOperationsCallModal({
    operationsUserId: isOperationsUser ? user?.id : undefined,
    onLogged: refetchCandidates,
  });

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  // Handle transfer candidate
  const handleTransferCandidate = async (data: {
    targetRecruiterId: string;
    reason: string;
  }) => {
    if (!transferDialog.candidateId) return;

    try {
      await transferCandidate({
        candidateId: transferDialog.candidateId,
        targetRecruiterId: data.targetRecruiterId,
        reason: data.reason,
      }).unwrap();

      toast.success("Candidate transferred successfully!");
      setTransferDialog({ isOpen: false });

      // Refetch candidates
      if (isRecruiter && !isManager) {
        recruiterRefetch();
      } else {
        allCandidatesRefetch();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to transfer candidate");
    }
  };

  const handleBulkTransfer = async (data: {
    targetRecruiterId: string;
    reason: string;
  }) => {
    try {
      await bulkTransferCandidates({
        candidateIds: [...selectedCandidateIds],
        targetRecruiterId: data.targetRecruiterId,
        reason: data.reason,
      }).unwrap();
      toast.success(
        `${selectedCandidateIds.size} candidate${selectedCandidateIds.size !== 1 ? "s" : ""} transferred successfully!`,
      );
      setSelectedCandidateIds(new Set());
      setBulkTransferDialog(false);
      refetchCandidates();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to bulk transfer candidates");
    }
  };




  const pagination =
    isRecruiter && !isManager
      ? recruiterCandidatesData?.pagination
      : allCandidatesData?.pagination;
  const pageItems = candidates;
  const totalCount =
    pagination?.totalCount ?? pagination?.total ?? candidates.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / filters.limit));

  // Format date - following FE guidelines: DD MMM YYYY
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format date and time
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };




  // Get status badge variant and icon
  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "untouched":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-foreground",
          bgColor: "bg-muted",
          borderColor: "border-border",
        };
      case "interested":
        return {
          variant: "default" as const,
          icon: UserCheck,
          textColor: "text-blue-700",
          bgColor: "bg-blue-100",
          borderColor: "border-blue-300",
        };
      case "not interested":
        return {
          variant: "secondary" as const,
          icon: XCircle,
          textColor: "text-foreground",
          bgColor: "bg-muted",
          borderColor: "border-border",
        };
      case "not eligible":
        return {
          variant: "destructive" as const,
          icon: XCircle,
          textColor: "text-red-700",
          bgColor: "bg-red-100",
          borderColor: "border-red-300",
        };
      case "other enquiry":
        return {
          variant: "outline" as const,
          icon: Mail,
          textColor: "text-purple-700",
          bgColor: "bg-purple-100",
          borderColor: "border-purple-300",
        };
      case "future":
        return {
          variant: "secondary" as const,
          icon: Calendar,
          textColor: "text-indigo-700",
          bgColor: "bg-indigo-100",
          borderColor: "border-indigo-300",
        };
      case "on hold":
        return {
          variant: "secondary" as const,
          icon: Clock,
          textColor: "text-orange-700",
          bgColor: "bg-orange-100",
          borderColor: "border-orange-300",
        };
      case "rnr":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-yellow-700",
          bgColor: "bg-yellow-100",
          borderColor: "border-yellow-300",
        };
      case "call back":
      case "call_back":
        return {
          variant: "outline" as const,
          icon: Phone,
          textColor: "text-cyan-700",
          bgColor: "bg-cyan-100",
          borderColor: "border-cyan-300",
        };
      case "qualified":
        return {
          variant: "default" as const,
          icon: CheckCircle,
          textColor: "text-green-700",
          bgColor: "bg-green-100",
          borderColor: "border-green-300",
        };
      case "deployed":
      case "working": // legacy key - treat as deployed
        return {
          variant: "default" as const,
          icon: Briefcase,
          textColor: "text-emerald-700",
          bgColor: "bg-emerald-100",
          borderColor: "border-emerald-300",
        };
      default:
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-foreground",
          bgColor: "bg-muted",
          borderColor: "border-border",
        };
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Loading Candidates...
          </h3>
          <p className="text-muted-foreground">
            Please wait while we fetch the candidate data.
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error Loading Candidates
          </h3>
          <p className="text-muted-foreground mb-6">
            There was an error loading the candidate data. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!canReadCandidates) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">You don't have permission to view candidates.</p>
        </div>
      </div>
    );
  }

  // Dashboard stats (derived from real candidate data)




  // Stat type and unified recruiter-style tiles for all users
  type Stat = {
    label: string;
    value: number | string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    statusFilter?: string;
  };

  // Helper to safely extract `counts` from different response shapes
  const extractCounts = (resp: any) => resp?.counts ?? resp?.data?.counts ?? undefined;

  // Prefer server-provided counts (recruiter or all candidates), otherwise derive from client data
  const serverCounts = isRecruiter && !isManager ? extractCounts(recruiterCandidatesData) : extractCounts(allCandidatesData);

  const derivedCounts = {
    // Recruiter endpoint uses totalAssigned; all-candidates endpoint uses total
    totalAssigned:
      (isRecruiter && !isManager
        ? serverCounts?.totalAssigned
        : serverCounts?.total) ??
      serverCounts?.totalAssigned ??
      totalCount,
    handledByCRE: serverCounts?.handledByCRE ?? 0,
    untouched: serverCounts?.untouched ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "untouched").length,
    rnr: serverCounts?.rnr ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "rnr").length,
    callBack:
      serverCounts?.callBack ??
      candidates.filter((c: any) => {
        const s = (c?.currentStatus?.statusName || "").toLowerCase();
        return s === "call back" || s === "call_back";
      }).length,
    rnrHandledByCRE: serverCounts?.rnrHandledByCRE ?? 0,
    onHold: serverCounts?.onHold ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "on hold" || (c?.currentStatus?.statusName || "").toLowerCase() === "on_hold").length,
    interested: serverCounts?.interested ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "interested").length,
    qualified: serverCounts?.qualified ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "qualified").length,
    future: serverCounts?.future ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "future").length,
    deployed: serverCounts?.deployed ?? serverCounts?.working ?? candidates.filter((c: any) => ((c?.currentStatus?.statusName || "").toLowerCase() === "deployed") || ((c?.currentStatus?.statusName || "").toLowerCase() === "working")).length,
    notInterested: serverCounts?.notInterested ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "not interested" || (c?.currentStatus?.statusName || "").toLowerCase() === "not_interested").length,
    notEligible: serverCounts?.notEligible ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "not eligible" || (c?.currentStatus?.statusName || "").toLowerCase() === "not_eligible").length,
    otherEnquiry: serverCounts?.otherEnquiry ?? candidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "other enquiry" || (c?.currentStatus?.statusName || "").toLowerCase() === "other_enquiry").length,
  };

  let stats: Stat[] = [
    {
      label: "Assigned to Me",
      value: derivedCounts.totalAssigned,
      subtitle: derivedCounts.handledByCRE > 0 ? `${derivedCounts.handledByCRE} with Operations handler` : "Assigned candidates",
      icon: Users,
      statusFilter: "all",
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Untouched",
      value: derivedCounts.untouched,
      subtitle: "Wants to work today",
      icon: UserCheck,
      statusFilter: "untouched",
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "RNR",
      value: derivedCounts.rnr,
      subtitle: derivedCounts.rnrHandledByCRE > 0 ? `${derivedCounts.rnrHandledByCRE} with Operations handler` : "Ring not responded",
      icon: Phone,
      statusFilter: "rnr",
      color: "from-orange-500 to-red-500",
    },
    {
      label: "Call Back",
      value: derivedCounts.callBack,
      subtitle: "Scheduled callbacks",
      icon: Phone,
      statusFilter: "call_back",
      color: "from-cyan-500 to-teal-500",
    },
    {
      label: "On Hold",
      value: derivedCounts.onHold,
      subtitle: "Requires follow-up",
      icon: Clock,
      statusFilter: "on_hold",
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Interested",
      value: derivedCounts.interested,
      subtitle: "Expressed interest",
      icon: UserCheck,
      statusFilter: "interested",
      color: "from-lime-400 to-green-500",
    },
    {
      label: "Future",
      value: derivedCounts.future,
      subtitle: "Follow up later",
      icon: Calendar,
      statusFilter: "future",
      color: "from-indigo-500 to-violet-500",
    },
    {
      label: "Deployed",
      value: derivedCounts.deployed,
      subtitle: "Currently deployed",
      icon: Briefcase,
      statusFilter: "deployed",
      color: "from-fuchsia-500 to-pink-400",
    },
    {
      label: "Not Interested",
      value: derivedCounts.notInterested,
      subtitle: "Not interested",
      icon: XCircle,
      statusFilter: "not_interested",
      color: "from-slate-500 to-stone-400",
    },
    {
      label: "Not Eligible",
      value: derivedCounts.notEligible,
      subtitle: "Does not meet requirements",
      icon: UserX,
      statusFilter: "not_eligible",
      color: "from-rose-500 to-red-500",
    },
    {
      label: "Other Enquiry",
      value: derivedCounts.otherEnquiry,
      subtitle: "Other enquiries",
      icon: Mail,
      statusFilter: "other_enquiry",
      color: "from-yellow-400 to-amber-400",
    },
  ];

  // If the user is a recruiter (non-manager), show recruiter-specific tiles
  if (isRecruiter && !isManager) {
    const recruiterCounts = extractCounts(recruiterCandidatesData);
    const assignedCount = recruiterCounts?.totalAssigned ?? totalCount;
    const untouchedCount = recruiterCounts?.untouched ?? 0;
    const rnrCount = recruiterCounts?.rnr ?? 0;
    const callBackCount = recruiterCounts?.callBack ?? 0;
    const onHoldCount = recruiterCounts?.onHold ?? 0;
    const interestedCount = recruiterCounts?.interested ?? 0;
    const futureCount = recruiterCounts?.future ?? 0;
    const workingCount = recruiterCounts?.working ?? 0;
    const notInterestedCount = recruiterCounts?.notInterested ?? 0;
    const notEligibleCount = recruiterCounts?.notEligible ?? 0;
    const otherEnquiryCount = recruiterCounts?.otherEnquiry ?? 0;

    stats = [
      {
        label: "Assigned to Me",
        value: assignedCount,
        subtitle: "Assigned candidates",
        icon: Users,
        statusFilter: "all",
        color: "from-blue-500 to-cyan-500",
      },
      {
        label: "Untouched",
        value: untouchedCount,
        subtitle: "Wants to work today",
        icon: UserCheck,
        statusFilter: "untouched",
        color: "from-emerald-500 to-teal-500",
      },
      {
        label: "Ring Not Responded (RNR)",
        value: rnrCount,
        subtitle: "Ring not responded",
        icon: Phone,
        statusFilter: "rnr",
        color: "from-orange-500 to-red-500",
      },
      {
        label: "Call Back",
        value: callBackCount,
        subtitle: "Scheduled callbacks",
        icon: Phone,
        statusFilter: "call_back",
        color: "from-cyan-500 to-teal-500",
      },
      {
        label: "On Hold",
        value: onHoldCount,
        subtitle: "Requires follow-up",
        icon: Clock,
        statusFilter: "on_hold",
        color: "from-purple-500 to-pink-500",
      },
      {
        label: "Interested",
        value: interestedCount,
        subtitle: "Expressed interest",
        icon: UserCheck,
        statusFilter: "interested",
        color: "from-lime-400 to-green-500",
      },
      {
        label: "Future",
        value: futureCount,
        subtitle: "Follow up later",
        icon: Calendar,
        statusFilter: "future",
        color: "from-indigo-500 to-violet-500",
      },
      {
        label: "Deployed",
        value: workingCount || 0,
        subtitle: "Currently deployed",
        icon: Briefcase,
        statusFilter: "deployed",
        color: "from-fuchsia-500 to-pink-400",
      },
      {
        label: "Not Interested",
        value: notInterestedCount,
        subtitle: "Not interested",
        icon: XCircle,
        statusFilter: "not_interested",
        color: "from-slate-500 to-stone-400",
      },
      {
        label: "Not Eligible",
        value: notEligibleCount,
        subtitle: "Does not meet requirements",
        icon: UserX,
        statusFilter: "not_eligible",
        color: "from-rose-500 to-red-500",
      },
      {
        label: "Other Enquiry",
        value: otherEnquiryCount,
        subtitle: "Other enquiries",
        icon: Mail,
        statusFilter: "other_enquiry",
        color: "from-yellow-400 to-amber-400",
      },
    ];
  }
  else {
    // For non-recruiter users: if API returns counts, show the same tiles
    const allCounts = extractCounts(allCandidatesData);
    if (allCounts) {
      const assignedCount = (allCounts as any)?.total ?? (allCounts as any)?.totalAssigned ?? totalCount;
      const untouchedCount = allCounts?.untouched ?? 0;
      const rnrCount = allCounts?.rnr ?? 0;
      const callBackCount = allCounts?.callBack ?? 0;
      const onHoldCount = allCounts?.onHold ?? 0;
      const interestedCount = allCounts?.interested ?? 0;
      const futureCount = allCounts?.future ?? 0;
      const workingCount = allCounts?.working ?? 0;
      const notInterestedCount = allCounts?.notInterested ?? 0;
      const notEligibleCount = allCounts?.notEligible ?? 0;
      const otherEnquiryCount = allCounts?.otherEnquiry ?? 0;

      stats = [
        {
          label: "Total Candidates",
          value: assignedCount,
          subtitle: "All assigned",
          icon: Users,
          color: "from-blue-500 to-cyan-500",
          statusFilter: "all",
        },
        {
          label: "Untouched",
          value: untouchedCount,
          subtitle: "Wants to work today",
          icon: UserCheck,
          statusFilter: "untouched",
          color: "from-emerald-500 to-teal-500",
        },
        {
          label: "RNR",
          value: rnrCount,
          subtitle: "Ring not responded",
          icon: Phone,
          statusFilter: "rnr",
          color: "from-orange-500 to-red-500",
        },
        {
          label: "Call Back",
          value: callBackCount,
          subtitle: "Scheduled callbacks",
          icon: Phone,
          statusFilter: "call_back",
          color: "from-cyan-500 to-teal-500",
        },
        {
          label: "On Hold",
          value: onHoldCount,
          subtitle: "Requires follow-up",
          icon: Clock,
          statusFilter: "on_hold",
          color: "from-purple-500 to-pink-500",
        },
        {
          label: "Interested",
          value: interestedCount,
          subtitle: "Expressed interest",
          icon: UserCheck,
          statusFilter: "interested",
          color: "from-lime-400 to-green-500",
        },
        {
          label: "Future",
          value: futureCount,
          subtitle: "Follow up later",
          icon: Calendar,
          statusFilter: "future",
          color: "from-indigo-500 to-violet-500",
        },
        {
          label: "Deployed",
          value: workingCount,
          subtitle: "Currently deployed",
          icon: Briefcase,
          statusFilter: "deployed",
          color: "from-fuchsia-500 to-pink-400",
        },
        {
          label: "Not Interested",
          value: notInterestedCount,
          subtitle: "Not interested",
          icon: XCircle,
          statusFilter: "not_interested",
          color: "from-slate-500 to-stone-400",
        },
        {
          label: "Not Eligible",
          value: notEligibleCount,
          subtitle: "Does not meet requirements",
          icon: UserX,
          statusFilter: "not_eligible",
          color: "from-rose-500 to-red-500",
        },
        {
          label: "Other Enquiry",
          value: otherEnquiryCount,
          subtitle: "Other enquiries",
          icon: Mail,
          statusFilter: "other_enquiry",
          color: "from-yellow-400 to-amber-400",
        },
      ];
    }
  }

  // Handler for clicking statistic tiles (applies a status filter)
  const handleTileClick = (status?: string) => {
    setFilters((prev) => ({ ...prev, status: status ?? "all", page: 1 }));

    window.requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Force a refetch after state update completes to ensure the network call runs
    setTimeout(() => {
      if (isRecruiter && !isManager) {
        if (typeof recruiterRefetch === "function") recruiterRefetch();
      } else {
        if (typeof allCandidatesRefetch === "function") allCandidatesRefetch();
      }
    }, 50);
  };

  // Compute dynamic titles based on active tile/status
  const getTableTitle = () => {
    switch (filters.status) {
      case "untouched":
        return "Untouched";
      case "rnr":
        return "RNR";
      case "call_back":
        return "Call Back";
      case "interested":
        return "Interested";
      case "not_interested":
        return "Not Interested";
      case "not_eligible":
        return "Not Eligible";
      case "other_enquiry":
        return "Other Enquiries";
      case "qualified":
        return "Qualified";
      case "future":
        return "Future Follow-ups";
      case "deployed":
      case "working": // legacy
        return "Deployed";
      case "on_hold":
        return "On Hold";
      case "all":
      default:
        return isRecruiter && !isManager ? "My Assigned Candidates" : "All Candidates";
    }
  };

  const getTableSubtitle = () => {
    switch (filters.status) {
      case "untouched":
        return "Candidates who want to work today";
      case "rnr":
        return "Ring not responded candidates";
      case "call_back":
        return "Candidates with scheduled callbacks";
      case "interested":
        return "Candidates who expressed interest";
      case "not_interested":
        return "Candidates who declined or are not interested";
      case "not_eligible":
        return "Candidates who do not meet role requirements";
      case "other_enquiry":
        return "Candidates with other enquiries";
      case "qualified":
        return "Candidates who passed screening";
      case "future":
        return "Candidates to follow up later";
      case "deployed":
      case "working":
        return "Candidates currently deployed";
      case "on_hold":
        return "Candidates on hold needing follow-up";
      case "all":
      default:
        return isRecruiter && !isManager ? "Assigned candidates" : "All candidates";
    }
  };

  return (
    <div className="min-h-screen ">
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Search & Filter Bar */}
        <div className="rounded-2xl border border-border bg-card shadow-sm px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search candidates by name, skills, or email…"
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9 text-sm border-border bg-muted focus:bg-card focus:ring-2 focus:ring-blue-100 transition-all rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsFilterSheetOpen(true)}
                className="flex items-center gap-2 h-9 px-3 rounded-xl border-border hover:bg-muted text-muted-foreground text-sm font-medium"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Advanced Filters</span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-0.5 h-5 w-5 p-0 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="h-9 px-3 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-sm font-medium gap-1.5"
                >
                  <FilterX className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
              )}
              <Select
                value={filters.source}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, source: value, sources: [], page: 1 }))
                }
              >
                <SelectTrigger className="h-9 text-sm border-border rounded-xl bg-card min-w-[130px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="meta">Meta</SelectItem>
                  <SelectItem value="direct_enquiry">Direct Enquiry</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="paid_ads">Paid Ads</SelectItem>
                  <SelectItem value="agents">Agents</SelectItem>
                  <SelectItem value="hospital_visit">Hospital Visit</SelectItem>
                  <SelectItem value="expo_event">Expo / Event</SelectItem>
                </SelectContent>
              </Select>
              {/* {canBulkCreateCandidates && (
                <Button
                  onClick={() => navigate("/candidates/bulk-resume")}
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs font-semibold rounded-xl shadow-sm gap-1.5 shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Bulk Resume Upload
                </Button>
              )} */}
              {canImportCandidates && (
                <Button
                  onClick={() => navigate("/candidates/import")}
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs font-semibold rounded-xl shadow-sm gap-1.5 shrink-0"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Import Sheet
                </Button>
              )}
              {canWriteCandidates && (
                <Button
                  onClick={() => navigate("/candidates/create")}
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Candidate
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Candidate Dashboard Tiles */}
        {(() => {
          const statusToAccent: Record<string, string> = {
            all: "blue", untouched: "emerald", rnr: "orange", on_hold: "purple",
            interested: "lime", future: "indigo", deployed: "teal",
            not_interested: "slate", not_eligible: "rose", other_enquiry: "amber",
            call_back: "cyan",
          };
          return (
            <div className="grid auto-rows-fr gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((stat, i) => {
                const accent = statusToAccent[stat.statusFilter ?? ""] ?? "blue";
                const isInteractive = Boolean(stat.statusFilter);
                const isActive = isInteractive && filters.status === stat.statusFilter;
                return (
                  <motion.div
                    key={stat.label}
                    className="h-full"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <DashboardStatTile
                      accent={accent}
                      label={stat.label}
                      value={stat.value}
                      subtitle={stat.subtitle}
                      icon={stat.icon}
                      active={isActive}
                      interactive={isInteractive}
                      footerText={
                        isInteractive
                          ? isActive
                            ? "Viewing now"
                            : "Click to filter"
                          : undefined
                      }
                      onClick={
                        isInteractive
                          ? () => handleTileClick(stat.statusFilter)
                          : undefined
                      }
                      as={isInteractive ? "button" : "div"}
                    />
                  </motion.div>
                );
              })}
            </div>
          );
        })()}

        {/* Candidates Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Table Header Bar */}
          <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground truncate">{getTableTitle()}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{getTableSubtitle()} — {totalCount} candidate{totalCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {canTransferCandidates && selectedCandidateIds.size > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => setBulkTransferDialog(true)}
                    size="sm"
                    className="h-9 px-3 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-sm gap-1.5"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Transfer ({selectedCandidateIds.size})
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Premium Table Container */}
          <div ref={tableRef} className="overflow-hidden">

              {/* Table */}
              <Table>
                <TableHeader className="bg-muted/80">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {canTransferCandidates && (
                      <TableHead className="h-10 px-4 w-10">
                        <Checkbox
                          checked={
                            pageItems.length > 0 &&
                            pageItems.every((c) => selectedCandidateIds.has(c.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCandidateIds(
                                new Set(pageItems.map((c) => c.id)),
                              );
                            } else {
                              setSelectedCandidateIds(new Set());
                            }
                          }}
                          aria-label="Select all candidates on this page"
                        />
                      </TableHead>
                    )}
                    <TableHead className="h-10 min-w-[14rem] whitespace-normal px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Candidate
                    </TableHead>
                    <TableHead className="h-10 px-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Contact
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Recruiter
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Created By
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Created At
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="h-10 px-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Profile
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Last Updated
                    </TableHead>
                    <TableHead className="h-10 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {Array.isArray(pageItems) &&
                    pageItems.map((candidate) => {
                      const statusName = candidate.currentStatus?.statusName ?? "";
                      const candidateName = [candidate.firstName, candidate.lastName]
                        .filter(Boolean)
                        .join(" ");
                      const statusInfo = getStatusInfo(statusName);
                      const StatusIcon = statusInfo.icon;

                      // Determine active recruiter assignment
                      const activeAssignment = (candidate.recruiterAssignments || [])?.find((a: any) => a.isActive);
                      const recruiter = activeAssignment?.recruiter || (candidate as any).recruiter || null;
                      const createdBy = getCandidateCreatedByDisplay(candidate, activeAssignment);
                      const operations = getCandidateOperationsState(candidate);
                      const operationsAssignment = resolveAssignment(candidate);
                      const showOperationsFollowUp =
                        Boolean(operationsAssignment) &&
                        (isOperationsUser ||
                          operations.isHandledByOperations ||
                          canReadOperationsCallHistory);
                      const followUpStage = getOperationsFollowUpStage(operationsAssignment);
                      const canLogCall =
                        isOperationsUser &&
                        canOpenOperationsCallModal(followUpStage);

                      return (
                        <TableRow
                          key={candidate.id}
                          className={cn(
                            "border-b border-border hover:bg-muted/60 transition-colors last:border-b-0",
                            selectedCandidateIds.has(candidate.id) && "bg-muted/40",
                          )}
                        >
                          {canTransferCandidates && (
                            <TableCell className="px-4 py-3 w-10">
                              <Checkbox
                                checked={selectedCandidateIds.has(candidate.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedCandidateIds((prev) => {
                                    const next = new Set(prev);
                                    if (checked) {
                                      next.add(candidate.id);
                                    } else {
                                      next.delete(candidate.id);
                                    }
                                    return next;
                                  });
                                }}
                                aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                              />
                            </TableCell>
                          )}
                          {/* Candidate */}
                          <TableCell className="min-w-[14rem] whitespace-normal align-top px-4 py-3">
                            <div className="flex items-start gap-3">
                              {/* FULL VIBRANT COLOR AVATAR */}
                              <ImageViewer
                                title={candidateName}
                                src={candidate.profileImage || null}
                                fallbackSrc={
                                  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                }
                                className="h-10 w-10 shrink-0 rounded-full"
                                ariaLabel={`View full image for ${candidateName}`}
                                enableHoverPreview={true} /* show hover preview on desktop */
                              />

                              <div className="min-w-0 flex-1">
                                <CandidateListIdentityCell
                                  firstName={candidate.firstName}
                                  lastName={candidate.lastName}
                                  candidateCode={candidate.candidateCode}
                                  currentRole={candidate.currentRole}
                                  isHandledByOperations={operations.isHandledByOperations}
                                  isOperationsReassigned={operations.isOperationsReassigned}
                                  operationsStatusNote={operations.operationsStatusNote}
                                  operationsStatusName={operations.operationsStatusName}
                                  onNameClick={() =>
                                    navigate(`/candidates/${candidate.id}`)
                                  }
                                />
                              </div>
                            </div>
                          </TableCell>
                             
                                   {/* Contact */}
                          <TableCell className="px-4 py-3 text-center">
                            <div className="flex flex-col items-stretch gap-2">
                              <div className="flex items-center justify-center gap-1.5 w-full">
                                {(() => {
                                const whatsappHref = toWhatsAppHref(candidate);
                                return (
                                  <>
                                    {whatsappHref ? (
                                      <Button
                                        asChild
                                        variant="ghost"
                                        className="h-7 w-7 p-0 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 shadow-sm border border-green-100/50"
                                        title={`WhatsApp ${candidate.firstName || ""}`}
                                      >
                                        <a
                                          href={whatsappHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          aria-label={`WhatsApp ${candidate.firstName || "candidate"}`}
                                        >
                                          <FaWhatsapp className="h-4 w-4" />
                                        </a>
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        className="h-7 w-7 p-0 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 shadow-sm border border-green-100/50"
                                        disabled
                                        title={`WhatsApp ${candidate.firstName || ""}`}
                                      >
                                        <FaWhatsapp className="h-4 w-4" />
                                      </Button>
                                    )}

                                    <PhoneCallButton
                                      parts={candidate}
                                      title={`Call ${candidate.firstName || ""}`}
                                      ariaLabel={`Call ${candidate.firstName || "candidate"}`}
                                      className="h-7 w-7 p-0 rounded-full text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm border border-blue-100/50"
                                      disabledClassName="h-7 w-7 p-0 rounded-full text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm border border-blue-100/50"
                                    />
                                  </>
                                );
                                })()}
                              </div>

                              <div className="w-full min-w-0 text-center text-xs text-muted-foreground space-y-1">
                                {candidate.email ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-foreground truncate max-w-[220px]">
                                      {candidate.email}
                                    </span>
                                  </div>
                                ) : null}
                                <div className="flex items-center justify-center gap-1.5">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-foreground truncate max-w-[220px]">
                                    {candidate.countryCode} {candidate.mobileNumber}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Recruiter */}
                          <TableCell className="px-4 py-3">
                            <div className="text-xs">
                              {recruiter ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{recruiter.name}</span>
                                  </div>
                                  {recruiter.email && (
                                    <div className="flex items-center gap-1.5 text-foreground">
                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                      <span className="truncate max-w-[120px]">{recruiter.email}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Unassigned</span>
                              )}
                            </div>
                          </TableCell>

                        {/* Created By */}
                        <TableCell className="px-4 py-3">
                          <div className="text-xs">
                            {createdBy?.name ? (
                              <div className="space-y-0.5">
                                <div className="font-medium text-foreground">
                                  {createdBy.name}
                                </div>
                                {createdBy.email && (
                                  <div className="flex items-center gap-1.5 text-foreground">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate max-w-[120px]">
                                      {createdBy.email}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                          {/* Created At */}
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDateTime(candidate.createdAt)}
                            </div>
                          </TableCell>

                          {/* Status Column (single source of truth) */}
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-2">
                                {/* Colored icon in a tiny circle */}
                                <div
                                  className={`p-1 rounded-full ${statusInfo.bgColor}`}
                                >
                                  <StatusIcon
                                    className={`h-3.5 w-3.5 ${statusInfo.textColor.replace(
                                      "700",
                                      "600"
                                    )} `}
                                  />
                                </div>

                                {/* Colored Badge – looks premium */}
                                <Badge
                                  variant="outline"
                                  title={candidate.currentStatus?.statusName || "Unknown"}
                                  className={`
                        ${statusInfo.textColor} 
                        ${statusInfo.bgColor} 
                        ${statusInfo.borderColor} 
                        border 
                        font-medium 
                        text-[10px] 
                        px-2 py-0.5
                      `}
                                >
                                  {candidate.currentStatus?.statusName || "Unknown"}
                                </Badge>
                              </div>
                              {showOperationsFollowUp && (
                                <OperationsCallFollowUpIndicators
                                  assignment={operationsAssignment}
                                  canLogCall={canLogCall}
                                  onLogCall={() => openLogCall(candidate)}
                                  onViewHistory={() => openCallHistory(candidate)}
                                  showLogCallButton={isOperationsUser}
                                  isLoggingCall={isLoggingCall}
                                />
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="px-2 py-3 w-[4.5rem] text-center">
                            <CandidateProfileCompletionCell candidate={candidate} />
                          </TableCell>

                          {/* Last Updated */}
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(candidate.updatedAt)}
                            </div>
                          </TableCell>

                       

                          {/* Actions */}
                          <TableCell className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/candidates/${candidate.id}`)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                {showOperationsFollowUp && canLogCall && (
                                  <DropdownMenuItem
                                    onClick={() => openLogCall(candidate)}
                                    className="text-green-700"
                                  >
                                    <Phone className="mr-2 h-4 w-4" /> Log Call
                                  </DropdownMenuItem>
                                )}
                                {showOperationsFollowUp && (
                                  <DropdownMenuItem onClick={() => openCallHistory(candidate)}>
                                    <Clock className="mr-2 h-4 w-4" /> View Call History
                                  </DropdownMenuItem>
                                )}
                                {canTransferCandidates && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const currentRecruiter = candidate.recruiter || candidate.recruiterAssignments?.find((a: any) => a.isActive)?.recruiter || null;
                                        setTransferDialog({
                                          isOpen: true,
                                          candidateId: candidate.id,
                                          candidateName,
                                          currentRecruiter,
                                        });
                                      }}
                                      className="text-blue-600"
                                    >
                                      <UserCheck className="mr-2 h-4 w-4" /> Transfer Candidate
                                    </DropdownMenuItem>
                                  </>
                                )}
                            
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>

              {/* Empty State */}
              {pageItems.length === 0 && totalCount === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                    <UserCheck className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-semibold text-muted-foreground">No candidates found</p>
                  <p className="text-sm text-slate-400 text-center max-w-xs">
                    {filters.search || filters.status !== "all" || filters.source !== "all"
                      ? "Try adjusting your search criteria or filters."
                      : "Get started by adding your first candidate."}
                  </p>
                  {!filters.search && filters.status === "all" && canWriteCandidates && (
                    <Button
                      onClick={() => navigate("/candidates/create")}
                      size="sm"
                      className="mt-1 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add First Candidate
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{(filters.page - 1) * filters.limit + 1}</span>–<span className="font-semibold text-foreground">{Math.min(filters.page * filters.limit, totalCount)}</span> of <span className="font-semibold text-foreground">{totalCount}</span> candidates
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={filters.page === 1}
                    className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                  >
                    Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      if (totalPages <= 7 || p === 1 || p === totalPages || (p >= filters.page - 1 && p <= filters.page + 1)) {
                        return (
                          <Button
                            key={p}
                            variant={filters.page === p ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                            className={cn("h-8 w-8 p-0 text-xs", filters.page === p ? "bg-blue-600 hover:bg-blue-700 shadow-sm" : "text-muted-foreground hover:bg-muted")}
                          >
                            {p}
                          </Button>
                        );
                      } else if (p === filters.page - 2 || p === filters.page + 2) {
                        return <span key={p} className="text-slate-300 text-xs px-0.5">…</span>;
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                    disabled={filters.page >= totalPages}
                    className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      <AdvancedFiltersSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        filters={filters as any}
        setFilters={setFilters as any}
        isManagerOrAdmin={!!isManager}
        isRecruiter={!!isRecruiter}
        handleResetFilters={handleResetFilters}
      />

      {/* Transfer Candidate Dialog */}
      {transferDialog.isOpen && transferDialog.candidateId && (
        <TransferCandidateDialog
          open={transferDialog.isOpen}
          onOpenChange={(open) => setTransferDialog({ isOpen: open })}
          candidateName={transferDialog.candidateName || "Unknown Candidate"}
          currentRecruiter={transferDialog.currentRecruiter}
          onConfirm={handleTransferCandidate}
          isLoading={isTransferring}
        />
      )}

      <BulkTransferCandidateDialog
        open={bulkTransferDialog}
        onOpenChange={setBulkTransferDialog}
        selectedCount={selectedCandidateIds.size}
        candidates={pageItems
          .filter((c) => selectedCandidateIds.has(c.id))
          .map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
          }))}
        onRemoveCandidate={(id) =>
          setSelectedCandidateIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          })
        }
        onConfirm={handleBulkTransfer}
        isLoading={isBulkTransferring}
      />

      <LogOperationsCallModal
        isOpen={!!callModalState}
        onClose={closeCallModal}
        candidateId={callModalCandidate?.id}
        candidateName={logCallCandidateName}
        callAttempts={logCallAttempts}
        nextAttempt={logCallNextAttempt}
        followUpStage={logCallFollowUpStage}
        canLog={!!canOpenCallModal}
        canLogNoAnswer={!!canLogNoAnswerCall}
        isSubmitting={isLoggingCall}
        isSubmittingReassign={isOperationsTransferring}
        isSubmittingJunk={isMarkingNotInterested}
        currentRecruiterName={logCallRecruiterName}
        currentStatus={logCallCurrentStatus}
        onConfirm={handleLogOperationsCall}
        onReassign={handleInterestedReassign}
        onMarkNotInterested={handleNotInterestedJunk}
      />
    </div>
  );
}
