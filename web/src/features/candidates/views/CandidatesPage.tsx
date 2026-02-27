import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  CalendarDays,
  Phone,
  Mail,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  X,
  ArrowRight,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { ImageViewer, DatePicker } from "@/components/molecules";
import { parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
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
import { toast } from "sonner";




export default function CandidatesPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

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

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    experience: "all",
    // date range filter (date added)
    dateRange: "all" as string,
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    page: 1,
    limit: 20,
  });

  // Fetch candidates - use different API for Recruiter users
  const allCandidatesQuery = useGetCandidatesQuery(
    {
      page: filters.page,
      limit: filters.limit,
      status: filters.status !== "all" ? filters.status : undefined,
      // send server-side date filters as date-only (YYYY-MM-DD) to avoid timezone shifts
      dateFrom: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
      dateTo: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
    },
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
    {
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      // server-side date filtering: send date-only strings (YYYY-MM-DD)
      dateFrom: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
      dateTo: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
    },
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




  // Filter and paginate candidates
  const { filteredCandidates, paginatedCandidates, totalCount } =
    useMemo(() => {
      // Ensure candidates is an array
      if (!Array.isArray(candidates)) {
        console.warn("Candidates data is not an array:", candidates);
        return {
          filteredCandidates: [],
          paginatedCandidates: [],
          totalCount: 0,
        };
      }

      let filtered = candidates;

      if (filters.search) {
        filtered = filtered.filter(
          (candidate) =>
            `${candidate.firstName} ${candidate.lastName}`
              .toLowerCase()
              .includes(filters.search.toLowerCase()) ||
            (candidate.email &&
              candidate.email
                .toLowerCase()
                .includes(filters.search.toLowerCase())) ||
            candidate?.skills?.some((skill: string) =>
              skill.toLowerCase().includes(filters.search.toLowerCase())
            )
        );
      }

      // if (filters.status !== "all") {
      //   filtered = filtered.filter(
      //     (candidate) => candidate.currentStatus === filters.status
      //   );
      // }

      if (filters.experience !== "all") {
        const experienceMap: { [key: string]: [number, number] } = {
          "0-2": [0, 2],
          "3-5": [3, 5],
          "6-8": [6, 8],
          "9+": [9, 999],
        };
        const [min, max] = experienceMap[filters.experience] || [0, 999];
        filtered = filtered.filter((candidate) => {
          const experience =
            candidate.totalExperience || candidate.experience || 0;
          return experience >= min && experience <= max;
        });
      }

      // Date range filter (client-side fallback)
      if (filters.dateFrom || filters.dateTo) {
        const from = filters.dateFrom ? startOfDay(filters.dateFrom) : null;
        const to = filters.dateTo ? endOfDay(filters.dateTo) : null;
        filtered = filtered.filter((candidate) => {
          const dStr = candidate.createdAt || candidate.updatedAt;
          if (!dStr) return false;
          const d = parseISO(dStr);
          if (from && to) return d >= from && d <= to;
          if (from) return d >= from;
          if (to) return d <= to;
          return true;
        });
      }

      // Note: availability filter removed as it's not in the API interface
      // if (filters.availability !== "all") {
      //   filtered = filtered.filter(
      //     (candidate) => candidate.availability === filters.availability
      //   );
      // }

      // Calculate pagination
      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      const paginated = filtered.slice(startIndex, endIndex);

      return {
        filteredCandidates: filtered,
        paginatedCandidates: paginated,
        totalCount: filtered.length,
      };
    }, [candidates, filters]);

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
      case "rnr":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-yellow-700",
          bgColor: "bg-yellow-100",
          borderColor: "border-yellow-300",
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
      <div className="min-h-screen   p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/90">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to view candidates.
              </CardDescription>
            </CardHeader>
          </Card>
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
    untouched: serverCounts?.untouched ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "untouched").length,
    rnr: serverCounts?.rnr ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "rnr").length,
    onHold: serverCounts?.onHold ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "on hold" || (c?.currentStatus?.statusName || "").toLowerCase() === "on_hold").length,
    interested: serverCounts?.interested ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "interested").length,
    qualified: serverCounts?.qualified ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "qualified").length,
    future: serverCounts?.future ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "future").length,
    deployed: serverCounts?.deployed ?? serverCounts?.working ?? filteredCandidates.filter((c: any) => ((c?.currentStatus?.statusName || "").toLowerCase() === "deployed") || ((c?.currentStatus?.statusName || "").toLowerCase() === "working")).length,
    notInterested: serverCounts?.notInterested ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "not interested" || (c?.currentStatus?.statusName || "").toLowerCase() === "not_interested").length,
    otherEnquiry: serverCounts?.otherEnquiry ?? filteredCandidates.filter((c: any) => (c?.currentStatus?.statusName || "").toLowerCase() === "other enquiry" || (c?.currentStatus?.statusName || "").toLowerCase() === "other_enquiry").length,
  };

  let stats: Stat[] = [
    {
      label: "Assigned to Me",
      value: derivedCounts.totalAssigned,
      subtitle: "Assigned candidates",
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
      label: "Call Back (RNR)",
      value: derivedCounts.rnr,
      subtitle: "Ring not responded",
      icon: Phone,
      statusFilter: "rnr",
      color: "from-orange-500 to-red-500",
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
      label: "Qualified",
      value: derivedCounts.qualified,
      subtitle: "Passed screening",
      icon: CheckCircle,
      statusFilter: "qualified",
      color: "from-emerald-600 to-teal-400",
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
    const onHoldCount = recruiterCounts?.onHold ?? 0;
    const interestedCount = recruiterCounts?.interested ?? 0;
    const qualifiedCount = recruiterCounts?.qualified ?? 0;
    const futureCount = recruiterCounts?.future ?? 0;
    const workingCount = recruiterCounts?.working ?? 0;
    const notInterestedCount = recruiterCounts?.notInterested ?? 0;
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
        label: "Call Back (RNR)",
        value: rnrCount,
        subtitle: "Ring not responded",
        icon: Phone,
        statusFilter: "rnr",
        color: "from-orange-500 to-red-500",
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
        label: "Qualified",
        value: qualifiedCount,
        subtitle: "Passed screening",
        icon: CheckCircle,
        statusFilter: "qualified",
        color: "from-emerald-600 to-teal-400",
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
      const onHoldCount = allCounts?.onHold ?? 0;
      const interestedCount = allCounts?.interested ?? 0;
      const qualifiedCount = allCounts?.qualified ?? 0;
      const futureCount = allCounts?.future ?? 0;
      const workingCount = allCounts?.working ?? 0;
      const notInterestedCount = allCounts?.notInterested ?? 0;
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
          label: "Qualified",
          value: qualifiedCount,
          subtitle: "Passed screening",
          icon: CheckCircle,
          statusFilter: "qualified",
          color: "from-emerald-600 to-teal-400",
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
      case "interested":
        return "Interested";
      case "not_interested":
        return "Not Interested";
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
      case "interested":
        return "Candidates who expressed interest";
      case "not_interested":
        return "Candidates who declined or are not interested";
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

  const { theme } = useTheme();

  return (
    <div className={cn(
      "min-h-screen",
      theme === "dark" ? "bg-black text-white" : "bg-white text-black"
    )}>
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Search & Filters Section */}
        <Card
          className={cn(
            "border-0 shadow-lg",
            theme === "dark" ? "bg-black text-white" : "bg-white/90 text-black"
          )}
        >
          <CardContent>
            <div className={cn(
                theme === "dark" ? "text-white" : "text-black",
                "space-y-6"
              )}>
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${filters.search ? "text-blue-600" : "text-gray-400"
                    }`}
                >
                  <Search
                    className={`h-5 w-5 transition-transform duration-300 ${filters.search ? "scale-110" : "scale-100"
                      }`}
                  />
                </div>
                <Input
                  placeholder="Search candidates by name, skills, or email..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={cn(
                    "pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md",
                    theme === "dark" && "bg-black text-white"
                  )}
                />
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${filters.search ? "ring-2 ring-blue-500/20" : ""
                    }`}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Status Filter */}
                {/* <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Status
                    </span>
                  </div>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 focus:from-white focus:to-white focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-emerald-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          All Status
                        </div>
                      </SelectItem>
                      {[
                        { value: "active", label: "Active", color: "blue" },
                        {
                          value: "interviewing",
                          label: "Interviewing",
                          color: "orange",
                        },
                        { value: "placed", label: "Placed", color: "green" },
                        { value: "rejected", label: "Rejected", color: "red" },
                      ].map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="rounded-lg hover:bg-emerald-50"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 bg-${option.color}-500 rounded-full`}
                            ></div>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}

                {/* Experience Filter */}
                {/* <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Experience
                    </span>
                  </div>
                  <Select
                    value={filters.experience}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        experience: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
                      <SelectValue placeholder="All Experience" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          All Experience
                        </div>
                      </SelectItem>
                      {[
                        { value: "0-2", label: "0-2 years", color: "blue" },
                        { value: "3-5", label: "3-5 years", color: "green" },
                        { value: "6-8", label: "6-8 years", color: "orange" },
                        { value: "9+", label: "9+ years", color: "purple" },
                      ].map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="rounded-lg hover:bg-blue-50"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 bg-${option.color}-500 rounded-full`}
                            ></div>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}

                {/* Add New Candidate Button */}
                {canWriteCandidates && (
                  <Button
                    onClick={() => navigate("/candidates/create")}
                    className="h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    Add New Candidate
                  </Button>
                )}
              </div>

              {/* ── Date Filter Section ── */}
              <div className="border-t border-gray-100 pt-4">
                {/* Row 1: Label + Quick Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-1">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                    <span className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>Date Added</span>
                  </div>

                  {/* Quick preset pills */}
                  {[
                    { key: "all", label: "All" },
                    { key: "today", label: "Today" },
                    { key: "yesterday", label: "Yesterday" },
                    { key: "last7", label: "Last 7 days" },
                    { key: "last30", label: "Last 30 days" },
                    { key: "thisWeek", label: "This week" },
                    { key: "lastWeek", label: "Last week" },
                    { key: "thisMonth", label: "This month" },
                    { key: "custom", label: "Custom" },
                  ].map((preset) => {
                    const isActive = filters.dateRange === preset.key;
                    return (
                      <button
                        key={preset.key}
                        onClick={() => {
                          const today = new Date();
                          let from: Date | undefined = undefined;
                          let to: Date | undefined = undefined;
                          switch (preset.key) {
                            case "today":
                              from = startOfDay(today); to = endOfDay(today); break;
                            case "yesterday": {
                              const y = subDays(today, 1);
                              from = startOfDay(y); to = endOfDay(y); break;
                            }
                            case "thisWeek":
                              from = startOfWeek(today); to = endOfWeek(today); break;
                            case "lastWeek": {
                              const lw = subDays(today, 7);
                              from = startOfWeek(lw); to = endOfWeek(lw); break;
                            }
                            case "last7":
                              from = startOfDay(subDays(today, 6)); to = endOfDay(today); break;
                            case "last30":
                              from = startOfDay(subDays(today, 29)); to = endOfDay(today); break;
                            case "thisMonth":
                              from = startOfMonth(today); to = endOfMonth(today); break;
                            case "custom":
                              from = filters.dateFrom; to = filters.dateTo; break;
                            case "all":
                            default:
                              from = undefined; to = undefined; break;
                          }
                          setFilters((prev) => ({ ...prev, dateRange: preset.key, dateFrom: from, dateTo: to, page: 1 }));
                        }}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200",
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : cn(
                                theme === "dark" ? "bg-black text-white border-slate-700 hover:bg-slate-800 hover:border-slate-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                              )
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Row 2: Custom date pickers (shown when "custom" is selected) + Active range badge */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {/* From / To date pickers — always visible but highlighted when custom */}
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200",
                    filters.dateRange === "custom"
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-gray-200 bg-gray-50/50",
                    theme === "dark" && "bg-black/80 border-slate-700"
                  )}>
                    <span className={cn("text-xs font-medium min-w-[32px]", theme === "dark" ? "text-white" : "text-gray-500")}>From</span>
                    <div className="w-36">
                      <DatePicker
                        value={filters.dateFrom}
                        showTime={false}
                        onChange={(d) =>
                          setFilters((prev) => {
                            let newFrom = d;
                            let newTo = prev.dateTo;
                            if (newFrom && newTo && newFrom > newTo) {
                              newTo = newFrom;
                            }
                            const newRange = newFrom || newTo ? "custom" : "all";
                            return { ...prev, dateFrom: newFrom, dateTo: newTo, dateRange: newRange, page: 1 };
                          })
                        }
                        placeholder="Start date"
                        compact
                        className={theme === "dark" ? "bg-black text-white" : ""}
                      />
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 mx-1" />

                    <span className={cn("text-xs font-medium min-w-[20px]", theme === "dark" ? "text-white" : "text-gray-500")}>To</span>
                    <div className="w-36">
                      <DatePicker
                        value={filters.dateTo}
                        showTime={false}
                        onChange={(d) =>
                          setFilters((prev) => {
                            let newTo = d;
                            let newFrom = prev.dateFrom;
                            if (newFrom && newTo && newTo < newFrom) {
                              newFrom = newTo;
                            }
                            const newRange = newFrom || newTo ? "custom" : "all";
                            return { ...prev, dateFrom: newFrom, dateTo: newTo, dateRange: newRange, page: 1 };
                          })
                        }
                        placeholder="End date"
                        compact
                        disabled={!filters.dateFrom}
                        className={theme === "dark" ? "bg-black text-white" : ""}
                      />
                    </div>
                  </div>

                  {/* Active range badge */}
                  {filters.dateRange !== "all" && filters.dateFrom && filters.dateTo && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {format(filters.dateFrom, "dd MMM yyyy")} — {format(filters.dateTo, "dd MMM yyyy")}
                      </span>
                      <button
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            dateFrom: undefined,
                            dateTo: undefined,
                            dateRange: "all",
                            page: 1,
                          }))
                        }
                        className="p-0.5 rounded-full hover:bg-blue-100 transition-colors"
                      >
                          <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Dashboard (uses real data, not mocks) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const gradientMap: Record<
              string,
              { bg: string; iconBg: string; text: string }
            > = {
              "from-blue-500 to-cyan-500": {
                bg: "from-blue-50 to-blue-100/50",
                iconBg: "bg-blue-200/40",
                text: "text-blue-600",
              },
              "from-emerald-500 to-teal-500": {
                bg: "from-emerald-50 to-emerald-100/50",
                iconBg: "bg-emerald-200/40",
                text: "text-emerald-600",
              },
              "from-purple-500 to-pink-500": {
                bg: "from-purple-50 to-purple-100/50",
                iconBg: "bg-purple-200/40",
                text: "text-purple-600",
              },
              "from-orange-500 to-red-500": {
                bg: "from-orange-50 to-orange-100/50",
                iconBg: "bg-orange-200/40",
                text: "text-orange-600",
              },
              "from-lime-400 to-green-500": {
                bg: "from-lime-50 to-green-100/50",
                iconBg: "bg-lime-200/40",
                text: "text-lime-700",
              },
              "from-emerald-600 to-teal-400": {
                bg: "from-emerald-50 to-teal-100/50",
                iconBg: "bg-emerald-200/40",
                text: "text-emerald-700",
              },
              "from-indigo-500 to-violet-500": {
                bg: "from-indigo-50 to-violet-100/50",
                iconBg: "bg-indigo-200/40",
                text: "text-indigo-700",
              },
              "from-fuchsia-500 to-pink-400": {
                bg: "from-fuchsia-50 to-pink-100/50",
                iconBg: "bg-fuchsia-200/40",
                text: "text-fuchsia-700",
              },
              "from-slate-500 to-stone-400": {
                bg: "from-slate-50 to-stone-100/50",
                iconBg: "bg-slate-200/40",
                text: "text-slate-700",
              },
              "from-yellow-400 to-amber-400": {
                bg: "from-yellow-50 to-amber-100/50",
                iconBg: "bg-yellow-200/40",
                text: "text-amber-700",
              },
              "from-green-500 to-emerald-500": {
                bg: "from-green-50 to-emerald-100/50",
                iconBg: "bg-green-200/40",
                text: "text-emerald-700",
              },
              "from-teal-500 to-emerald-500": {
                bg: "from-teal-50 to-emerald-100/50",
                iconBg: "bg-teal-200/40",
                text: "text-teal-700",
              },
              "from-indigo-500 to-purple-500": {
                bg: "from-indigo-50 to-purple-100/50",
                iconBg: "bg-indigo-200/40",
                text: "text-indigo-700",
              },
              "from-emerald-500 to-lime-500": {
                bg: "from-emerald-50 to-lime-100/50",
                iconBg: "bg-emerald-200/40",
                text: "text-emerald-700",
              },
            };
            const colors = gradientMap[stat.color];

            const isInteractive = Boolean(stat.statusFilter);
            const isActive = isInteractive && filters.status === stat.statusFilter;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 + i * 0.08 }}
              >
                <Card
                  onClick={() => isInteractive && handleTileClick(stat.statusFilter)}
                  onKeyDown={(e) => {
                    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
                      handleTileClick(stat.statusFilter);
                    }
                  }}
                  role={isInteractive ? "button" : undefined}
                  tabIndex={isInteractive ? 0 : undefined}
                  className={cn(
                    "border-0 shadow-sm",
                    theme === "dark"
                      ? "bg-slate-800 text-white"
                      : `bg-gradient-to-br ${colors.bg}`,
                    "backdrop-blur-sm transition-all duration-200",
                    isInteractive && "cursor-pointer hover:shadow-sm transform hover:-translate-y-0.5",
                    isActive && "ring-2 ring-blue-500/30"
                  )}
                >
                  <CardContent className="pt-1 pb-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn("text-[10px] font-medium mb-0.5", theme === "dark" ? "text-white" : "text-slate-600")}>
                          {stat.label}
                        </p>
                        <h3 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : colors.text)}>
                          {stat.value}
                        </h3>
                        <p className={cn("text-[9px] mt-0.5", theme === "dark" ? "text-white" : "text-slate-500")}>
                          {stat.subtitle}
                        </p>
                      </div>

                      <div className={`p-0.5 ${colors.iconBg} rounded-full`}>
                        <Icon className={`h-3 w-3 ${colors.text}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Candidates Table */}
        <Card
          className={cn(
            "border-0 shadow-lg",
            theme === "dark" ? "bg-black text-white" : "bg-white/90"
          )}
        >
          <CardHeader className={theme === "dark" ? "bg-black text-white" : ""}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle
                  className={cn(
                    "text-lg font-semibold",
                    theme === "dark" ? "text-white" : "text-slate-800"
                  )}
                >
                  {getTableTitle()}
                </CardTitle>
                <CardDescription
                  className={theme === "dark" ? "text-white" : "text-slate-600"}
                >
                  {getTableSubtitle()} • {Array.isArray(filteredCandidates) ? filteredCandidates.length : 0}{" "}
                  candidates found
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Premium Table Container */}
            <div
              className={cn(
                "rounded-xl border shadow-sm overflow-hidden",
                theme === "dark"
                  ? "bg-black text-white border-slate-700"
                  : "border-gray-200 bg-white"
              )}
            >
              {/* Beautiful Header */}
              <div
                className={cn(
                  "border-b px-6 py-4",
                  theme === "dark"
                    ? "bg-black text-white border-slate-700"
                    : "border-gray-200 bg-gray-50/70"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Colorful Gradient Icon Background */}
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-purple-500/20">
                    <Users className="h-7 w-7 text-white" />
                  </div>

                  <div className="flex-1">
                    <h4 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-900")}>
                      {getTableTitle()}
                    </h4>
                    <p className={cn("text-sm mt-1 font-medium", theme === "dark" ? "text-white" : "text-gray-600")}>
                      {getTableSubtitle()} — {Array.isArray(filteredCandidates) ? filteredCandidates.length : 0}{" "}
                      candidate{filteredCandidates?.length !== 1 ? "s" : ""} in
                      total
                    </p>
                  </div>

                  {/* Active date badge (quick reference in table header) */}
                  {filters.dateRange !== "all" && filters.dateFrom && filters.dateTo && (
                    <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {format(filters.dateFrom, "dd MMM")} — {format(filters.dateTo, "dd MMM yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              <Table className={theme === "dark" ? "text-white" : ""}>
                <TableHeader className="sticky">
                  <TableRow
                    className={cn(
                      "border-b",
                      theme === "dark"
                        ? "bg-black border-slate-700"
                        : "bg-gray-50/50 border-gray-200"
                    )}
                  >
                    <TableHead
                      className={cn(
                        "h-11 px-6 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-600"
                      )}
                    >
                      Candidate
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-11 px-6 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-600"
                      )}
                    >
                      Recruiter
                    </TableHead>
                    {/* Skills column removed */}
                    <TableHead
                      className={cn(
                        "h-11 px-6 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-600"
                      )}
                    >
                      Status
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-11 px-6 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-600"
                      )}
                    >
                      Last Updated
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-11 px-6 text-center text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-600"
                      )}
                    >
                      Contact
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-11 px-6 text-right text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-600"
                      )}
                    >
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {Array.isArray(paginatedCandidates) &&
                    paginatedCandidates.map((candidate) => {
                      const statusName = candidate.currentStatus?.statusName ?? "";
                      const statusInfo = getStatusInfo(statusName);
                      const StatusIcon = statusInfo.icon;

                      // Determine active recruiter assignment
                      const activeAssignment = (candidate.recruiterAssignments || [])?.find((a: any) => a.isActive);
                      const recruiter = activeAssignment?.recruiter || (candidate as any).recruiter || null;

                      return (
                        <TableRow
                          key={candidate.id}
                          className={cn(
                            "border-b transition-colors last:border-b-0",
                            theme === "dark"
                              ? "border-slate-700 hover:bg-slate-800"
                              : "border-gray-100 hover:bg-gray-50/70"
                          )}
                        >
                          {/* Candidate */}
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              {/* FULL VIBRANT COLOR AVATAR */}
                              <ImageViewer
                                title={`${candidate.firstName} ${candidate.lastName}`}
                                src={candidate.profileImage || null}
                                fallbackSrc={
                                  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                }
                                className="h-11 w-11 rounded-full"
                                ariaLabel={`View full image for ${candidate.firstName} ${candidate.lastName}`}
                                enableHoverPreview={true} /* show hover preview on desktop */
                              />

                              <div className="flex-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/candidates/${candidate.id}`);
                                  }}
                                  className={cn(
                                    "font-semibold hover:underline transition-all duration-200",
                                    theme === "dark"
                                      ? "text-white hover:text-blue-400"
                                      : "text-gray-900 hover:text-blue-600"
                                  )}
                                >
                                  {candidate.firstName} {candidate.lastName}
                                </button>
                                <div className={cn(
                                  "text-sm mt-1 font-medium",
                                  theme === "dark" ? "text-slate-300" : "text-slate-500"
                                )}>
                                  {candidate.currentRole || ""}
                                </div>

                                {/* Contact moved below profile */}
                                <div className={cn(
                                  "text-sm mt-2 space-y-1",
                                  theme === "dark" ? "text-slate-300" : "text-slate-500"
                                )}>
                                  {candidate.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                                      <span className={theme === "dark" ? "text-white" : "text-gray-700"}>{candidate.email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                    <span className={theme === "dark" ? "text-white" : "text-gray-700"}>{candidate.countryCode} {candidate.mobileNumber}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Recruiter */}
                          <TableCell className="px-6 py-5">
                            <div className="text-sm">
                              {recruiter ? (
                                <div className="space-y-1">
                                  <div className={cn("font-medium", theme === "dark" ? "text-white" : "text-slate-900")}>{recruiter.name}</div>
                                  {recruiter.email && (
                                    <div className={cn("flex items-center gap-2 text-sm", theme === "dark" ? "text-slate-300" : "text-slate-700") }>
                                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                                      <span className={theme === "dark" ? "text-white" : ""}>{recruiter.email}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className={theme === "dark" ? "text-slate-300" : "text-slate-500"}>Unassigned</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Skills cell removed */}

                          {/* Status Column (single source of truth) */}
                          {/* Status Column */}
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-2.5">
                              {/* Colored icon in a tiny circle */}
                              <div
                                className={`p-1.5 rounded-full ${statusInfo.bgColor}`}
                              >
                                <StatusIcon
                                  className={`h-4 w-4 ${statusInfo.textColor.replace(
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
                        text-xs 
                        px-2.5 py-1
                      `}
                              >
                                {candidate.currentStatus?.statusName || "Unknown"}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Last Updated */}
                          <TableCell className="px-6 py-5">
                            <div className={cn("flex items-center gap-2 text-sm", theme === "dark" ? "text-white" : "text-gray-600") }>
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {formatDate(candidate.updatedAt)}
                            </div>
                          </TableCell>

                          {/* Contact */}
                          <TableCell className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {(() => {
                                const phoneDigits = formatPhoneForLink(candidate);
                                return (
                                  <>
                                    <Button
                                      variant="ghost"
                                      className={cn(
                                        "h-8 w-8 p-0 rounded-full flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-40 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-200",
                                        "text-green-600 border border-green-100/50 hover:bg-green-100 hover:text-green-700",
                                        theme === "dark" && "bg-white"
                                      )}
                                      onClick={() =>
                                        phoneDigits &&
                                        window.open(`https://wa.me/${phoneDigits}`, "_blank")
                                      }
                                      disabled={!phoneDigits}
                                      title={`WhatsApp ${candidate.firstName || ""}`}
                                      aria-label={`WhatsApp ${candidate.firstName || ""}`}
                                    >
                                      <FaWhatsapp className="h-5 w-5" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      className={cn(
                                        "h-8 w-8 p-0 rounded-full flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-40 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-200",
                                        "text-blue-600 border border-blue-100/50 hover:bg-blue-100 hover:text-blue-700",
                                        theme === "dark" && "bg-white"
                                      )}
                                      onClick={() =>
                                        phoneDigits && (window.location.href = `tel:${phoneDigits}`)
                                      }
                                      disabled={!phoneDigits}
                                      title={`Call ${candidate.firstName || ""}`}
                                      aria-label={`Call ${candidate.firstName || ""}`}
                                    >
                                      <Phone className="h-5 w-5" />
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="px-6 py-5 text-right">
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
                                {canWriteCandidates && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(
                                          `/candidates/${candidate.id}/edit`
                                        )
                                      }
                                    >
                                      <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </>
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

              {/* Empty State - Your Original */}
              {Array.isArray(filteredCandidates) &&
                filteredCandidates.length === 0 && (
                  <div className="text-center py-12">
                    <UserCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">
                      No candidates found
                    </h3>
                    <p className="text-slate-500 mb-6">
                      {filters.search ||
                        filters.status !== "all" ||
                        filters.experience !== "all"
                        ? "Try adjusting your search criteria or filters."
                        : "Get started by adding your first candidate."}
                    </p>
                    {!filters.search &&
                      filters.status === "all" &&
                      filters.experience === "all" &&
                      canWriteCandidates && (
                        <Button
                          onClick={() => navigate("/candidates/create")}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Your First Candidate
                        </Button>
                      )}
                  </div>
                )}
            </div>

            {/* Pagination - Your Original */}
            {Array.isArray(filteredCandidates) &&
              filteredCandidates.length > 0 && (
                <Card
              className={cn(
                "mt-4 border-0 shadow-lg",
                theme === "dark" ? "bg-black text-white" : "bg-white/90"
              )}
            >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className={cn("text-sm", theme === "dark" ? "text-white" : "text-slate-600")}>
                        Showing {(filters.page - 1) * filters.limit + 1} to{" "}
                        {Math.min(filters.page * filters.limit, totalCount)} of{" "}
                        {totalCount} candidates
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              page: Math.max(1, prev.page - 1),
                            }))
                          }
                          disabled={filters.page === 1}
                          className="h-9 px-3"
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.ceil(totalCount / filters.limit) },
                            (_, i) => i + 1
                          )
                            .filter((pageNum) => {
                              const totalPages = Math.ceil(
                                totalCount / filters.limit
                              );
                              return (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= filters.page - 1 &&
                                  pageNum <= filters.page + 1)
                              );
                            })
                            .map((pageNum, idx, arr) => {
                              const prevPageNum = arr[idx - 1];
                              const showEllipsis =
                                prevPageNum && pageNum - prevPageNum > 1;

                              return (
                                <div
                                  key={pageNum}
                                  className="flex items-center"
                                >
                                  {showEllipsis && (
                                    <span className="px-2 text-slate-400">
                                      ...
                                    </span>
                                  )}
                                  <Button
                                    variant={
                                      filters.page === pageNum
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      setFilters((prev) => ({
                                        ...prev,
                                        page: pageNum,
                                      }))
                                    }
                                    className={`h-9 w-9 p-0 ${filters.page === pageNum
                                      ? "bg-blue-600 hover:bg-blue-700"
                                      : ""
                                      }`}
                                  >
                                    {pageNum}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              page: Math.min(
                                Math.ceil(totalCount / filters.limit),
                                prev.page + 1
                              ),
                            }))
                          }
                          disabled={
                            filters.page >=
                            Math.ceil(totalCount / filters.limit)
                          }
                          className="h-9 px-3"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </CardContent>
        </Card>
      </div>

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
