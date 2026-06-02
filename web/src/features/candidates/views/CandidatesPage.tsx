import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  SlidersHorizontal,
  FilterX,
  UserX,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { CandidateListIdentityCell, ImageViewer } from "@/components/molecules";
import { format } from "date-fns";
import { useCan } from "@/hooks/useCan";
import {
  useGetCandidatesQuery,
  useGetRecruiterMyCandidatesQuery,
  useTransferCandidateMutation,
  type RecruiterMyCandidatesResponse,
  type AllCandidatesResponse,
} from "@/features/candidates";
import { useAppSelector } from "@/app/hooks";
import { motion } from "framer-motion";
import { TransferCandidateDialog } from "../components/TransferCandidateDialog";
import { AdvancedFiltersSheet } from "../components/AdvancedFiltersSheet";
import { CandidateProfileCompletionCell } from "../components/CandidateProfileCompletion";
import { toast } from "sonner";
import { getCandidateOperationsState } from "../utils/operations-candidate";




export default function CandidatesPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const tableRef = useRef<HTMLDivElement>(null);

  // Check if user is a recruiter (non-manager)
  const isRecruiter = user?.roles?.includes("Recruiter");
  const isManager = user?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Team Head", "Team Lead"].includes(role)
  );
  // All roles can read candidates
  const canReadCandidates = true;
  const canWriteCandidates = useCan("write:candidates");
  const canTransferCandidates = user?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Team Head", "Team Lead"].includes(role)
  );

  // Transfer candidate state
  const [transferDialog, setTransferDialog] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
    currentRecruiter?: { id: string; name?: string; email?: string } | null;
  }>({ isOpen: false });

  const [transferCandidate, { isLoading: isTransferring }] = useTransferCandidateMutation();

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
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

  // Helper to create sanitized digits-only phone string for tel/WhatsApp links
  const formatPhoneForLink = (c: any) => {
    const raw = String(c?.countryCode ?? "") + String(c?.mobileNumber ?? c?.mobile ?? c?.contact ?? "");
    const digits = raw.replace(/\D/g, "");
    return digits || null;
  };



  // Get status badge variant and icon
  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "untouched":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-gray-700",
          bgColor: "bg-gray-100",
          borderColor: "border-gray-300",
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
          textColor: "text-slate-700",
          bgColor: "bg-slate-100",
          borderColor: "border-slate-300",
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
      case "callback":
        return {
          variant: "secondary" as const,
          icon: Phone,
          textColor: "text-sky-700",
          bgColor: "bg-sky-100",
          borderColor: "border-sky-300",
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
      case "callback":
        return {
          variant: "outline" as const,
          icon: Phone,
          textColor: "text-amber-700",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
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
          textColor: "text-gray-700",
          bgColor: "bg-gray-100",
          borderColor: "border-gray-300",
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 text-sm">You don't have permission to view candidates.</p>
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
    callback: serverCounts?.callback ?? candidates.filter((c: any) => {
      const status = (c?.currentStatus?.statusName || "").toLowerCase();
      return status === "callback" || status === "call back" || status === "call_back";
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
      label: "Ring Not Responded (RNR)",
      value: derivedCounts.rnr,
      subtitle: derivedCounts.rnrHandledByCRE > 0 ? `${derivedCounts.rnrHandledByCRE} with Operations handler` : "Ring not responded",
      icon: Phone,
      statusFilter: "rnr",
      color: "from-orange-500 to-red-500",
    },
    {
      label: "Call Back",
      value: derivedCounts.callback,
      subtitle: "Scheduled callback follow-ups",
      icon: Phone,
      statusFilter: "callback",
      color: "from-sky-500 to-cyan-500",
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
    const callbackCount = recruiterCounts?.callback ?? candidates.filter((c: any) => {
      const status = (c?.currentStatus?.statusName || "").toLowerCase();
      return status === "callback" || status === "call back" || status === "call_back";
    }).length;
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
        value: callbackCount,
        subtitle: "Scheduled callback follow-ups",
        icon: Phone,
        statusFilter: "callback",
        color: "from-sky-500 to-cyan-500",
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
      const callbackCount = allCounts?.callback ?? 0;
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
          label: "Call Back (RNR)",
          value: rnrCount,
          subtitle: "Ring not responded",
          icon: Phone,
          statusFilter: "rnr",
          color: "from-orange-500 to-red-500",
        },
        {
          label: "Call Back",
          value: callbackCount,
          subtitle: "Scheduled callback follow-ups",
          icon: Phone,
          statusFilter: "callback",
          color: "from-sky-500 to-cyan-500",
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
        return "Call Back (RNR)";
      case "callback":
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
        return "Candidates to call back (no response)";
      case "callback":
        return "Candidates with scheduled callback follow-ups";
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search candidates by name, skills, or email…"
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsFilterSheetOpen(true)}
                className="flex items-center gap-2 h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium"
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
                <SelectTrigger className="h-9 text-sm border-slate-200 rounded-xl bg-white min-w-[130px]">
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
          const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
            blue:    { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",       icon: "text-blue-600",    iconBg: "bg-blue-100",    value: "text-blue-700",    ring: "ring-blue-400/50",    dot: "bg-blue-500"    },
            emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
            orange:  { card: "from-orange-50 via-white to-orange-50/30 border-orange-100", icon: "text-orange-600",   iconBg: "bg-orange-100",  value: "text-orange-700",  ring: "ring-orange-400/50",  dot: "bg-orange-500"  },
            purple:  { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600",   iconBg: "bg-purple-100",  value: "text-purple-700",  ring: "ring-purple-400/50",  dot: "bg-purple-500"  },
            lime:    { card: "from-lime-50 via-white to-lime-50/30 border-lime-100",       icon: "text-lime-700",    iconBg: "bg-lime-100",    value: "text-lime-700",    ring: "ring-lime-400/50",    dot: "bg-lime-500"    },
            indigo:  { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100", icon: "text-indigo-600",   iconBg: "bg-indigo-100",  value: "text-indigo-700",  ring: "ring-indigo-400/50",  dot: "bg-indigo-500"  },
            teal:    { card: "from-teal-50 via-white to-teal-50/30 border-teal-100",       icon: "text-teal-600",    iconBg: "bg-teal-100",    value: "text-teal-700",    ring: "ring-teal-400/50",    dot: "bg-teal-500"    },
            slate:   { card: "from-slate-50 via-white to-slate-50/30 border-slate-200",    icon: "text-slate-600",   iconBg: "bg-slate-100",   value: "text-slate-700",   ring: "ring-slate-400/50",   dot: "bg-slate-500"   },
            amber:   { card: "from-amber-50 via-white to-amber-50/30 border-amber-100",   icon: "text-amber-600",   iconBg: "bg-amber-100",   value: "text-amber-700",   ring: "ring-amber-400/50",   dot: "bg-amber-500"   },
            rose:    { card: "from-rose-50 via-white to-rose-50/30 border-rose-100",       icon: "text-rose-600",    iconBg: "bg-rose-100",    value: "text-rose-700",    ring: "ring-rose-400/50",    dot: "bg-rose-500"    },
          };
          const statusToAccent: Record<string, string> = {
            all: "blue", untouched: "emerald", rnr: "orange", on_hold: "purple",
            interested: "lime", future: "indigo", deployed: "teal",
            not_interested: "slate", not_eligible: "rose", other_enquiry: "amber",
          };
          return (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                const accent = statusToAccent[stat.statusFilter ?? ""] ?? "blue";
                const s = accentStyles[accent];
                const isInteractive = Boolean(stat.statusFilter);
                const isActive = isInteractive && filters.status === stat.statusFilter;
                return (
                  <motion.button
                    key={stat.label}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => isInteractive && handleTileClick(stat.statusFilter)}
                    className={cn(
                      "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                      s.card,
                      isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
                    )}
                  >
                    {isActive && <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                        <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{stat.value}</p>
                        <p className="text-xs text-slate-500">{stat.subtitle}</p>
                      </div>
                      <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                        <Icon className={cn("h-5 w-5", s.icon)} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                      <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          );
        })()}

        {/* Candidates Table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Table Header Bar */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 truncate">{getTableTitle()}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{getTableSubtitle()} — {totalCount} candidate{totalCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Table Container */}
          <div ref={tableRef} className="overflow-hidden">

              {/* Table */}
              <Table>
                <TableHeader className="sticky">
                  <TableRow className="bg-slate-50/80 border-b border-gray-200 hover:bg-slate-50/80">
                    <TableHead className="h-10 min-w-[14rem] whitespace-normal px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Candidate
                    </TableHead>
                    <TableHead className="h-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Contact
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Recruiter
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Created By
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Created At
                    </TableHead>
                    {/* Skills column removed */}
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Status
                    </TableHead>
                    <TableHead className="h-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Profile
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Last Updated
                    </TableHead>
                  
                    <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {Array.isArray(pageItems) &&
                    pageItems.map((candidate) => {
                      const statusName = candidate.currentStatus?.statusName ?? "";
                      const statusInfo = getStatusInfo(statusName);
                      const StatusIcon = statusInfo.icon;

                      // Determine active recruiter assignment
                      const activeAssignment = (candidate.recruiterAssignments || [])?.find((a: any) => a.isActive);
                      const recruiter = activeAssignment?.recruiter || (candidate as any).recruiter || null;
                      const operations = getCandidateOperationsState(candidate);

                      return (
                        <TableRow
                          key={candidate.id}
                          className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors last:border-b-0"
                        >
                          {/* Candidate */}
                          <TableCell className="min-w-[14rem] whitespace-normal align-top px-4 py-3">
                            <div className="flex items-start gap-3">
                              {/* FULL VIBRANT COLOR AVATAR */}
                              <ImageViewer
                                title={`${candidate.firstName} ${candidate.lastName}`}
                                src={candidate.profileImage || null}
                                fallbackSrc={
                                  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                }
                                className="h-10 w-10 shrink-0 rounded-full"
                                ariaLabel={`View full image for ${candidate.firstName} ${candidate.lastName}`}
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
                                const phoneDigits = formatPhoneForLink(candidate);
                                return (
                                  <>
                                    <Button
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 shadow-sm border border-green-100/50"
                                      onClick={() =>
                                        phoneDigits &&
                                        window.open(`https://wa.me/${phoneDigits}`, "_blank")
                                      }
                                      disabled={!phoneDigits}
                                      title={`WhatsApp ${candidate.firstName || ""}`}
                                    >
                                      <FaWhatsapp className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-full text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm border border-blue-100/50"
                                      onClick={() =>
                                        phoneDigits && (window.location.href = `tel:${phoneDigits}`)
                                      }
                                      disabled={!phoneDigits}
                                      title={`Call ${candidate.firstName || ""}`}
                                    >
                                      <Phone className="h-4 w-4" />
                                    </Button>
                                  </>
                                );
                                })()}
                              </div>

                              <div className="w-full min-w-0 text-center text-xs text-slate-500 space-y-1">
                                {candidate.email ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-700 truncate max-w-[220px]">
                                      {candidate.email}
                                    </span>
                                  </div>
                                ) : null}
                                <div className="flex items-center justify-center gap-1.5">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-700 truncate max-w-[220px]">
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
                                    <span className="font-medium text-slate-900">{recruiter.name}</span>
                                  </div>
                                  {recruiter.email && (
                                    <div className="flex items-center gap-1.5 text-slate-700">
                                      <Mail className="h-3 w-3 text-gray-400" />
                                      <span className="truncate max-w-[120px]">{recruiter.email}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500">Unassigned</span>
                              )}
                            </div>
                          </TableCell>

                        {/* Created By */}
                        <TableCell className="px-4 py-3">
                          <div className="text-xs">
                            {(candidate as any).createdBy || activeAssignment?.createdByUser ? (
                              <div className="space-y-0.5">
                                <div className="font-medium text-slate-900">
                                  {((candidate as any).createdBy?.name || activeAssignment?.createdByUser?.name)}
                                </div>
                                {((candidate as any).createdBy?.email || activeAssignment?.createdByUser?.email) && (
                                  <div className="flex items-center gap-1.5 text-slate-700">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <span className="truncate max-w-[120px]">
                                      {((candidate as any).createdBy?.email || activeAssignment?.createdByUser?.email)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[10px]">System / Admin</span>
                            )}
                          </div>
                        </TableCell>

                          {/* Created At */}
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              {formatDateTime(candidate.createdAt)}
                            </div>
                          </TableCell>

                          {/* Status Column (single source of truth) */}
                          <TableCell className="px-4 py-3">
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
                          </TableCell>

                          <TableCell className="px-2 py-3 w-[4.5rem] text-center">
                            <CandidateProfileCompletionCell candidate={candidate} />
                          </TableCell>

                          {/* Last Updated */}
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
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
                                {canTransferCandidates && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const currentRecruiter = candidate.recruiter || candidate.recruiterAssignments?.find((a: any) => a.isActive)?.recruiter || null;
                                        setTransferDialog({
                                          isOpen: true,
                                          candidateId: candidate.id,
                                          candidateName: `${candidate.firstName} ${candidate.lastName}`,
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
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <UserCheck className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-600">No candidates found</p>
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
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{(filters.page - 1) * filters.limit + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(filters.page * filters.limit, totalCount)}</span> of <span className="font-semibold text-slate-700">{totalCount}</span> candidates
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={filters.page === 1}
                    className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
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
                            className={cn("h-8 w-8 p-0 text-xs", filters.page === p ? "bg-blue-600 hover:bg-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
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
                    className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
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
    </div>
  );
}
