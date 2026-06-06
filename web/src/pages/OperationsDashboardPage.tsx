import { useNavigate } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertCircle, Eye, Search, ChevronLeft, ChevronRight, CalendarDays, Phone, Mail, RefreshCw, ArrowUpRight, PlusCircle, SlidersHorizontal, FilterX, CalendarClock } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { ConvertCandidateModal } from "@/components/molecules/ConvertCandidateModal";
import {
  TransferCandidateModal,
  type TransferToRecruiterPayload,
} from "@/components/molecules/TransferCandidateModal";
import { useGetMyAssignedCandidatesQuery, useGetOperationsAssignedSummaryQuery, useGetOperationsReassignedCandidatesQuery, useGetUserCandidatesQuery, useMarkCandidateConvertedMutation, useTransferCandidateToRecruiterMutation, useLogOperationsCallMutation, useMoveOperationsToWeekOneMutation, useMoveOperationsToWeekTwoMutation, useMarkOperationsJunkMutation } from "@/services/candidatesApi";
import { useAppSelector } from "@/app/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import {
  canLogOperationsCall,
  canMarkOperationsJunk,
  canMoveToWeekOne,
  canMoveToWeekTwo,
  formatOperationsStageEnteredAt,
  getActiveOperationsAssignment,
  getOperationsCallAttempts,
  getOperationsFollowUpStage,
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
} from "@/features/candidates/utils/operations-follow-up.util";

