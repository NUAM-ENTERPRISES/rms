import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { useGetAllProcessingCandidatesQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageViewer } from "@/components/molecules";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import {
    Users,
    XCircle,
    CheckCircle2,
    ClipboardList,
    Eye,
    Search,
    RefreshCw,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    UserCheck,
    ArrowUpRight,
    Mail,
    Phone,
    SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessingProgressBar } from "../components/ProcessingProgressBar";
import { formatProcessingStepLabel } from "../utils/formatProcessingStepLabel";
import { ProcessingAdvancedFiltersSheet } from "./components/ProcessingAdvancedFiltersSheet";
import {
  advancedFiltersToQueryParams,
  countProcessingAdvancedFilters,
  DEFAULT_PROCESSING_ADVANCED_FILTERS,
  parseProcessingAdvancedFiltersFromSearchParams,
  writeProcessingAdvancedFiltersToSearchParams,
  type ProcessingAdvancedFilters,
} from "../utils/processingListQuery";

const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
    blue: { card: "from-blue-50 via-white to-blue-50/30 border-blue-100", icon: "text-blue-600", iconBg: "bg-blue-100", value: "text-blue-700", ring: "ring-blue-400/50", dot: "bg-blue-500" },
    indigo: { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100", icon: "text-indigo-600", iconBg: "bg-indigo-100", value: "text-indigo-700", ring: "ring-indigo-400/50", dot: "bg-indigo-500" },
    emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
    amber: { card: "from-amber-50 via-white to-amber-50/30 border-amber-100", icon: "text-amber-600", iconBg: "bg-amber-100", value: "text-amber-700", ring: "ring-amber-400/50", dot: "bg-amber-500" },
    rose: { card: "from-rose-50 via-white to-rose-50/30 border-rose-100", icon: "text-rose-600", iconBg: "bg-rose-100", value: "text-rose-700", ring: "ring-rose-400/50", dot: "bg-rose-500" },
    slate: { card: "from-slate-50 via-white to-slate-50/30 border-slate-200", icon: "text-slate-600", iconBg: "bg-slate-100", value: "text-slate-700", ring: "ring-slate-400/50", dot: "bg-slate-500" },
    purple: { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600", iconBg: "bg-purple-100", value: "text-purple-700", ring: "ring-purple-400/50", dot: "bg-purple-500" },
};

export default function ProcessingDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef<HTMLDivElement>(null);
  const { user } = useAppSelector((state) => state.auth);
  
  // Filter States
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "assigned" | "in_progress" | "completed" | "cancelled"
  >("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<ProcessingAdvancedFilters>(() =>
    parseProcessingAdvancedFiltersFromSearchParams(searchParams),
  );

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [stepFilter, setStepFilter] = useState<string | null>(null);

  const syncAdvancedFiltersToUrl = useCallback(
    (nextFilters: ProcessingAdvancedFilters) => {
      const params = new URLSearchParams(searchParams);
      writeProcessingAdvancedFiltersToSearchParams(params, nextFilters);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleApplyAdvancedFilters = (nextFilters: ProcessingAdvancedFilters) => {
    setAdvancedFilters(nextFilters);
    syncAdvancedFiltersToUrl(nextFilters);
    setPage(1);
  };

  const handleResetAdvancedFilters = () => {
    setAdvancedFilters(DEFAULT_PROCESSING_ADVANCED_FILTERS);
    syncAdvancedFiltersToUrl(DEFAULT_PROCESSING_ADVANCED_FILTERS);
    setPage(1);
  };

  const advancedFilterCount = countProcessingAdvancedFilters(advancedFilters);

  // Fetch Projects for filter
  const { data: projectsData } = useGetProjectsQuery({ limit: 10 });
  const projects = projectsData?.data?.projects || [];

  const listQueryParams = useMemo(() => {
    const params: {
      search?: string;
      projectId?: string;
      roleCatalogId?: string;
      status?: typeof statusFilter;
      step?: string;
      filterType?: "total_processing";
      page: number;
      limit: number;
    } = {
      search: debouncedSearch || undefined,
      projectId: projectFilter === "all" ? undefined : projectFilter,
      roleCatalogId: roleFilter === "all" ? undefined : roleFilter,
      page,
      limit: pageSize,
    };

    if (stepFilter) {
      params.step = stepFilter;
      params.filterType = "total_processing";
    } else if (statusFilter === "all") {
      params.filterType = "total_processing";
    } else {
      params.status = statusFilter;
    }

    return {
      ...params,
      ...advancedFiltersToQueryParams(advancedFilters),
    };
  }, [debouncedSearch, projectFilter, roleFilter, statusFilter, stepFilter, page, pageSize, advancedFilters]);

  // API Call for Candidates
  const { data: apiResponse, isLoading, isFetching } = useGetAllProcessingCandidatesQuery(listQueryParams);

  const candidates = apiResponse?.data?.candidates || [];
  const pagination = apiResponse?.data?.pagination;
  const counts = apiResponse?.data?.counts;
  const totalProcessing =
    (counts?.assigned || 0) +
    (counts?.in_progress || 0) +
    (counts?.completed || 0) +
    (counts?.cancelled || 0);

  // Extract roles for selected project
  const rolesForSelectedProject = useMemo(() => {
    if (projectFilter === "all") return [];
    const selectedProject = projects.find(p => p.id === projectFilter);
    if (!selectedProject) return [];
    
    // Group by roleCatalogId to avoid duplicates in the filter
    const roles: {id: string, name: string}[] = [];
    const seen = new Set();
    
    selectedProject.rolesNeeded?.forEach(rn => {
      if (rn.roleCatalogId && !seen.has(rn.roleCatalogId)) {
        seen.add(rn.roleCatalogId);
        roles.push({
          id: rn.roleCatalogId,
          name: rn.designation
        });
      }
    });
    
    return roles;
  }, [projects, projectFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, stepFilter, projectFilter, roleFilter, advancedFilters]);

  const totalItems = pagination?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const processingTiles: any[] = [
    {
      type: "status",
      label: "Total Processing",
      status: "all",
      icon: ClipboardList,
      accent: "blue",
      value: totalProcessing,
    },
    {
      type: "status",
      label: "Untouched",
      status: "assigned",
      icon: UserCheck,
      accent: "blue",
      value: counts?.assigned || 0,
    },
    { type: "step", key: "offer_letter_verified", label: "Offer Letter", gradient: "from-blue-500 to-cyan-500" },
    { type: "step", key: "document_received", label: "Document Original Received", gradient: "from-yellow-400 to-amber-500" },
    { type: "step", key: "hrd", label: "HRD", gradient: "from-purple-500 to-violet-500" },
    { type: "step", key: "data_flow", label: "Data Flow", gradient: "from-pink-500 to-rose-500" },
    { type: "step", key: "eligibility", label: "Eligibility", accent: "indigo" },
    { type: "step", key: "prometric", label: "Licensing Exam", accent: "amber" },
    { type: "step", key: "council_registration", label: "Council", accent: "emerald" },
    { type: "step", key: "document_attestation", label: "Attestation", accent: "blue" },
    { type: "step", key: "medical", label: "Medical", accent: "emerald" },
    { type: "step", key: "biometrics", label: "Biometrics", accent: "blue" },
    { type: "step", key: "visa", label: "Visa", accent: "indigo" },
    { type: "step", key: "emigration", label: "Emigration", accent: "rose" },
    { type: "step", key: "ticket", label: "Ticket", accent: "emerald" },
    {
      type: "status",
      label: "Completed",
      status: "completed",
      accent: "emerald",
      icon: CheckCircle2,
      value: counts?.completed || 0,
    },
    {
      type: "status",
      label: "Cancelled",
      status: "cancelled",
      accent: "rose",
      icon: XCircle,
      value: counts?.cancelled || 0,
    },
  ];

  const handleTileClick = (tile: any) => {
    if (tile.type === "step") {
      setStepFilter(tile.key === stepFilter ? null : tile.key);
      setStatusFilter("all");
    } else {
      setStepFilter(null);
      setStatusFilter((prev) => (prev === tile.status ? "all" : tile.status));
      setStepFilter(null);
    }
    setPage(1);
    window.requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "in_progress": "bg-blue-100 text-blue-700 border-blue-200",
      "assigned": "bg-indigo-100 text-indigo-700 border-indigo-200",
      "completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "cancelled": "bg-rose-100 text-rose-700 border-rose-200"
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const displayStatus = (status: string) => {
    const labels: Record<string, string> = {
      "all": "All",
      "assigned": "Untouched",
      "in_progress": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled"
    };
    return labels[status] || status;
  };

  const formatStep = (step?: string) => formatProcessingStepLabel(step);

  const getStepTileCount = (stepKey: string) => {
    const stepCounts = counts?.steps ?? {};
    if (stepKey === "offer_letter_verified") {
      return (stepCounts.offer_letter_verified ?? 0) + (stepCounts.verify_offer_letter ?? 0);
    }
    return stepCounts[stepKey] ?? 0;
  };

  // Row background mapping to match tile colors (subtle)
  const rowBgClass = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-50/40";
      case "assigned":
        return "bg-indigo-50/40";
      case "completed":
        return "bg-emerald-50/40";
      case "cancelled":
        return "bg-rose-50/40";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <DashboardWelcomeHeader
          userName={user?.name || "Admin"}
          subtitle="Monitor and manage candidate processing workflows"
        />
          
          {(stepFilter || (statusFilter && statusFilter !== "all")) && (
            <Badge variant="outline" className="h-8 gap-2 bg-violet-50 text-violet-700 border-violet-200 self-start md:self-center">
              Filtered by: {stepFilter ? formatStep(stepFilter) : displayStatus(statusFilter)}
              <X
                className="h-3 w-3 cursor-pointer hover:text-rose-500"
                onClick={() => {
                  setStepFilter(null);
                  setStatusFilter("all");
                }}
              />
            </Badge>
          )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          {processingTiles.map((tile) => {
            const isStepTile = tile.type === "step";
            const isActive = isStepTile ? stepFilter === tile.key : statusFilter === tile.status && !stepFilter;
            const value = isStepTile ? getStepTileCount(tile.key) : tile.value;
            const s = accentStyles[tile.accent || "blue"];
            const Icon = isStepTile ? ClipboardList : tile.icon;

            return (
              <button
                key={`${tile.type}-${tile.label}`}
                type="button"
                onClick={() => handleTileClick(tile)}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all duration-200 focus:outline-none",
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
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 line-clamp-1">{tile.label}</p>
                    <p className={cn("text-2xl font-bold tabular-nums", s.value)}>{value}</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2 shadow-sm", s.iconBg)}>
                    <Icon className={cn("h-4 w-4", s.icon)} />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Filtered" : "Filter"}</span>
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden" ref={tableRef}>
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search by name, email or project..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 pl-10 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-blue-500/10 rounded-xl transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={projectFilter} onValueChange={(val) => { setProjectFilter(val); setRoleFilter("all"); }}>
                    <SelectTrigger className="h-11 w-[200px] bg-white border-slate-200 rounded-xl shadow-sm focus:ring-blue-500/10 transition-all">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
                    </SelectContent>
                  </Select>

                  {projectFilter !== "all" && (
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-11 w-[180px] bg-white border-slate-200 rounded-xl shadow-sm focus:ring-blue-500/10 transition-all">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Roles</SelectItem>
                        {rolesForSelectedProject.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-11 shrink-0 gap-2 rounded-xl border px-4 shadow-sm",
                      isAdvancedFiltersOpen || advancedFilterCount > 0
                        ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                    onClick={() => setIsAdvancedFiltersOpen(true)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {advancedFilterCount > 0 ? (
                      <Badge className="border-0 bg-white/20 px-1.5 text-[10px] text-white">
                        {advancedFilterCount}
                      </Badge>
                    ) : null}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-500 p-2.5 shadow-md">
                  <Users className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {stepFilter ? formatStep(stepFilter) : (statusFilter !== 'all' ? displayStatus(statusFilter || "") : "Active Candidates")}
                  </h2>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> candidate{pagination?.total !== 1 ? "s" : ""} in processing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isFetching && <RefreshCw className="h-5 w-5 animate-spin text-violet-500" />}
              </div>
            </div>
          </div>

          <div className="p-0">
            <div className="overflow-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-slate-200">
              <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[220px]">
                    Candidate
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[220px]">
                    Contact
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Project & Role
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Recruiter
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Step
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[120px]">
                    Progress
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 text-xs uppercase tracking-wider w-[80px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                     <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                        <p className="text-sm font-medium text-slate-500">Loading candidates...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : candidates.length > 0 ? (
                  candidates.map((procCandidate) => (
                    <TableRow 
                      key={procCandidate.id}
                      className={`group transition-colors border-b border-slate-100 hover:shadow-sm ${rowBgClass(procCandidate.processingStatus)}`}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <ImageViewer
                            title={`${procCandidate.candidate.firstName} ${procCandidate.candidate.lastName}`}
                            src={procCandidate.candidate.profileImage || null}
                            className="h-9 w-9 rounded-full"
                            ariaLabel={`View full image for ${procCandidate.candidate.firstName} ${procCandidate.candidate.lastName}`}
                            enableHoverPreview={true}
                          />
                          <div className="min-w-0">
                            <button
                              className="font-bold text-sm text-slate-900 truncate text-left hover:text-violet-600 transition-colors"
                              onClick={(e) => { e.stopPropagation(); navigate(`/processingCandidateDetails/${procCandidate.id}`); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/processingCandidateDetails/${procCandidate.id}`); } }}
                            >
                              {procCandidate.candidate.firstName} {procCandidate.candidate.lastName}
                            </button>
                            {procCandidate.candidate.candidateCode && (
                              <div className="mt-1">
                                <div className="inline-flex max-w-full items-center rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 border border-slate-200">
                                  {procCandidate.candidate.candidateCode}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3" /> {procCandidate.assignedTo?.name || "Unassigned"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="text-xs text-slate-600 flex flex-col gap-1 min-w-0">
                          <div className="flex items-start gap-2 min-w-0">
                            <Mail className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" />
                            <span className="min-w-0 whitespace-normal break-all">{procCandidate.candidate.email || "—"}</span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <Phone className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" />
                            <span className="min-w-0 whitespace-normal break-words">{procCandidate.candidate.mobileNumber || "—"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-700 font-bold leading-tight">{procCandidate.project.title}</p>
                          <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide">
                            {procCandidate.role.designation}
                          </p>
                          {procCandidate.project?.country?.flag && (
                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span
                                title={procCandidate.project.country.flagName || procCandidate.project.country.name}
                                aria-label={procCandidate.project.country.flagName || procCandidate.project.country.name}
                                className="text-lg leading-none"
                              >
                                {procCandidate.project.country.flag}
                              </span>
                              <span className="font-medium">{procCandidate.project.country.name}</span>
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                             <UserCheck className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {procCandidate.candidateProjectMap?.recruiter?.name || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-xs font-bold border-slate-300 bg-white whitespace-nowrap px-2.5 py-0.5">
                          {formatStep(procCandidate.step)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          className={`text-xs border-2 font-black whitespace-nowrap px-3 py-1 ${getStatusBadge(procCandidate.processingStatus)}`}
                        >
                          {displayStatus(procCandidate.processingStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <ProcessingProgressBar
                          processingStatus={procCandidate.processingStatus}
                          progressCount={procCandidate.progressCount}
                          progressCompletedSteps={procCandidate.progressCompletedSteps}
                          progressTotalSteps={procCandidate.progressTotalSteps}
                          progressPendingSteps={procCandidate.progressPendingSteps}
                        />
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-9 w-9 p-0 hover:bg-violet-100 hover:text-violet-700 rounded-full transition-all hover:scale-110 shadow-sm"
                          onClick={() => navigate(`/processingCandidateDetails/${procCandidate.id}`)}
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Filter className="h-10 w-10 opacity-20" />
                        <p className="text-lg font-bold">No candidates found</p>
                        <p className="text-sm">Try adjusting your filters or search term</p>
                        <Button variant="link" onClick={() => {
                          setSearch("");
                          setProjectFilter("all");
                          setRoleFilter("all");
                          setStatusFilter("all");
                          setStepFilter(null);
                        }}>Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
              <div className="text-sm text-slate-600">
                Showing {startItem} - {endItem} of {totalItems}
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft />
                </Button>
                <div className="px-2 text-sm text-slate-700">Page {page} / {totalPages}</div>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProcessingAdvancedFiltersSheet
        isOpen={isAdvancedFiltersOpen}
        onOpenChange={setIsAdvancedFiltersOpen}
        filters={advancedFilters}
        onApply={handleApplyAdvancedFilters}
        onReset={handleResetAdvancedFilters}
      />
    </div>
  );
}

