import { useNavigate } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertCircle, Eye, Search, ChevronLeft, ChevronRight, CalendarDays, Phone, Mail, RefreshCw, ArrowUpRight, PlusCircle, SlidersHorizontal, FilterX, CalendarClock, Clock } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { PAGE_SHELL_GRADIENT_BLUE } from "@/lib/page-shell-styles";
import { ConvertCandidateModal } from "@/components/molecules/ConvertCandidateModal";
import { useGetMyAssignedCandidatesQuery, useGetOperationsAssignedSummaryQuery, useGetOperationsReassignedCandidatesQuery, useGetUserCandidatesQuery, useMarkCandidateConvertedMutation, useTransferCandidateToRecruiterMutation, useLogOperationsCallMutation, useMarkOperationsNotInterestedMutation } from "@/services/candidatesApi";
import { useAppSelector } from "@/app/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdvancedFiltersSheet } from "@/features/candidates/components/AdvancedFiltersSheet";
import { LogOperationsCallModal } from "@/features/candidates/components/LogOperationsCallModal";
import {
  canLogNoAnswerOperationsCall,
  canOpenOperationsCallModal,
  formatOperationsCallCountLabel,
  formatOperationsStageEnteredAt,
  formatOperationsWeekOneFollowUpAt,
  formatOperationsWaitRemaining,
  getOperationsHandlerAssignment,
  getDashboardOperationsCallAttempts,
  getDashboardOperationsFollowUpStage,
  getDisplayedOperationsCallAttempts,
  getOperationsCallAttempts,
  getOperationsCallPillClassName,
  getOperationsFollowUpStage,
  getPrimaryRecruiterName,
  getOperationsStageWaitRemainingMs,
  isWaitingBeforeWeekOneBucket,
  isWaitingToMarkOperationsJunk,
  isWaitingToMoveToWeekTwo,
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_WEEK_ONE_WAIT_MS,
  OPERATIONS_WEEK_TWO_WAIT_MS,
} from "@/features/candidates/utils/operations-follow-up.util";

