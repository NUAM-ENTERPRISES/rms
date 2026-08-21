import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import ProjectRoleFilter from "@/components/molecules/ProjectRoleFilter";
import {
    Users,
    XCircle,
    CheckCircle2,
    ClipboardList,
    Eye,
    Search,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    Mail,
    Phone,
    ArrowUpRight,
    SlidersHorizontal,
    AlertCircle,
    PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/app/hooks";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { Can } from "@/components/auth/Can";
import { useDebounce } from "@/hooks/useDebounce";
import { useGetAllProcessingCandidatesAdminQuery } from "@/features/processing/data/processing.endpoints";
import { ProcessingProgressBar } from "../components/ProcessingProgressBar";
import { formatProcessingStepLabel } from "../utils/formatProcessingStepLabel";
import { getProcessingStepTileCount } from "../utils/getProcessingStepTileCount";
import { ProcessingAdvancedFiltersSheet } from "./components/ProcessingAdvancedFiltersSheet";
import {
  advancedFiltersToQueryParams,
  countProcessingAdvancedFilters,
  DEFAULT_PROCESSING_ADVANCED_FILTERS,
  parseProcessingAdvancedFiltersFromSearchParams,
  writeProcessingAdvancedFiltersToSearchParams,
  type ProcessingAdvancedFilters,
} from "../utils/processingListQuery";

// This page is intentionally not wired to any API. It uses local dummy data
// and is wrapped with <Can> so only admin/manager/system admin roles can view it.

export default function ProcessingAdminDashboardPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAppSelector((state) => state.auth);
    const tableRef = useRef<HTMLDivElement>(null);

    const handleTileClick = (tile: any) => {
        if (tile.type === "filter") {
            setAwaitingRequestsFilter((prev) => !prev);
            setStepFilter(null);
            setStatusFilter("all");
        } else if (tile.type === "step") {
            setAwaitingRequestsFilter(false);
            setStatusFilter("all");
            setStepFilter((prev) => (prev === tile.key ? null : tile.key));
        } else {
            setAwaitingRequestsFilter(false);
            setStepFilter(null);
            setStatusFilter((prev) => (prev === tile.status ? "all" : tile.status));
        }
        setPage(1);
        window.requestAnimationFrame(() => {
            tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    // Local UI state (same as production page)
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "in_progress" | "completed" | "cancelled" | "on_hold" | "visa_stamped">("all");
    const [awaitingRequestsFilter, setAwaitingRequestsFilter] = useState(
        () => searchParams.get("filter") === "awaiting_requests",
    );
    const [stepFilter, setStepFilter] = useState<string | null>(null);
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<ProcessingAdvancedFilters>(() =>
        parseProcessingAdvancedFiltersFromSearchParams(searchParams),
    );

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

    const adminQueryParams = useMemo(() => {
        const params: Record<string, unknown> = {
            search: debouncedSearch || undefined,
            projectId: projectFilter === "all" ? undefined : projectFilter,
            roleCatalogId: roleFilter === "all" ? undefined : roleFilter,
            page,
            limit: pageSize,
            ...advancedFiltersToQueryParams(advancedFilters),
        };

        if (awaitingRequestsFilter) {
            params.filterType = "awaiting_requests";
            params.status = undefined;
            params.step = undefined;
        } else if (stepFilter) {
            params.step = stepFilter;
            params.filterType = "total_processing";
            params.status = undefined;
        } else if (statusFilter === "all") {
            params.filterType = "total_processing";
            params.status = undefined;
        } else {
            params.status = statusFilter;
            params.filterType = undefined;
            params.step = undefined;
        }

        return params;
    }, [
        debouncedSearch,
        projectFilter,
        roleFilter,
        page,
        pageSize,
        stepFilter,
        statusFilter,
        awaitingRequestsFilter,
        advancedFilters,
    ]);

    const { data: apiResponse, isLoading, isFetching } = useGetAllProcessingCandidatesAdminQuery(adminQueryParams);

    const candidates = apiResponse?.data?.candidates || [];
    const pagination = apiResponse?.data?.pagination;



    // Pagination (driven by API when available)
    const totalItems = pagination?.total ?? candidates.length;
    const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));
    useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, stepFilter, awaitingRequestsFilter, projectFilter, roleFilter, pageSize, advancedFilters]);
    const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    const counts: { all?: number; assigned?: number; in_progress?: number; completed?: number; cancelled?: number; on_hold?: number; visa_stamped?: number; pendingStatusChangeRequests?: number; steps?: Record<string, number> } = apiResponse?.data?.counts ?? {};
    const totalProcessing = counts?.all ?? ((counts.assigned || 0) + (counts.in_progress || 0) + (counts.completed || 0) + (counts.cancelled || 0));

    const processingTiles: Array<any> = [
      {
        type: "status",
        label: "Total Processing",
        status: "all",
        icon: ClipboardList,
        color: "text-blue-600",
        gradient: "from-blue-50 to-blue-100/50",
        iconBg: "bg-blue-200/40",
        value: totalProcessing,
      },
      {
        type: "status",
        label: "Untouched",
        status: "assigned",
        icon: UserCheck,
        color: "text-blue-600",
        gradient: "from-blue-50 to-blue-100/50",
        iconBg: "bg-blue-200/40",
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
        label: "Processing Hold",
        status: "on_hold",
        accent: "amber",
        icon: PauseCircle,
        value: counts?.on_hold || 0,
      },
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
      {
        type: "filter",
        label: "Awaiting Requests",
        filterType: "awaiting_requests",
        accent: "orange",
        icon: AlertCircle,
        value: counts?.pendingStatusChangeRequests || 0,
      },
    ];

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            "in_progress": "bg-blue-100 text-blue-700 border-blue-200",
            "assigned": "bg-indigo-100 text-indigo-700 border-indigo-200",
            "completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
            "cancelled": "bg-rose-100 text-rose-700 border-rose-200",
            "on_hold": "bg-amber-100 text-amber-800 border-amber-200",
        };
        return styles[status] || "bg-muted text-foreground";
    };

    const displayStatus = (status: string) => {
        const labels: Record<string, string> = {
            "all": "All",
            "assigned": "Untouched",
            "in_progress": "In Progress",
            "completed": "Completed",
            "cancelled": "Cancelled",
            "on_hold": "Processing Hold",
        };
        return labels[status] || status;
    };

    const formatStep = (step?: string) => formatProcessingStepLabel(step);

    const rowBgClass = (status: string) => {
        switch (status) {
            case "in_progress": return "bg-blue-50/40";
            case "assigned": return "bg-indigo-50/40";
            case "completed": return "bg-emerald-50/40";
            case "cancelled": return "bg-rose-50/60";
            case "on_hold": return "bg-amber-50/60";
            default: return "";
        }
    };

    const getCandidateRowBgClass = (
        processingStatus: string,
        pendingRequest?: { requestType: string } | null,
    ) => {
        if (processingStatus === "cancelled") {
            return "bg-rose-50/60";
        }
        if (processingStatus === "on_hold") {
            return "bg-amber-50/60";
        }
        if (pendingRequest) {
            return "bg-orange-100";
        }
        return rowBgClass(processingStatus);
    };

    return (
        <Can
            roles={["Managing Director", "Director", "Department Head", "Admin", "Processing Team Lead"]}
            fallback={<div className="p-8 text-center text-muted-foreground">Not authorized</div>}
        >
            <div className="w-full space-y-6">
                    <DashboardWelcomeHeader
                        userName={user?.name || "Processing Team Lead"}
                        subtitle="Monitor and manage candidate processing workflows"
                    />

                    {/* <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-3 shadow-lg">
                                <ClipboardList className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-foreground">Processing Overview — Admin</h1>
                                <p className="text-muted-foreground font-medium">Admin view: totals, trends and a quick look at processing status</p>
                            </div>
                        </div>

                        {(stepFilter || (statusFilter && statusFilter !== 'all')) && (
                            <Badge variant="outline" className="h-8 gap-2 bg-violet-50 text-violet-700 border-violet-200 self-start md:self-center">
                                Filtered by: {stepFilter ? formatStep(stepFilter) : displayStatus(statusFilter)}
                                <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => { setStepFilter(null); setStatusFilter('all'); }} />
                            </Badge>
                        )}
                    </header> */}

                    <div className="grid auto-rows-fr grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                        {processingTiles.map((tile) => {
                            const isStepTile = tile.type === "step";
                            const isActive = tile.type === "filter"
                                ? awaitingRequestsFilter
                                : isStepTile
                                  ? stepFilter === tile.key
                                  : statusFilter === tile.status && !stepFilter && !awaitingRequestsFilter;
                            const value = isStepTile ? getProcessingStepTileCount(tile.key, counts?.steps) : tile.value;
                            const Icon = isStepTile ? ClipboardList : tile.icon;

                            return (
                                <DashboardStatTile
                                    key={`${tile.type}-${tile.label}`}
                                    accent={tile.accent || "blue"}
                                    label={tile.label}
                                    value={value}
                                    icon={Icon}
                                    size="compact"
                                    active={isActive}
                                    interactive
                                    footerText={isActive ? "Filtered" : "Filter"}
                                    onClick={() => handleTileClick(tile)}
                                />
                            );
                        })}
                    </div>

                    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden" ref={tableRef}>
                        <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            placeholder="Search by name, email or project..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="h-11 pl-10 bg-muted/50 border-border focus:bg-card focus:ring-blue-500/10 rounded-xl transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ProjectRoleFilter
                                            value={{ projectId: projectFilter, roleCatalogId: roleFilter }}
                                            onChange={({ projectId, roleCatalogId }) => {
                                                setProjectFilter(projectId);
                                                setRoleFilter(roleCatalogId);
                                            }}
                                            className="items-center"
                                        />

                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "h-11 shrink-0 gap-2 rounded-xl border px-4 shadow-sm",
                                                isAdvancedFiltersOpen || advancedFilterCount > 0
                                                    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                                            )}
                                            onClick={() => setIsAdvancedFiltersOpen(true)}
                                        >
                                            <SlidersHorizontal className="h-4 w-4" />
                                            Filters
                                            {advancedFilterCount > 0 ? (
                                                <Badge className="border-0 bg-card/20 px-1.5 text-[10px] text-white">
                                                    {advancedFilterCount}
                                                </Badge>
                                            ) : null}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-b border-border bg-card">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="shrink-0 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-500 p-2.5 shadow-md">
                                        <Users className="h-5 w-5 text-white" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-foreground">
                                            {awaitingRequestsFilter
                                                ? "Awaiting Requests"
                                                : stepFilter
                                                  ? formatStep(stepFilter)
                                                  : statusFilter !== "all"
                                                    ? displayStatus(statusFilter)
                                                    : "Active Candidates"}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-semibold text-foreground">{totalItems}</span> candidate{totalItems !== 1 ? "s" : ""} in processing
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
                                        <TableRow className="bg-muted/80 hover:bg-muted">
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider w-[220px]">Candidate</TableHead>
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider w-[220px]">Contact</TableHead>
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">Project & Role</TableHead>
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">Recruiter</TableHead>
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">Agent</TableHead>
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">Processing</TableHead>
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider w-[120px]">Progress</TableHead>
                                            <TableHead className="text-center font-bold text-foreground text-xs uppercase tracking-wider w-[80px]">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-64 text-center">
                                                    <div className="flex flex-col items-center justify-center space-y-4">
                                                        <svg className="h-10 w-10 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                                        <p className="text-sm font-medium text-muted-foreground">Loading candidates...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : candidates.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-64 text-center">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                                        <Filter className="h-10 w-10 opacity-20" />
                                                        <p className="text-lg font-bold">No candidates found</p>
                                                        <p className="text-sm">Try adjusting your filters or search term</p>
                                                        <Button variant="link" onClick={() => { setSearch(""); setProjectFilter("all"); setRoleFilter("all"); setStatusFilter("all"); setAwaitingRequestsFilter(false); setStepFilter(null); }}>Clear all filters</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            candidates.map((procCandidate) => {
                                                const pendingRequest = (procCandidate as { pendingStatusChangeRequest?: { id: string; requestType: string; createdAt: string } }).pendingStatusChangeRequest;
                                                return (
                                                <TableRow key={procCandidate.id} className={cn(
                                                    "group transition-colors border-b border-border hover:shadow-sm",
                                                    getCandidateRowBgClass(
                                                        procCandidate.processingStatus,
                                                        pendingRequest,
                                                    ),
                                                )}>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <ImageViewer title={`${procCandidate.candidate.firstName} ${procCandidate.candidate.lastName}`} src={procCandidate.candidate.profileImage || null} className="h-9 w-9 rounded-full" ariaLabel={`View full image for ${procCandidate.candidate.firstName} ${procCandidate.candidate.lastName}`} enableHoverPreview={true} />
                                                            <div className="min-w-0">
                                                                <button className="font-bold text-sm text-foreground truncate text-left hover:text-violet-600 transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/processingCandidateDetails/${procCandidate.id}`); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/processingCandidateDetails/${procCandidate.id}`); } }}>{procCandidate.candidate.firstName} {procCandidate.candidate.lastName}</button>
                                                                {procCandidate.candidate.candidateCode && (
                                                                    <div className="mt-1">
                                                                        <div className="inline-flex max-w-full items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono font-bold text-foreground border border-border">
                                                                            {procCandidate.candidate.candidateCode}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="text-xs text-muted-foreground flex flex-col gap-1 min-w-0">
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
                                                            <p className="text-sm text-foreground font-bold leading-tight">{procCandidate.project.title}</p>
                                                            <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide">{procCandidate.role.designation}</p>
                                                            {procCandidate.project?.country?.flag && (
                                                                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5"><span title={procCandidate.project.country.flagName || procCandidate.project.country.name} aria-label={procCandidate.project.country.flagName || procCandidate.project.country.name} className="text-lg leading-none">{procCandidate.project.country.flag}</span><span className="font-medium">{procCandidate.project.country.name}</span></p>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-foreground">
                                                                {procCandidate.candidateProjectMap?.recruiter?.name || "N/A"}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-foreground">
                                                                {procCandidate.candidate?.agent?.name || "—"}
                                                            </span>
                                                            {procCandidate.candidate?.agent?.agentType && (
                                                                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                                                                    {procCandidate.candidate.agent.agentType}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="min-w-0">
                                                            <div className={`inline-block rounded-xl px-3 py-2 border ${procCandidate.assignedTo ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                                                                <p className={`text-sm font-medium ${procCandidate.assignedTo ? 'text-foreground' : 'text-rose-700'}`}>{procCandidate.assignedTo?.name || "Unassigned"}</p>
                                                                <p className={`text-xs truncate ${procCandidate.assignedTo ? 'text-indigo-700' : 'text-rose-600'}`}>{procCandidate.assignedTo?.email || "—"}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>

    
                                                    <TableCell className="py-4"><Badge className={`text-xs border-2 font-black whitespace-nowrap px-3 py-1 ${getStatusBadge(procCandidate.processingStatus)}`}>{displayStatus(procCandidate.processingStatus)}</Badge>
                                                        {pendingRequest && (
                                                            <Badge className="mt-1 block w-fit text-[10px] bg-orange-200 text-orange-900 border-orange-300 font-semibold">
                                                                Review Request
                                                            </Badge>
                                                        )}
                                                        {!pendingRequest && procCandidate.processingStatus === "on_hold" && (
                                                            <Badge className="mt-1 block w-fit text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                                                                On hold
                                                            </Badge>
                                                        )}
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

                                                    <TableCell className="py-4 text-center"><Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-violet-100 hover:text-violet-700 rounded-full transition-all hover:scale-110 shadow-sm" onClick={() => navigate(pendingRequest ? `/processingCandidateDetails/${procCandidate.id}?reviewRequest=${pendingRequest.id}` : `/processingCandidateDetails/${procCandidate.id}`)}><Eye className="h-5 w-5" /></Button></TableCell>
                                                </TableRow>
                                            );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
                                <div className="text-sm text-muted-foreground">Showing {startItem} - {endItem} of {totalItems}</div>
                                <div className="flex items-center gap-2">
                                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10 / page</SelectItem>
                                            <SelectItem value="25">25 / page</SelectItem>
                                            <SelectItem value="50">50 / page</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft /></Button>
                                    <div className="px-2 text-sm text-foreground">Page {page} / {totalPages}</div>
                                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight /></Button>
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
                showAssignedToFilter
            />
        </Can>
    );
}
