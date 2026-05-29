import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  MoreHorizontal,
  Eye,
  Plus,
  Users,
  UserCheck,
  Phone,
  Clock,
  CheckCircle,
  Briefcase,
  XCircle,
  Mail,
  Calendar,
  Filter,
  FilterX,
  SlidersHorizontal,
  Building2,
  AlertCircle,
  FileSearch,
  Repeat,
  ArrowRightLeft,
  ArrowUpRight,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useGetCandidateOverviewQuery, useTransferCandidateMutation, useBulkTransferCandidatesMutation } from "@/features/candidates/api";
import { useAppSelector } from "@/app/hooks";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ImageViewer } from "@/components/molecules";
import TypedHeader from "@/components/molecules/TypedHeader";
import { TransferCandidateDialog } from "../components/TransferCandidateDialog";
import { BulkTransferCandidateDialog } from "../components/BulkTransferCandidateDialog";
import { UserSelect } from "../components/UserSelect";
import { AdvancedFiltersSheet } from "../components/AdvancedFiltersSheet";
import { WorkflowStatusDropdown } from "../components/WorkflowStatusDropdown";
import { CandidateProfileCompletionCell } from "../components/CandidateProfileCompletion";
import { CreReassignedStatusNote } from "@/components/molecules/CreReassignedStatusNote";