export default function OperationsDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const limitCount = 10;

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
  }), [debouncedSearch, filters]);

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
  const [moveOperationsToWeekOne, { isLoading: isMovingToWeekOne }] = useMoveOperationsToWeekOneMutation();
  const [moveOperationsToWeekTwo, { isLoading: isMovingToWeekTwo }] = useMoveOperationsToWeekTwoMutation();
  const [markOperationsJunk, { isLoading: isMarkingJunk }] = useMarkOperationsJunkMutation();

  const [followUpConfirm, setFollowUpConfirm] = useState<{
    type: "week_one" | "week_two" | "junk";
    candidate: any;
  } | null>(null);

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
    if (statusFilter === 'week_one') return 'Candidates moved after 3 logged no-answer calls';
    if (statusFilter === 'week_two') return 'Candidates moved after 1-week follow-up with no response';
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

  const handleConfirmTransfer = async (payload: TransferToRecruiterPayload) => {
    if (!candidateToTransfer) return;
    try {
      await transferCandidateToRecruiter({
        id: candidateToTransfer.id,
        ...payload,
      }).unwrap();
      toast.success("Candidate reassigned to recruiter");
      setIsTransferModalOpen(false);
      setCandidateToTransfer(null);
      setCurrentRecruiterForTransfer('');
      setFilters((f) => ({ ...f, page: 1 }));
      await Promise.all([
        assignedCandidatesQuery.refetch(),
        reassignedCandidatesQuery.refetch(),
        createdCandidatesQuery.refetch(),
        refetchSummary(),
      ]);
    } catch (error: unknown) {
      console.error('Transfer modal confirm failed', error);
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to reassign candidate";
      toast.error(message);
    }
  };

  const handleFollowUpAction = async () => {
    if (!followUpConfirm) return;

    const candidateId = followUpConfirm.candidate.id;
    try {
      if (followUpConfirm.type === "week_one") {
        await moveOperationsToWeekOne(candidateId).unwrap();
        toast.success("Candidate moved to 1 Week follow-up");
      } else if (followUpConfirm.type === "week_two") {
        await moveOperationsToWeekTwo(candidateId).unwrap();
        toast.success("Candidate moved to 2 Week follow-up");
      } else {
        await markOperationsJunk(candidateId).unwrap();
        toast.success("Candidate marked as junk");
      }

      setFollowUpConfirm(null);
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
        "Follow-up action failed";
      toast.error(message);
    }
  };

  const handleLogOperationsCall = async (candidate: any) => {
    try {
      await logOperationsCall(candidate.id).unwrap();
      toast.success("Call logged (no answer)");
      await Promise.all([refetch(), refetchSummary()]);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to log call";
      toast.error(message);
    }
  };

  const isFollowUpActionLoading =
    isMovingToWeekOne || isMovingToWeekTwo || isMarkingJunk;

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
      subtitle: 'After 3 no-answer calls',
      icon: CalendarClock,
      accent: 'violet',
      statusId: 'week_one',
    },
    {
      label: '2 Week Follow-up',
      value: weekTwoCount,
      subtitle: 'After 1-week follow-up',
      icon: CalendarClock,
      accent: 'amber',
      statusId: 'week_two',
    },
    {
      label: 'Junk Candidates',
      value: junkCount,
      subtitle: 'Manually marked unresponsive',
      icon: AlertCircle,
      accent: 'orange',
      statusId: 'junk',
    },
  ] as const;

  const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
    blue:   { card: 'from-blue-50 via-white to-blue-50/30 border-blue-100',   icon: 'text-blue-600',   iconBg: 'bg-blue-100',   value: 'text-blue-700',   ring: 'ring-blue-400/50',   dot: 'bg-blue-500' },
    indigo: { card: 'from-indigo-50 via-white to-indigo-50/30 border-indigo-100', icon: 'text-indigo-600', iconBg: 'bg-indigo-100', value: 'text-indigo-700', ring: 'ring-indigo-400/50', dot: 'bg-indigo-500' },
    green:  { card: 'from-green-50 via-white to-green-50/30 border-green-100',  icon: 'text-green-600',  iconBg: 'bg-green-100',  value: 'text-green-700',  ring: 'ring-green-400/50',  dot: 'bg-green-500' },
    violet: { card: 'from-violet-50 via-white to-violet-50/30 border-violet-100', icon: 'text-violet-600', iconBg: 'bg-violet-100', value: 'text-violet-700', ring: 'ring-violet-400/50', dot: 'bg-violet-500' },
    amber:  { card: 'from-amber-50 via-white to-amber-50/30 border-amber-100', icon: 'text-amber-600', iconBg: 'bg-amber-100', value: 'text-amber-700', ring: 'ring-amber-400/50', dot: 'bg-amber-500' },
    orange: { card: 'from-orange-50 via-white to-orange-50/30 border-orange-100', icon: 'text-orange-600', iconBg: 'bg-orange-100', value: 'text-orange-700', ring: 'ring-orange-400/50', dot: 'bg-orange-500' },
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40">
        <div className="max-w-screen-2xl mx-auto space-y-6 p-4 md:p-6">

          {/* Header */}
          <DashboardWelcomeHeader
            userName={user?.name || "Operations"}
            subtitle={`Roles: ${Array.isArray(user?.roles) ? user.roles.join(", ") : "N/A"}`}
          />

          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const s = accentStyles[stat.accent];
              const isActive = statusFilter === stat.statusId;
              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => { setStatusFilter(stat.statusId); setFilters((f) => ({ ...f, page: 1 })); }}
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
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                      <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.subtitle}</p>
                    </div>
                    <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                      <Icon className={cn("h-5 w-5", s.icon)} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                    <span>{isActive ? 'Viewing now' : 'Click to view'}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Candidates Table Card */}
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
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{getTableSubtitle()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      placeholder="Search name, email or phone…"
                      className="pl-9 h-9 text-sm border-slate-200 bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterSheetOpen(true)}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium"
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
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-slate-200" onClick={() => refetch()}>
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
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
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-600">{noCandidatesTitle}</p>
                <p className="text-sm text-slate-400 text-center max-w-xs">{noCandidatesSubtitle}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-gray-200 hover:bg-slate-50/80">
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-64">Candidate</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-56">Contact</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Recruiter</TableHead>
                      {statusFilter === 'reassigned' && (
                        <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned By</TableHead>
                      )}
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Reason</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {statusFilter === 'reassigned' ? 'Operations Status' : 'Status'}
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned At</TableHead>
                      {statusFilter !== 'created' && (
                        <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {candidates.map((candidate: any) => {
                      const activeAssignment = candidate.recruiterAssignments?.find((a: any) => a.isActive);
                      const operationsAssignment = getActiveOperationsAssignment(
                        candidate.recruiterAssignments,
                        user?.id,
                      );
                      const followUpStage = getOperationsFollowUpStage(operationsAssignment);
                      const callAttempts = getOperationsCallAttempts(operationsAssignment);
                      const stageEnteredLabel = formatOperationsStageEnteredAt(
                        operationsAssignment?.operationsStageEnteredAt,
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
                          className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors last:border-b-0 group"
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
                                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors truncate block max-w-[160px]"
                                >
                                  {candidate.firstName || ''} {candidate.lastName || ''}
                                </button>
                                {candidate.candidateCode && (
                                  <div className="mt-1">
                                    <div className="inline-flex max-w-full items-center rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 border border-slate-200">
                                      {candidate.candidateCode}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Contact */}
                          <TableCell className="px-4 py-3">
                            <div className="text-xs text-slate-600 flex flex-col gap-1 min-w-0">
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
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[120px] block">{recruiterName}</span>
                          </TableCell>

                          {/* Assigned By (reassigned only) */}
                          {statusFilter === 'reassigned' && (
                            <TableCell className="px-4 py-3">
                              <span className="text-xs text-slate-600 truncate block max-w-[120px]">{assignedByName}</span>
                            </TableCell>
                          )}

                          {/* Reason */}
                          <TableCell className="px-4 py-3 max-w-[160px]">
                            {assignmentReason ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-slate-600 truncate block max-w-[140px] cursor-help">{assignmentReason}</span>
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
                            {(statusFilter === undefined || statusFilter === 'week_one' || statusFilter === 'week_two') &&
                              followUpStage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL && (
                              <p className="text-[10px] text-slate-500 mt-1">
                                Calls logged: {callAttempts}/{OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE}
                              </p>
                            )}
                            {(statusFilter === 'week_one' || statusFilter === 'week_two') && stageEnteredLabel && (
                              <p className="text-[10px] text-slate-500 mt-1">
                                In bucket since {stageEnteredLabel}
                              </p>
                            )}
                          </TableCell>

                          {/* Assigned At */}
                          <TableCell className="px-4 py-3">
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(assignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          {statusFilter !== 'created' && (
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (phoneDigits) window.location.href = `tel:${phoneDigits}`;
                                    }}
                                    disabled={!phoneDigits}
                                    aria-label={`Call ${candidate.firstName || "candidate"}`}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">Call</p></TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); if (phoneDigits) window.open(`https://wa.me/${phoneDigits}`, '_blank'); }}
                                    disabled={!phoneDigits}
                                    aria-label={`WhatsApp ${candidate.firstName || "candidate"}`}
                                  >
                                    <FaWhatsapp className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">WhatsApp</p></TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${candidate.id}`); }}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">View Profile</p></TooltipContent>
                              </Tooltip>

                              {canLogOperationsCall(followUpStage) && statusFilter !== 'reassigned' && statusFilter !== 'junk' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-[11px] font-semibold border-slate-200"
                                  disabled={isLoggingCall}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleLogOperationsCall(candidate);
                                  }}
                                >
                                  Log Call
                                </Button>
                              )}

                              {canMoveToWeekOne(followUpStage, callAttempts) && statusFilter !== 'reassigned' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-2 text-[11px] font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFollowUpConfirm({ type: "week_one", candidate });
                                  }}
                                >
                                  Move to 1 Week
                                </Button>
                              )}

                              {canMoveToWeekTwo(followUpStage) && statusFilter === 'week_one' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-2 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFollowUpConfirm({ type: "week_two", candidate });
                                  }}
                                >
                                  Move to 2nd Week
                                </Button>
                              )}

                              {canMarkOperationsJunk(followUpStage) && statusFilter === 'week_two' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-2 text-[11px] font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFollowUpConfirm({ type: "junk", candidate });
                                  }}
                                >
                                  Mark as Junk
                                </Button>
                              )}

                              {statusFilter !== 'reassigned' && statusFilter !== 'junk' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                                  disabled={isTransferring}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCandidateToTransfer(candidate);
                                    setCurrentRecruiterForTransfer(recruiterName);
                                    setIsTransferModalOpen(true);
                                  }}
                                >
                                  Reassign
                                </Button>
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
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
                    <p className="text-xs text-slate-500">
                      Showing <span className="font-semibold text-slate-700">{candidates.length}</span> of{' '}
                      <span className="font-semibold text-slate-700">{totalCount}</span> candidates
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                        disabled={filters.page === 1}
                        className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
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
                                className={cn("h-8 w-8 p-0 text-xs", filters.page === p ? 'bg-blue-600 hover:bg-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100')}
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
                        className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
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

          <TransferCandidateModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setCandidateToTransfer(null);
            setCurrentRecruiterForTransfer('');
          }}
          onConfirm={handleConfirmTransfer}
          candidateName={`${candidateToTransfer?.firstName || ''} ${candidateToTransfer?.lastName || ''}`.trim() || 'Selected candidate'}
          currentRecruiterName={currentRecruiterForTransfer}
          currentStatus={candidateToTransfer?.currentStatus?.statusName || 'Unknown'}
          isSubmitting={isTransferring}
        />

          <ConfirmationDialog
            isOpen={followUpConfirm?.type === "week_one"}
            onClose={() => setFollowUpConfirm(null)}
            onConfirm={handleFollowUpAction}
            title="Move to 1 Week follow-up?"
            description={`Move ${followUpConfirm?.candidate?.firstName || ""} ${followUpConfirm?.candidate?.lastName || ""} to the 1 Week follow-up bucket after 3 logged no-answer calls.`}
            confirmText="Move to 1 Week"
            isLoading={isFollowUpActionLoading}
          />

          <ConfirmationDialog
            isOpen={followUpConfirm?.type === "week_two"}
            onClose={() => setFollowUpConfirm(null)}
            onConfirm={handleFollowUpAction}
            title="Move to 2nd Week follow-up?"
            description={`Move ${followUpConfirm?.candidate?.firstName || ""} ${followUpConfirm?.candidate?.lastName || ""} to the 2 Week follow-up bucket.`}
            confirmText="Move to 2nd Week"
            isLoading={isFollowUpActionLoading}
          />

          <ConfirmationDialog
            isOpen={followUpConfirm?.type === "junk"}
            onClose={() => setFollowUpConfirm(null)}
            onConfirm={handleFollowUpAction}
            title="Mark candidate as junk?"
            description={`Mark ${followUpConfirm?.candidate?.firstName || ""} ${followUpConfirm?.candidate?.lastName || ""} as junk after no response in the 2 Week follow-up stage.`}
            confirmText="Mark as Junk"
            variant="destructive"
            isLoading={isFollowUpActionLoading}
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