export default function OperationsDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [callCountFilter, setCallCountFilter] = useState<string>("all");
  const limitCount = 10;

  const callCountFilterOptions = useMemo(
    () => [
      { value: "all", label: "All call counts" },
      {
        value: "0",
        label: `No calls`,
      },
      {
        value: "1",
        label: `One call`,
      },
      {
        value: "2",
        label: `2 call`,
      },
      {
        value: "3",
        label: `3 call`,
      },
    ],
    [],
  );

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
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
    limit: limitCount,
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  const listRequestPayload = useMemo(() => ({
    page: filters.page,
    limit: limitCount,
    search: debouncedSearch || undefined,
    operationsCallAttempts:
      callCountFilter !== "all" ? Number(callCountFilter) : undefined,
    dateFilter: filters.dateFilter !== "all" ? filters.dateFilter : undefined,
    dateFrom: filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : undefined,
    dateTo: filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : undefined,
    gender: filters.gender === "all" ? undefined : filters.gender,
    sources: filters.sources.length > 0 ? filters.sources : undefined,
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
  }), [debouncedSearch, filters, callCountFilter]);

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
      limit: limitCount,
    });
    setFilters((f) => ({ ...f, page: 1 }));
  };

  // Fetch only candidates assigned to this Operations user with optional status filter
  const assignedCandidatesQuery = useGetMyAssignedCandidatesQuery({
    ...listRequestPayload,
    currentStatus: (statusFilter === 'reassigned' || statusFilter === 'created') ? undefined : statusFilter,
  });

  const reassignedCandidatesQuery = useGetOperationsReassignedCandidatesQuery(listRequestPayload);

  const createdCandidatesQuery = useGetUserCandidatesQuery(listRequestPayload);

  const isLoading =
    statusFilter === 'reassigned' ? reassignedCandidatesQuery.isLoading
    : statusFilter === 'created' ? createdCandidatesQuery.isLoading
    : assignedCandidatesQuery.isLoading;
  const assignedCandidatesData =
    statusFilter === 'reassigned' ? reassignedCandidatesQuery.data
    : statusFilter === 'created' ? createdCandidatesQuery.data
    : assignedCandidatesQuery.data;
  const refetch =
    statusFilter === 'reassigned' ? reassignedCandidatesQuery.refetch
    : statusFilter === 'created' ? createdCandidatesQuery.refetch
    : assignedCandidatesQuery.refetch;

  // Reset to page 1 when debounced search changes
  useEffect(() => {
    setFilters((f) => ({ ...f, page: 1 }));
  }, [debouncedSearch]);

  const candidates = assignedCandidatesData?.data || [];
  const totalCount = assignedCandidatesData?.total || 0;
  const totalPages = assignedCandidatesData?.totalPages || 0;

  const { data: summaryData, refetch: refetchSummary } =
    useGetOperationsAssignedSummaryQuery();
  const [markCandidateConverted, { isLoading: isConverting }] = useMarkCandidateConvertedMutation();
  const [transferCandidateToRecruiter, { isLoading: isTransferring }] = useTransferCandidateToRecruiterMutation();
  const [logOperationsCall, { isLoading: isLoggingCall }] = useLogOperationsCallMutation();
  const [markOperationsNotInterested, { isLoading: isMarkingNotInterested }] =
    useMarkOperationsNotInterestedMutation();

  const [callModalState, setCallModalState] = useState<{
    candidate: any;
    mode: "log" | "history";
  } | null>(null);
  const [followUpNow, setFollowUpNow] = useState(() => Date.now());

  const callModalCandidate = callModalState?.candidate;
  const logCallCandidateName = callModalCandidate
    ? `${callModalCandidate.firstName || ""} ${callModalCandidate.lastName || ""}`.trim() ||
      "Selected candidate"
    : "";
  const logCallAssignment = callModalCandidate
    ? getOperationsHandlerAssignment(callModalCandidate.recruiterAssignments, user?.id)
    : undefined;
  const logCallAttempts = getOperationsCallAttempts(logCallAssignment);
  const logCallFollowUpStage = getOperationsFollowUpStage(logCallAssignment);
  const logCallNextAttempt = logCallAttempts + 1;
  const canOpenCallModal =
    callModalState?.mode === "log" &&
    canOpenOperationsCallModal(logCallFollowUpStage);
  const canLogNoAnswerCall =
    callModalState?.mode === "log" &&
    canLogNoAnswerOperationsCall(logCallFollowUpStage, logCallAttempts);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setFollowUpNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [candidateToConvert, setCandidateToConvert] = useState<any>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [candidateToTransfer, setCandidateToTransfer] = useState<any>(null);
  const [currentRecruiterForTransfer, setCurrentRecruiterForTransfer] = useState<string>('');

  const assignedCount = summaryData?.total ?? totalCount;
  const reassignedCount = summaryData?.roleCounters?.reassigned ?? 0;
  const junkCount = summaryData?.roleCounters?.junk ?? 0;
  const weekOneCount = summaryData?.roleCounters?.weekOne ?? 0;
  const weekTwoCount = summaryData?.roleCounters?.weekTwo ?? 0;
  const createdCount = summaryData?.roleCounters?.created ?? createdCandidatesQuery.data?.total ?? 0;
 

  const statusLabel =
    statusFilter === undefined
      ? 'Assigned'
      : statusFilter === 'interested'
      ? 'Converted Responses'
      : statusFilter === 'reassigned'
      ? 'Reassigned'
      : statusFilter === 'junk'
      ? 'Junk'
      : statusFilter === 'week_one'
      ? '1 Week Follow-up'
      : statusFilter === 'week_two'
      ? '2 Week Follow-up'
      : statusFilter === 'on_hold'
      ? 'On Hold'
      : statusFilter === 'untouched'
      ? 'Untouched'
      : 'Selected';

  const noCandidatesTitle = `No ${statusLabel} candidates found`;
  const noCandidatesSubtitle = filters.search
    ? 'Try adjusting your search or filters.'
    : `You'll see ${statusLabel.toLowerCase()} candidates here once they're escalated to you.`;

  const getTableTitle = () => {
    if (statusFilter === 'rnr') return 'Ring No Response (RNR) Candidates';
    if (statusFilter === 'reassigned') return 'Reassigned Candidates';
    if (statusFilter === 'junk') return 'Junk Candidates';
    if (statusFilter === 'week_one') return '1 Week Follow-up Candidates';
    if (statusFilter === 'week_two') return '2 Week Follow-up Candidates';
    if (statusFilter === 'on_hold') return 'On Hold Candidates';
    if (statusFilter === 'untouched') return 'Untouched Candidates';
    if (statusFilter === 'interested') return 'Converted Responses';
    if (statusFilter === 'created') return 'Created Candidates';
    return 'Assigned Candidates';
  };

  const getTableSubtitle = () => {
    if (statusFilter === 'rnr') return 'Candidates marked as RNR';
    if (statusFilter === 'reassigned') return 'Candidates transferred by Operations to recruiter with Operations status';
    if (statusFilter === 'junk') return 'Manually marked after 2-week follow-up with no response';
    if (statusFilter === 'week_one') return 'Candidates moved after 3/3 calls and the 7-day waiting period';
    if (statusFilter === 'week_two') return 'Candidates moved after 1-week stage (2 min wait before marking junk)';
    if (statusFilter === 'on_hold') return 'Candidates currently on hold';
    if (statusFilter === 'untouched') return 'New untouched candidates';
    if (statusFilter === 'interested') return 'Candidates converted from Operations call';
    if (statusFilter === 'created') return 'Candidates you personally added to the system';
    return 'Candidates assigned to you';
  };

  const formatPhoneForLink = (candidate: any) => {
    const raw = `${candidate.countryCode || ''}${candidate.mobileNumber || ''}`;
    const digits = raw.replace(/\D/g, '');
    return digits || null;
  };

  /** Operations status recorded on reassign — not recruiter currentStatus (always untouched). */
  const getOperationsReassignedStatusName = (candidate: any): string => {
    const reassignedAssignment = candidate.recruiterAssignments?.find(
      (a: { assignmentType?: string }) =>
        a.assignmentType === "cre_reassigned",
    );
    return (
      candidate.creStatus?.statusName ||
      reassignedAssignment?.creStatus?.statusName ||
      "Unknown"
    );
  };

  const handleConfirmConvert = async () => {
    if (!candidateToConvert) return;
    try {
      await markCandidateConverted(candidateToConvert.id).unwrap();
      setIsConvertModalOpen(false);
      setCandidateToConvert(null);
      setFilters((f) => ({ ...f, page: 1 }));
      refetch();
    } catch (error) {
      console.error('Convert modal confirm failed', error);
    }
  };

  const handleLogOperationsCall = async (payload: {
    note: string;
    usedPhone: boolean;
    usedWhatsapp: boolean;
  }) => {
    if (!callModalCandidate) return;

    try {
      const result = await logOperationsCall({
        id: callModalCandidate.id,
        ...payload,
      }).unwrap();
      const responseData = result.data as {
        startedWeekOneWait?: boolean;
        markedJunk?: boolean;
      };

      if (responseData?.markedJunk) {
        toast.success("Call logged — candidate marked as junk");
      } else if (responseData?.startedWeekOneWait) {
        toast.success(
          "Call logged — 1 Week follow-up starts after the waiting period",
        );
      } else {
        toast.success("Call logged (no answer)");
      }

      setCallModalState(null);
      setFilters((f) => ({ ...f, page: 1 }));
      await Promise.all([refetch(), refetchSummary()]);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to log call";
      toast.error(message);
    }
  };

  const handleInterestedReassign = async (
    callPayload: { note: string; usedPhone: boolean; usedWhatsapp: boolean },
    transferPayload: {
      currentStatusId: number;
      reason: string;
      onHoldUntil?: string;
      futureDate?: string;
    },
  ) => {
    if (!callModalCandidate) return;

    try {
      await transferCandidateToRecruiter({
        id: callModalCandidate.id,
        ...transferPayload,
        operationsCallNote: callPayload.note.trim(),
        usedPhone: callPayload.usedPhone,
        usedWhatsapp: callPayload.usedWhatsapp,
      }).unwrap();

      toast.success("Candidate reassigned to recruiter");
      setCallModalState(null);
      setFilters((f) => ({ ...f, page: 1 }));
      await Promise.all([
        assignedCandidatesQuery.refetch(),
        reassignedCandidatesQuery.refetch(),
        createdCandidatesQuery.refetch(),
        refetchSummary(),
      ]);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to reassign candidate";
      toast.error(message);
    }
  };

  const handleNotInterestedJunk = async (payload: {
    note: string;
    usedPhone: boolean;
    usedWhatsapp: boolean;
  }) => {
    if (!callModalCandidate) return;

    try {
      const result = await markOperationsNotInterested({
        id: callModalCandidate.id,
        ...payload,
      }).unwrap();
      const responseData = result.data as { alreadyJunk?: boolean };

      if (responseData?.alreadyJunk) {
        toast.success("Call logged — candidate remains junk");
      } else {
        toast.success("Candidate marked as not interested (junk)");
      }
      setCallModalState(null);
      setFilters((f) => ({ ...f, page: 1 }));
      await Promise.all([refetch(), refetchSummary()]);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to mark candidate as junk";
      toast.error(message);
    }
  };

  // Tile config — Junk is last
  const statCards = [
    {
      label: 'Untouched Candidates',
      value: assignedCount,
      subtitle: 'Active follow-up (initial stage)',
      icon: Users,
      accent: 'blue',
      statusId: undefined as string | undefined,
    },
    {
      label: 'Reassigned Candidates',
      value: reassignedCount,
      subtitle: 'Transferred to recruiters',
      icon: UserCheck,
      accent: 'indigo',
      statusId: 'reassigned',
    },
    {
      label: 'Created Candidates',
      value: createdCount,
      subtitle: 'Candidates you added',
      icon: PlusCircle,
      accent: 'green',
      statusId: 'created',
    },
    {
      label: '1 Week Follow-up',
      value: weekOneCount,
      subtitle: 'After 3/3 calls and 7-day wait',
      icon: CalendarClock,
      accent: 'violet',
      statusId: 'week_one',
    },
    {
      label: '2 Week Follow-up',
      value: weekTwoCount,
      subtitle: 'Auto after 7 days — log marks junk',
      icon: CalendarClock,
      accent: 'amber',
      statusId: 'week_two',
    },
    {
      label: 'Junk Candidates',
      value: junkCount,
      subtitle: 'Auto or logged — isJunk flagged',
      icon: AlertCircle,
      accent: 'orange',
      statusId: 'junk',
    },
  ] as const;

  return (
    <TooltipProvider>
      <div className={`min-h-screen ${PAGE_SHELL_GRADIENT_BLUE}`}>
        <div className="max-w-screen-2xl mx-auto space-y-6 p-4 md:p-6">

          {/* Header */}
          <DashboardWelcomeHeader
            userName={user?.name || "Operations Executive"}
            subtitle={`Roles: ${Array.isArray(user?.roles) ? user.roles.join(", ") : "N/A"}`}
          />

          {/* Stat Cards */}
          <div className="grid auto-rows-fr gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map((stat) => {
              const isActive = statusFilter === stat.statusId;
              return (
                <DashboardStatTile
                  key={stat.label}
                  accent={stat.accent}
                  label={stat.label}
                  value={stat.value}
                  subtitle={stat.subtitle}
                  icon={stat.icon}
                  active={isActive}
                  interactive
                  footerText={isActive ? "Viewing now" : "Click to view"}
                  onClick={() => {
                    setStatusFilter(stat.statusId);
                    setCallCountFilter("all");
                    setFilters((f) => ({ ...f, page: 1 }));
                  }}
                />
              );
            })}
          </div>

          {/* Candidates Table Card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">

            {/* Table Header Bar */}
            <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground truncate">{getTableTitle()}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{getTableSubtitle()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      placeholder="Search name, email or phone…"
                      className="pl-9 h-9 text-sm border-border bg-card focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  {statusFilter === undefined && (
                    <div className="relative w-full sm:w-48">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Select
                        value={callCountFilter}
                        onValueChange={(value) => {
                          setCallCountFilter(value);
                          setFilters((f) => ({ ...f, page: 1 }));
                        }}
                      >
                        <SelectTrigger
                          className="h-9 w-full border-border bg-card pl-9 text-sm"
                          aria-label="Filter by CRE call count"
                        >
                          <SelectValue placeholder="Call count" />
                        </SelectTrigger>
                        <SelectContent>
                          {callCountFilterOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterSheetOpen(true)}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg border-border hover:bg-muted text-muted-foreground text-sm font-medium"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Advanced Filters</span>
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
                      className="h-9 px-3 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-sm font-medium gap-1.5"
                    >
                      <FilterX className="h-4 w-4" />
                      <span className="hidden sm:inline">Reset</span>
                    </Button>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-border" onClick={() => refetch()}>
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p className="text-xs">Refresh</p></TooltipContent>
                  </Tooltip>
                  {statusFilter === 'created' && (
                    <Button
                      size="sm"
                      className="h-9 px-3 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm gap-1.5 shrink-0"
                      onClick={() => navigate('/candidates/create')}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Create Candidate
                    </Button>
                  )}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-medium">Loading candidates…</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-semibold text-muted-foreground">{noCandidatesTitle}</p>
                <p className="text-sm text-slate-400 text-center max-w-xs">{noCandidatesSubtitle}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 border-b border-border hover:bg-muted/80">
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-64">Candidate</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-56">Contact</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recruiter</TableHead>
                      {statusFilter === 'reassigned' && (
                        <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned By</TableHead>
                      )}
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reason</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {statusFilter === 'reassigned' ? 'Operations Status' : 'Status'}
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned At</TableHead>
                      {statusFilter !== 'created' && (
                        <TableHead
                          className={cn(
                            "sticky right-0 z-20 h-10 bg-muted/95 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right shadow-[-6px_0_10px_-6px_rgba(15,23,42,0.12)] backdrop-blur-sm",
                            statusFilter === "reassigned" ? "min-w-[13rem]" : "min-w-[11rem]",
                          )}
                        >
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {candidates.map((candidate: any) => {
                      const activeAssignment = candidate.recruiterAssignments?.find((a: any) => a.isActive);
                      const operationsAssignment = getOperationsHandlerAssignment(
                        candidate.recruiterAssignments,
                        user?.id,
                      );
                      const followUpStage = getOperationsFollowUpStage(operationsAssignment);
                      const displayFollowUpStage =
                        statusFilter === undefined
                          ? getDashboardOperationsFollowUpStage(operationsAssignment)
                          : followUpStage;
                      const callAttempts = getOperationsCallAttempts(operationsAssignment);
                      const displayCallAttempts =
                        statusFilter === undefined
                          ? getDashboardOperationsCallAttempts(operationsAssignment)
                          : callAttempts;
                      const displayedCallAttempts = getDisplayedOperationsCallAttempts(
                        displayCallAttempts,
                        displayFollowUpStage,
                      );
                      const callCountLabel = formatOperationsCallCountLabel(
                        displayCallAttempts,
                        displayFollowUpStage,
                      );
                      const stageEnteredAt = operationsAssignment?.operationsStageEnteredAt;
                      const stageEnteredLabel = formatOperationsStageEnteredAt(stageEnteredAt);
                      const waitingForWeekOne =
                        statusFilter === undefined &&
                        isWaitingBeforeWeekOneBucket(operationsAssignment, followUpNow);
                      const waitingForWeekTwo = isWaitingToMoveToWeekTwo(
                        displayFollowUpStage,
                        stageEnteredAt,
                        followUpNow,
                      );
                      const waitingForJunk = isWaitingToMarkOperationsJunk(
                        displayFollowUpStage,
                        stageEnteredAt,
                        followUpNow,
                      );
                      const weekOneFollowUpDate =
                        formatOperationsWeekOneFollowUpAt(stageEnteredAt);
                      const weekTwoWaitRemaining = formatOperationsWaitRemaining(
                        getOperationsStageWaitRemainingMs(
                          stageEnteredAt,
                          OPERATIONS_WEEK_TWO_WAIT_MS,
                          followUpNow,
                        ),
                      );
                      const junkWaitRemaining = formatOperationsWaitRemaining(
                        getOperationsStageWaitRemainingMs(
                          stageEnteredAt,
                          OPERATIONS_WEEK_TWO_WAIT_MS,
                          followUpNow,
                        ),
                      );
                      const nonCreAssignment = candidate.recruiterAssignments?.find(
                        (a: any) => a.recruiter?.id && a.recruiter?.id !== user?.id
                      );
                      const recruiterName =
                        nonCreAssignment?.recruiter?.name ||
                        activeAssignment?.recruiter?.name ||
                        'Unassigned';
                      const assignedByName =
                        activeAssignment?.assignedByUser?.name ||
                        nonCreAssignment?.assignedByUser?.name ||
                        'System / Admin';
                      const statusName =
                        statusFilter === "reassigned"
                          ? getOperationsReassignedStatusName(candidate)
                          : candidate.currentStatus?.statusName || "Unknown";
                      const assignedDate = activeAssignment?.assignedAt || candidate.createdAt;
                      const assignmentReason = activeAssignment?.reason || '';
                      const phoneDigits = formatPhoneForLink(candidate);

                      const statusBadgeClass =
                        statusName.toLowerCase() === 'rnr'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : statusName.toLowerCase() === 'on hold' || statusName.toLowerCase() === 'on_hold'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : statusName.toLowerCase() === 'untouched'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : statusName.toLowerCase() === 'interested'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200';

                      return (
                        <TableRow
                          key={candidate.id}
                          className="border-b border-border hover:bg-blue-50/30 transition-colors last:border-b-0 group"
                        >
                          {/* Candidate */}
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ImageViewer
                                title={`${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate'}
                                src={candidate.profileImage || null}
                                fallbackSrc="https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                className="h-9 w-9 rounded-full ring-2 ring-white shadow-sm shrink-0"
                                ariaLabel={`View full image for ${candidate.firstName || ''} ${candidate.lastName || ''}`}
                                enableHoverPreview
                              />
                              <div className="min-w-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${candidate.id}`); }}
                                  className="text-sm font-semibold text-foreground hover:text-blue-600 hover:underline transition-colors truncate block max-w-[160px]"
                                >
                                  {candidate.firstName || ''} {candidate.lastName || ''}
                                </button>
                                {candidate.candidateCode && (
                                  <div className="mt-1">
                                    <div className="inline-flex max-w-full items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono font-bold text-foreground border border-border">
                                      {candidate.candidateCode}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Contact */}
                          <TableCell className="px-4 py-3">
                            <div className="text-xs text-muted-foreground flex flex-col gap-1 min-w-0">
                              <div className="flex items-start gap-2 min-w-0">
                                <Phone className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" />
                                <span className="min-w-0 whitespace-normal break-words">
                                  {(candidate.countryCode || '')} {(candidate.mobileNumber || '')}
                                </span>
                              </div>
                              {candidate.email && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Mail className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" />
                                  <span className="min-w-0 whitespace-normal break-all">{candidate.email}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Recruiter */}
                          <TableCell className="px-4 py-3">
                            <span className="text-xs font-medium text-foreground truncate max-w-[120px] block">{recruiterName}</span>
                          </TableCell>

                          {/* Assigned By (reassigned only) */}
                          {statusFilter === 'reassigned' && (
                            <TableCell className="px-4 py-3">
                              <span className="text-xs text-muted-foreground truncate block max-w-[120px]">{assignedByName}</span>
                            </TableCell>
                          )}

                          {/* Reason */}
                          <TableCell className="px-4 py-3 max-w-[160px]">
                            {assignmentReason ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground truncate block max-w-[140px] cursor-help">{assignmentReason}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs"><p className="text-xs">{assignmentReason}</p></TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </TableCell>

                          {/* Status / Operations status */}
                          <TableCell className="px-4 py-3">
                            <Badge className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", statusBadgeClass)}>
                              {statusName}
                            </Badge>
                            {statusFilter === 'reassigned' && (
                              <p className="text-[10px] text-slate-400 mt-1">Set by Operations on reassign</p>
                            )}
                            {statusFilter === 'reassigned' && operationsAssignment && (
                              <div className="mt-1.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                                    getOperationsCallPillClassName(
                                      displayFollowUpStage,
                                      displayedCallAttempts,
                                    ),
                                  )}
                                >
                                  <Phone className="h-2.5 w-2.5 shrink-0 opacity-80" />
                                  <span>{callCountLabel}</span>
                                </span>
                                {callAttempts > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCallModalState({ candidate, mode: "history" });
                                    }}
                                    className="mt-1 block text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    View history
                                  </button>
                                )}
                              </div>
                            )}
                            {(statusFilter === undefined ||
                              statusFilter === "week_one" ||
                              statusFilter === "week_two") &&
                              displayFollowUpStage !== OPERATIONS_FOLLOW_UP_STAGE.JUNK && (
                              <div className="mt-1.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                                    getOperationsCallPillClassName(
                                      displayFollowUpStage,
                                      displayedCallAttempts,
                                    ),
                                  )}
                                >
                                  <Phone className="h-2.5 w-2.5 shrink-0 opacity-80" />
                                  <span>{callCountLabel}</span>
                                </span>
                                {callAttempts > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCallModalState({ candidate, mode: "history" });
                                    }}
                                    className="mt-1 block text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    View history
                                  </button>
                                )}
                              </div>
                            )}
                            {statusFilter === "junk" && candidate.isJunk && (
                              <div className="mt-1.5">
                                <p className="text-[10px] font-medium text-orange-600">
                                  Marked as junk
                                </p>
                                {callAttempts > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCallModalState({ candidate, mode: "history" });
                                    }}
                                    className="mt-1 block text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    View history
                                  </button>
                                )}
                              </div>
                            )}
                            {waitingForWeekOne &&
                              statusFilter === undefined &&
                              weekOneFollowUpDate && (
                              <p className="text-[10px] font-medium text-violet-600 mt-1">
                                1 Week follow-up on {weekOneFollowUpDate}
                              </p>
                            )}
                            {(statusFilter === 'week_one' || statusFilter === 'week_two') && stageEnteredLabel && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                In bucket since {stageEnteredLabel}
                              </p>
                            )}
                            {waitingForWeekTwo && statusFilter === "week_one" && (
                              <p className="text-[10px] font-medium text-violet-600 mt-1">
                                Auto 2nd Week in {weekTwoWaitRemaining}
                              </p>
                            )}
                            {waitingForJunk && statusFilter === "week_two" && (
                              <p className="text-[10px] font-medium text-amber-600 mt-1">
                                Auto junk in {junkWaitRemaining}
                              </p>
                            )}
                          </TableCell>

                          {/* Assigned At */}
                          <TableCell className="px-4 py-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(assignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          {statusFilter !== 'created' && (
                          <TableCell
                            className={cn(
                              "sticky right-0 z-20 bg-card px-4 py-3 align-middle shadow-[-6px_0_10px_-6px_rgba(15,23,42,0.12)] group-hover:bg-blue-50/30",
                              statusFilter === "reassigned"
                                ? "min-w-[13rem] whitespace-nowrap"
                                : "min-w-[11rem] whitespace-normal",
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-end touch-manipulation",
                                statusFilter === "reassigned"
                                  ? "flex-nowrap gap-1"
                                  : "flex-wrap gap-1.5",
                              )}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (phoneDigits) window.location.href = `tel:${phoneDigits}`;
                                }}
                                disabled={!phoneDigits}
                                aria-label={`Call ${candidate.firstName || "candidate"}`}
                                title="Call"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (phoneDigits) window.open(`https://wa.me/${phoneDigits}`, "_blank");
                                }}
                                disabled={!phoneDigits}
                                aria-label={`WhatsApp ${candidate.firstName || "candidate"}`}
                                title="WhatsApp"
                              >
                                <FaWhatsapp className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/candidates/${candidate.id}`);
                                }}
                                aria-label={`View profile for ${candidate.firstName || "candidate"}`}
                                title="View profile"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {statusFilter === "reassigned" && callAttempts > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCallModalState({ candidate, mode: "history" });
                                  }}
                                  aria-label={`View call history for ${candidate.firstName || "candidate"}`}
                                  title="View call history"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {canOpenOperationsCallModal(followUpStage) && statusFilter !== 'reassigned' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      className={cn(
                                        "h-8 gap-1.5 px-2.5 text-[11px] font-semibold rounded-lg shadow-sm transition-all",
                                        "bg-gradient-to-r from-emerald-600 to-green-600 text-white",
                                        "border border-emerald-500/30",
                                        "hover:from-emerald-700 hover:to-green-700 hover:shadow-md",
                                        "disabled:opacity-60 disabled:pointer-events-none",
                                      )}
                                      disabled={isLoggingCall}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCallModalState({ candidate, mode: "log" });
                                      }}
                                    >
                                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                      Call Update Status
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">Log call outcome &amp; update status</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {waitingForWeekTwo && statusFilter === "week_one" && (
                                <span className="h-8 px-2 inline-flex items-center text-[11px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded-lg">
                                  Auto 2nd Week {weekTwoWaitRemaining}
                                </span>
                              )}

                              {waitingForJunk && statusFilter === "week_two" && (
                                <span className="h-8 px-2 inline-flex items-center text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-lg">
                                  Auto junk {junkWaitRemaining}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-3 bg-muted/50">
                    <p className="text-xs text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{candidates.length}</span> of{' '}
                      <span className="font-semibold text-foreground">{totalCount}</span> candidates
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                        disabled={filters.page === 1}
                        className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Prev
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                          if (totalPages <= 7 || p === 1 || p === totalPages || (p >= filters.page - 1 && p <= filters.page + 1)) {
                            return (
                              <Button
                                key={p}
                                variant={filters.page === p ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setFilters((f) => ({ ...f, page: p }))}
                                className={cn("h-8 w-8 p-0 text-xs", filters.page === p ? 'bg-blue-600 hover:bg-blue-700 shadow-sm' : 'text-muted-foreground hover:bg-muted')}
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
                        onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
                        disabled={filters.page === totalPages}
                        className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <ConvertCandidateModal
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            setCandidateToConvert(null);
          }}
          onConfirm={handleConfirmConvert}
          candidateName={`${candidateToConvert?.firstName || ''} ${candidateToConvert?.lastName || ''}`.trim() || 'Selected candidate'}
          isSubmitting={isConverting}
        />

          <LogOperationsCallModal
            isOpen={!!callModalState}
            onClose={() => setCallModalState(null)}
            candidateId={callModalCandidate?.id}
            candidateName={logCallCandidateName}
            callAttempts={logCallAttempts}
            nextAttempt={logCallNextAttempt}
            followUpStage={logCallFollowUpStage}
            canLog={!!canOpenCallModal}
            canLogNoAnswer={!!canLogNoAnswerCall}
            isSubmitting={isLoggingCall}
            isSubmittingReassign={isTransferring}
            isSubmittingJunk={isMarkingNotInterested}
            currentRecruiterName={getPrimaryRecruiterName(
              callModalCandidate?.recruiterAssignments,
            )}
            currentStatus={callModalCandidate?.currentStatus?.statusName || "Unknown"}
            onConfirm={handleLogOperationsCall}
            onReassign={handleInterestedReassign}
            onMarkNotInterested={handleNotInterestedJunk}
          />

          <AdvancedFiltersSheet
            isOpen={isFilterSheetOpen}
            onOpenChange={setIsFilterSheetOpen}
            filters={filters as any}
            setFilters={setFilters as any}
            isManagerOrAdmin={false}
            isRecruiter={false}
            handleResetFilters={handleResetFilters}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