export default function CandidateOverviewPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const isManagerOrAdmin = currentUser?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Team Head", "Team Lead", "System Admin", "CRE"].includes(role)
  );

  const isRecruiter = currentUser?.roles?.includes("Recruiter");

  const canTransferCandidates = currentUser?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Team Head", "Team Lead", "System Admin"].includes(role)
  );

  // Transfer candidate state
  const [transferDialog, setTransferDialog] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
    currentRecruiter?: { id: string; name?: string; email?: string } | null;
  }>({ isOpen: false });

  const [transferCandidate, { isLoading: isTransferring }] = useTransferCandidateMutation();
  const [bulkTransferCandidates, { isLoading: isBulkTransferring }] = useBulkTransferCandidatesMutation();

  // Multi-select state
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [bulkTransferDialog, setBulkTransferDialog] = useState(false);

  // Advanced filters sheet state
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    limit: 10,
    recruiterId: (isManagerOrAdmin && !isRecruiter) ? "all" : currentUser?.id,
    dateFilter: "all",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    countryPreferences: [] as string[],
    sectorTypes: [] as string[],
    facilityPreferences: [] as string[],
    gender: "all",
    sources: [] as string[],
    status: "all",
    mainStatus: undefined as string | undefined,
    subStatus: undefined as string | undefined,
    processingStep: undefined as string | undefined,
    minExperience: undefined as number | undefined,
    maxExperience: undefined as number | undefined,
    minSalary: undefined as number | undefined,
    maxSalary: undefined as number | undefined,
    minAge: undefined as number | undefined,
    maxAge: undefined as number | undefined,
    visaType: undefined as string | undefined,
    qualification: "",
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
  });

  // Count active filters (calculated after filters state)
  const activeFilterCount = [
    filters.countryPreferences.length > 0,
    filters.sectorTypes.length > 0,
    filters.facilityPreferences.length > 0,
    filters.sources.length > 0,
    filters.dateFilter !== "all",
    filters.recruiterId !== "all" && filters.recruiterId !== currentUser?.id,
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
    !!filters.mainStatus,
    !!filters.subStatus,
    !!filters.processingStep,
  ].filter(Boolean).length;

  // Fetch live statuses from API only when a workflow tile is active
  const isWorkflowActive = ["registered", "documentation", "interview", "processing"].includes(filters.status);
  
  // Use the new simplified endpoint for sub-statuses for the main stage
  const activeMainStage = filters.status === 'documentation' ? 'documents' : filters.status;

  // Main Query
  const requestPayload = {
    ...filters,
    recruiterId: filters.recruiterId === "all" ? undefined : filters.recruiterId,
    gender: filters.gender === "all" ? undefined : filters.gender,
    dateFrom: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
    dateTo: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
    currentStatus: filters.status !== "all" ? filters.status : undefined,
    mainStatus: filters.mainStatus,
    subStatus: filters.subStatus,
    processingStep: filters.processingStep,
    minAge: filters.minAge,
    maxAge: filters.maxAge,
  };

  const { data, isLoading, refetch } = useGetCandidateOverviewQuery(requestPayload);

  const candidates = data?.data || [];
  const statsData = data?.stats || {
    total: 0,
    positive: 0,
    negative: 0,
    nominated: 0,
    interviewAssigned: 0,
    documentReceived: 0,
    medical: 0,
    visa: 0,
    deployed: 0,
  };
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
    blue:    { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",       icon: "text-blue-600",    iconBg: "bg-blue-100",    value: "text-blue-700",    ring: "ring-blue-400/50",    dot: "bg-blue-500"    },
    emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
    orange:  { card: "from-orange-50 via-white to-orange-50/30 border-orange-100", icon: "text-orange-600",   iconBg: "bg-orange-100",  value: "text-orange-700",  ring: "ring-orange-400/50",  dot: "bg-orange-500"  },
    indigo:  { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100", icon: "text-indigo-600",   iconBg: "bg-indigo-100",  value: "text-indigo-700",  ring: "ring-indigo-400/50",  dot: "bg-indigo-500"  },
    purple:  { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600",   iconBg: "bg-purple-100",  value: "text-purple-700",  ring: "ring-purple-400/50",  dot: "bg-purple-500"  },
    lime:    { card: "from-lime-50 via-white to-lime-50/30 border-lime-100",       icon: "text-lime-700",    iconBg: "bg-lime-100",    value: "text-lime-700",    ring: "ring-lime-400/50",    dot: "bg-lime-500"    },
    fuchsia: { card: "from-fuchsia-50 via-white to-fuchsia-50/30 border-fuchsia-100", icon: "text-fuchsia-600", iconBg: "bg-fuchsia-100", value: "text-fuchsia-700", ring: "ring-fuchsia-400/50", dot: "bg-fuchsia-500" },
    teal:    { card: "from-teal-50 via-white to-teal-50/30 border-teal-100",       icon: "text-teal-600",    iconBg: "bg-teal-100",    value: "text-teal-700",    ring: "ring-teal-400/50",    dot: "bg-teal-500"    },
  };

  const statTiles = [
    { label: "Total Candidates",    value: statsData.total,                                             icon: Users,     accent: "blue",    subtitle: "All candidates",           statusFilter: "all"           },
    { label: "Positive Candidates", value: statsData.positive,                                          icon: UserCheck, accent: "emerald", subtitle: "Interested/Future/On Hold",  statusFilter: "positive"      },
    { label: "Negative Candidates", value: statsData.negative,                                          icon: XCircle,   accent: "orange",  subtitle: "Not Interested/RNR",        statusFilter: "negative"      },
    { label: "Registered",          value: statsData.registered ?? statsData.nominated,                 icon: Filter,    accent: "indigo",  subtitle: "Nominated to projects",     statusFilter: "registered"    },
    { label: "Documentation",       value: statsData.documentation ?? statsData.documentReceived,       icon: FileSearch,accent: "purple",  subtitle: "Main status: Documents",    statusFilter: "documentation" },
    { label: "Interview",           value: statsData.interview ?? statsData.interviewAssigned,          icon: Phone,     accent: "lime",    subtitle: "Main status: Interview",    statusFilter: "interview"     },
    { label: "Processing",          value: statsData.processing ?? (statsData.medical + statsData.visa),icon: Repeat,    accent: "fuchsia", subtitle: "Main status: Processing",   statusFilter: "processing"    },
    { label: "Deployed",            value: statsData.deployed,                                          icon: Building2, accent: "teal",    subtitle: "Placements / Hired",        statusFilter: "deployed"      },
  ];

  const handleTileClick = (statusFilter?: string) => {
    setFilters((prev) => {
      const isWorkflowStatus = statusFilter && ["documentation", "interview", "processing"].includes(statusFilter);
      let mainStatus = undefined;
      
      if (isWorkflowStatus) {
        if (statusFilter === 'documentation') mainStatus = 'documents';
        else mainStatus = statusFilter;
      }
      
      return { 
        ...prev, 
        status: statusFilter ?? "all", 
        mainStatus: mainStatus,
        subStatus: undefined, // Reset sub-status when clicking a tile
        page: 1 
      };
    });
    setTimeout(() => refetch(), 50);
  };

  const handleSubStatusClick = (subStatus: string) => {
    setFilters((prev) => ({
      ...prev,
      subStatus: subStatus === "all_sub" ? undefined : (prev.subStatus === subStatus ? undefined : subStatus),
      page: 1,
    }));
    setTimeout(() => refetch(), 50);
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      page: 1,
      limit: 10,
      recruiterId: (isManagerOrAdmin && !isRecruiter) ? "all" : currentUser?.id,
      dateFilter: "all",
      dateFrom: undefined,
      dateTo: undefined,
      countryPreferences: [],
      sectorTypes: [],
      facilityPreferences: [],
      gender: "all",
      sources: [],
      status: "all",
      mainStatus: undefined,
      subStatus: undefined,
      processingStep: undefined,
      minExperience: undefined,
      maxExperience: undefined,
      minSalary: undefined,
      maxSalary: undefined,
      minAge: undefined,
      maxAge: undefined,
      visaType: undefined,
      qualification: "",
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
    });
  };

  const handleBulkTransfer = async (data: { targetRecruiterId: string; reason: string }) => {
    try {
      await bulkTransferCandidates({
        candidateIds: [...selectedCandidateIds],
        targetRecruiterId: data.targetRecruiterId,
        reason: data.reason,
      }).unwrap();
      setSelectedCandidateIds(new Set());
      setBulkTransferDialog(false);
      refetch();
    } catch (error: any) {
      console.error("Failed to bulk transfer candidates:", error);
    }
  };

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

      setTransferDialog({ isOpen: false });
      refetch();
    } catch (error: any) {
      console.error("Failed to transfer candidate:", error);
    }
  };

  const getTableTitle = () => {
      if (filters.status === "all") return "Candidate Overview";
      const tile = statTiles.find(t => t.statusFilter === filters.status);
      return tile ? tile.label : "Candidate List";
  };

  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "untouched":
        return {
          variant: "outline" as const,
          icon: UserCheck,
          textColor: "text-emerald-700",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
        };
      case "interested":
        return {
          variant: "outline" as const,
          icon: CheckCircle,
          textColor: "text-blue-700",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "not interested":
      case "not_interested":
        return {
          variant: "outline" as const,
          icon: XCircle,
          textColor: "text-red-700",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      case "not eligible":
      case "not_eligible":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-orange-700",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "on hold":
      case "on_hold":
        return {
          variant: "outline" as const,
          icon: Clock,
          textColor: "text-purple-700",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        };
      case "rnr":
        return {
          variant: "outline" as const,
          icon: Phone,
          textColor: "text-amber-700",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
        };
      case "qualified":
        return {
          variant: "outline" as const,
          icon: UserCheck,
          textColor: "text-teal-700",
          bgColor: "bg-teal-50",
          borderColor: "border-teal-200",
        };
      case "deployed":
      case "working":
        return {
          variant: "outline" as const,
          icon: Briefcase,
          textColor: "text-fuchsia-700",
          bgColor: "bg-fuchsia-50",
          borderColor: "border-fuchsia-200",
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPhoneForLink = (c: any) => {
    const raw = String(c?.countryCode ?? "") + String(c?.mobileNumber ?? c?.mobile ?? c?.contact ?? "");
    const digits = raw.replace(/\D/g, "");
    return digits || null;
  };

  const displayedRecruiterName = currentUser?.name;

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-6 mt-2 px-6">
        {/* Welcome Header */}
        <TypedHeader 
          userName={displayedRecruiterName || currentUser?.name || "Recruiter"} 
          subtitle={Array.isArray(currentUser?.roles) ? currentUser.roles.join(", ") : ""}
        />

        {/* Performance Chart Section - Only if a specific recruiter is selected or it's a recruiter's own dashboard */}
        {/* {(filters.recruiterId !== "all") && (
          <RecruiterPerformanceChartWrapper 
            recruiterId={filters.recruiterId}
            recruiterName={
              filters.recruiterId === currentUser?.id 
                ? currentUser?.name 
                : usersData?.data?.users?.find(u => u.id === filters.recruiterId)?.name
            }
          />
        )} */}

        {/* Dashboard Tiles */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {statTiles.map((stat, i) => {
            const Icon = stat.icon;
            const s = accentStyles[stat.accent];
            const isActive = filters.status === stat.statusFilter;
            return (
              <motion.button
                key={stat.label}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { handleTileClick(stat.statusFilter); tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
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

        {/* Search & Filter Bar */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Search candidates by name, email or role..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                className="h-11 pl-10 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-blue-500/10 rounded-xl transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {(isManagerOrAdmin && !isRecruiter) && (
                <div className="w-full sm:w-[200px]">
                  <UserSelect
                    value={filters.recruiterId === "all" ? "" : filters.recruiterId}
                    onChange={(val) => setFilters(f => ({ ...f, recruiterId: val || "all", page: 1 }))}
                    placeholder="All Recruiters"
                    role="Recruiter"
                    allowClear={true}
                    className="h-11 shadow-none bg-white border-slate-200 rounded-xl focus:ring-blue-500/10"
                  />
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={() => setIsFilterSheetOpen(true)}
                className="flex items-center gap-2 h-11 px-4 rounded-xl border-slate-200 hover:bg-slate-50 transition-all font-medium text-slate-600"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Advanced Filters</span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="h-11 px-4 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all font-medium gap-2"
                >
                  <FilterX className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div ref={tableRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Table Header Bar */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 truncate">{getTableTitle()}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{pagination.total} candidate{pagination.total !== 1 ? "s" : ""} found</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {["processing"].includes(filters.status) && (
                  <WorkflowStatusDropdown
                    mainStatusName={activeMainStage as string}
                    selectedSubStatus={filters.subStatus}
                    onSubStatusSelect={handleSubStatusClick}
                  />
                )}
                {canTransferCandidates && selectedCandidateIds.size > 0 && (
                  <Button
                    onClick={() => setBulkTransferDialog(true)}
                    size="sm"
                    className="h-9 px-3 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-sm gap-1.5"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Transfer ({selectedCandidateIds.size})
                  </Button>
                )}
                <Button
                  onClick={() => navigate("/candidates/create")}
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Candidate
                </Button>
              </div>
            </div>
          </div>

               <Table>
                <TableHeader className="sticky">
                  <TableRow className="bg-slate-50/80 border-b border-gray-200 hover:bg-slate-50/80">
                    {canTransferCandidates && (
                      <TableHead className="h-10 px-4 w-10">
                        <Checkbox
                          checked={
                            candidates.length > 0 &&
                            candidates.every((c: any) => selectedCandidateIds.has(c.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCandidateIds(
                                new Set(candidates.map((c: any) => c.id))
                              );
                            } else {
                              setSelectedCandidateIds(new Set());
                            }
                          }}
                          aria-label="Select all candidates on this page"
                        />
                      </TableHead>
                    )}
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Candidate</TableHead>
                    <TableHead className="h-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Contact</TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Recruiter</TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Created By</TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {isWorkflowActive ? "Projects" : "Status"}
                    </TableHead>
                    <TableHead className="h-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Profile
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Last Updated</TableHead>
                    <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={canTransferCandidates ? 9 : 8} className="px-4 py-3"><div className="h-10 bg-slate-100 rounded" /></TableCell>
                      </TableRow>
                    ))
                  ) : candidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canTransferCandidates ? 9 : 8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <UserCheck className="h-8 w-8 text-slate-300" />
                          </div>
                          <p className="font-semibold text-slate-600">No candidates found</p>
                          <p className="text-sm text-slate-400">Try adjusting your search or filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                      candidates.map((candidate: any) => {
                        const statusName = candidate.currentStatus?.statusName ?? "";
                        const statusInfo = getStatusInfo(statusName);
                        const StatusIcon = statusInfo.icon;

                        // Determine active recruiter assignment
                        const activeAssignment = (candidate.recruiterAssignments || [])?.find((a: any) => a.isActive);
                      const recruiter = activeAssignment?.recruiter || (candidate as any).recruiter || null;
                      const createdBy = (candidate as any).createdBy || activeAssignment?.createdByUser || null;
                      const isHandledByCRE = candidate.isHandledByCRE;
                      const isCREReassigned = candidate.isCREReassigned;
                      const creStatusNote = candidate.creStatusNote as
                        | string
                        | null
                        | undefined;

                      return (
                        <TableRow
                          key={candidate.id}
                          className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors last:border-b-0 group ${
                            selectedCandidateIds.has(candidate.id) ? "bg-indigo-50/60" : ""
                          }`}
                        >
                          {/* Multi-select Checkbox */}
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
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ImageViewer
                                title={`${candidate.firstName} ${candidate.lastName}`}
                                src={candidate.profileImage || null}
                                fallbackSrc={
                                  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                }
                                className="h-10 w-10 rounded-full"
                                ariaLabel={`View full image for ${candidate.firstName} ${candidate.lastName}`}
                                enableHoverPreview={true}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/candidates/${candidate.id}`);
                                    }}
                                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-all duration-200 truncate block text-xs"
                                  >
                                    {candidate.firstName} {candidate.lastName}
                                  </button>

                                  {isHandledByCRE && (
                                    <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-red-100 text-red-700 border border-red-200">
                                      CRE Assigned
                                    </Badge>
                                  )}

                                  {isCREReassigned && (
                                    <>
                                      <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-green-100 text-green-700 border border-green-200">
                                        CRE Reassigned
                                      </Badge>
                                      <CreReassignedStatusNote
                                        note={creStatusNote}
                                        creStatus={candidate.creStatus?.statusName}
                                        candidateName={`${candidate.firstName} ${candidate.lastName}`}
                                      />
                                    </>
                                  )}
                                </div>
                                {candidate.candidateCode ? (
                                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                                    {candidate.candidateCode}
                                  </div>
                                ) : null}
                                <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                                  {candidate.currentRole || ""}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="flex flex-col items-stretch gap-2">
                              <div className="flex items-center justify-center gap-1.5 w-full">
                              {(() => {
                                const phoneDigits = formatPhoneForLink(candidate);
                                return (
                                  <>
                                    <Button
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 shadow-sm transition-all"
                                      onClick={() => phoneDigits && window.open(`https://wa.me/${phoneDigits}`, "_blank")}
                                      disabled={!phoneDigits}
                                      title="WhatsApp"
                                    >
                                      <FaWhatsapp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-full text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm transition-all"
                                      onClick={() => phoneDigits && (window.location.href = `tel:${phoneDigits}`)}
                                      disabled={!phoneDigits}
                                      title="Call"
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
                                  <div className="font-medium text-slate-900 truncate max-w-[120px]">{recruiter.name}</div>
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
                              {createdBy?.name ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-slate-900 truncate max-w-[120px]">{createdBy.name}</div>
                                  {createdBy.email && (
                                    <div className="flex items-center gap-1.5 text-slate-700">
                                      <Mail className="h-3 w-3 text-gray-400" />
                                      <span className="truncate max-w-[120px]">{createdBy.email}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px]">System / Admin</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Status / Project Count */}
                          <TableCell className="px-4 py-3">
                            {isWorkflowActive ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 font-bold transition-all shadow-sm rounded-full gap-1.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (filters.status === "documentation") {
                                      navigate(`/candidates/${candidate.id}/documentation-workflow`);
                                    } else if (filters.status === "interview") {
                                      navigate(`/candidates/${candidate.id}/interview-workflow`);
                                    } else if (filters.status === "processing") {
                                      navigate(`/candidates/${candidate.id}/processing-workflow`);
                                    } else {
                                      navigate(`/candidates/${candidate.id}/workflow-details?type=${filters.status}`);
                                    }
                                  }}
                                >
                                  <Briefcase className="h-3.5 w-3.5" />
                                  <span>
                                    {candidate._count?.projects || 0} Project{(candidate._count?.projects !== 1) ? "s" : ""}
                                  </span>
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded-full ${statusInfo.bgColor}`}>
                                  <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.textColor.replace("700", "600")}`} />
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`${statusInfo.textColor} ${statusInfo.bgColor} ${statusInfo.borderColor} border font-medium text-[10px] px-2 py-0.5`}
                                >
                                  {statusName || "Unknown"}
                                </Badge>
                              </div>
                            )}
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

                          {/* Contact */}
                       

                          {/* Actions */}
                          <TableCell className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 border-0 shadow-xl">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                {canTransferCandidates && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setTransferDialog({
                                          isOpen: true,
                                          candidateId: candidate.id,
                                          candidateName: `${candidate.firstName} ${candidate.lastName}`,
                                          currentRecruiter: recruiter,
                                        })
                                      }
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
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
                  <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{(filters.page - 1) * filters.limit + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(filters.page * filters.limit, pagination.total)}</span> of <span className="font-semibold text-slate-700">{pagination.total}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs">
                      <Filter className="h-3.5 w-3.5 rotate-90" /> Prev
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                        if (pagination.totalPages <= 7 || p === 1 || p === pagination.totalPages || (p >= filters.page - 1 && p <= filters.page + 1)) {
                          return (
                            <Button
                              key={p}
                              variant={filters.page === p ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setFilters(f => ({ ...f, page: p }))}
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
                    <Button variant="outline" size="sm" disabled={filters.page === pagination.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs">
                      Next <Filter className="h-3.5 w-3.5 -rotate-90" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

      {/* Advanced Filters Sheet */}
      <AdvancedFiltersSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        filters={filters as any}
        setFilters={setFilters as any}
        isManagerOrAdmin={!!isManagerOrAdmin}
        isRecruiter={!!isRecruiter}
        handleResetFilters={handleResetFilters}
      />

      {/* Transfer Candidate Dialog */}
      {transferDialog.isOpen && (
        <TransferCandidateDialog
          open={transferDialog.isOpen}
          onOpenChange={(open) => setTransferDialog(prev => ({ ...prev, isOpen: open }))}
          candidateName={transferDialog.candidateName || "Candidate"}
          currentRecruiter={transferDialog.currentRecruiter}
          onConfirm={handleTransferCandidate}
          isLoading={isTransferring}
        />
      )}

      {/* Bulk Transfer Candidates Dialog */}
      <BulkTransferCandidateDialog
        open={bulkTransferDialog}
        onOpenChange={setBulkTransferDialog}
        selectedCount={selectedCandidateIds.size}
        candidates={candidates
          .filter((c: any) => selectedCandidateIds.has(c.id))
          .map((c: any) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
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
    </div>
  );
}
