import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
  Eye,
  Users,
  FileText,
  Mic,
  Settings,
  CheckCircle,
  Send,
  UserCheck,
  Phone,
  Mail,
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ProjectRoleFilter, ImageViewer } from "@/components/molecules";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useGetProjectOverviewQuery } from "@/services/candidateProjectsApi";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { AdvancedFiltersSheet } from "../components/AdvancedFiltersSheet";
import { useAppSelector } from "@/app/hooks";
import { FaWhatsapp } from "react-icons/fa";


// -------------------------------------------------------------------
// Status tile config (matches seed main statuses)
// -------------------------------------------------------------------
type TileDef = {
  key: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
};

const TILE_ACCENT_STYLES: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
  blue:    { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",       icon: "text-blue-600",    iconBg: "bg-blue-100",    value: "text-blue-700",    ring: "ring-blue-400/50",    dot: "bg-blue-500"    },
  indigo:  { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100", icon: "text-indigo-600",  iconBg: "bg-indigo-100",  value: "text-indigo-700",  ring: "ring-indigo-400/50",  dot: "bg-indigo-500"  },
  amber:   { card: "from-amber-50 via-white to-amber-50/30 border-amber-100",   icon: "text-amber-600",   iconBg: "bg-amber-100",   value: "text-amber-700",   ring: "ring-amber-400/50",   dot: "bg-amber-500"   },
  purple:  { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600",  iconBg: "bg-purple-100",  value: "text-purple-700",  ring: "ring-purple-400/50",  dot: "bg-purple-500"  },
  orange:  { card: "from-orange-50 via-white to-orange-50/30 border-orange-100", icon: "text-orange-600",  iconBg: "bg-orange-100",  value: "text-orange-700",  ring: "ring-orange-400/50",  dot: "bg-orange-500"  },
  emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
};

const TILES: TileDef[] = [
  { key: "all",        label: "Total Candidates",  subtitle: "In this project",        icon: Users,        accent: "blue"    },
  { key: "nominated",  label: "Registered",         subtitle: "Submitted candidates",    icon: Send,         accent: "indigo"  },
  { key: "documents",  label: "Documents",          subtitle: "In document stage",       icon: FileText,     accent: "amber"   },
  { key: "interview",  label: "Interview",          subtitle: "Scheduled / completed",   icon: Mic,          accent: "purple"  },
  { key: "processing", label: "Processing",         subtitle: "Under processing",        icon: Settings,     accent: "orange"  },
  { key: "final",      label: "Deployed",           subtitle: "Successfully deployed",   icon: CheckCircle,  accent: "emerald" },
];

// Map mainStatus → badge style
const STATUS_BADGE: Record<
  string,
  { textColor: string; bgColor: string; borderColor: string }
> = {
  nominated: {
    textColor: "text-indigo-700",
    bgColor: "bg-indigo-100",
    borderColor: "border-indigo-300",
  },
  documents: {
    textColor: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
  },
  interview: {
    textColor: "text-purple-700",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
  },
  processing: {
    textColor: "text-orange-700",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
  },
  final: {
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
  },
};

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
export default function ProjectCandidatesOverviewPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebounce(search, 500);

  const handleTileClick = (tileKey: string) => {
    setActiveFilter(tileKey);
    setPage(1);
  };

  // Project and Role state
  const [projectRole, setProjectRole] = useState({
    projectId: "all",
    roleCatalogId: "all",
  });

  // Date filter state
  const [dateRange, setDateRange] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Advanced Filters
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    countryPreferences: [] as string[],
    gender: "all",
    visaTypes: [] as string[],
    sectorTypes: [] as string[],
    qualification: "",
    minExperience: undefined as number | undefined,
    maxExperience: undefined as number | undefined,
    minAge: undefined as number | undefined,
    maxAge: undefined as number | undefined,
  });

  const user = useAppSelector((state) => state.auth.user);
  const isManagerOrAdmin = useMemo(() => 
    user?.roles?.some(r => ["CEO", "Director", "Manager", "Recruiter Manager", "Team Head", "System Admin"].includes(r)) || false,
    [user]
  );
  const isRecruiter = useMemo(() => 
    user?.roles?.includes("Recruiter") || false,
    [user]
  );

  const handleResetFilters = () => {
    setAdvancedFilters({
      countryPreferences: [],
      gender: "all",
      visaTypes: [],
      sectorTypes: [],
      qualification: "",
      minExperience: undefined,
      maxExperience: undefined,
      minAge: undefined,
      maxAge: undefined,
    });
    setSearch("");
    setDateRange("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setActiveFilter("all");
    setPage(1);
  };

  // Auto-select the first project on initial load handled by ProjectRoleFilter via defaultProject prop
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({ limit: 10, page: 1 });
  const allProjects = useMemo(() => projectsData?.data?.projects || [], [projectsData]);

  // Fetch project overview data - skip until we have a real project ID
  const shouldSkipOverview = projectRole.projectId === "all" || !projectRole.projectId || isLoadingProjects;

  const { data: overviewData, isLoading, isFetching, isError } = useGetProjectOverviewQuery(
    {
      projectId: projectRole.projectId,
      roleCatalogId: projectRole.roleCatalogId !== "all" ? projectRole.roleCatalogId : undefined,
      search: debouncedSearch || undefined,
      mainStatus: activeFilter !== "all" ? activeFilter : undefined,
      period: dateRange !== "all" && dateRange !== "custom" ? dateRange : undefined,
      startDate: dateRange === "custom" && dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
      endDate: dateRange === "custom" && dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
      gender: advancedFilters.gender !== "all" ? advancedFilters.gender : undefined,
      countries: advancedFilters.countryPreferences.length > 0 ? advancedFilters.countryPreferences.join(",") : undefined,
      visaTypes: advancedFilters.visaTypes.length > 0 ? advancedFilters.visaTypes.join(",") : undefined,
      sectors: advancedFilters.sectorTypes.length > 0 ? advancedFilters.sectorTypes.join(",") : undefined,
      qualification: advancedFilters.qualification || undefined,
      minExp: advancedFilters.minExperience,
      maxExp: advancedFilters.maxExperience,
      minAge: advancedFilters.minAge,
      maxAge: advancedFilters.maxAge,
      page,
      limit,
    },
    { skip: shouldSkipOverview }
  );

  const summary = overviewData?.summary;
  const candidates = (overviewData?.data as any[]) || [];
  const meta = overviewData?.meta;
  const projectTitle = overviewData?.projectTitle;

  const counts: Record<string, number> = useMemo(() => {
    if (!summary) {
      return {
        all: 0,
        nominated: 0,
        documents: 0,
        interview: 0,
        processing: 0,
        final: 0,
      };
    }
    return {
      all: summary.totalCandidates,
      nominated: summary.nominatedCount,
      documents: summary.documentsCount,
      interview: summary.interviewCount,
      processing: summary.processingCount,
      final: summary.finalCount,
    };
  }, [summary]);

  // Format date – DD MMM YYYY
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPhoneForLink = (c: {
    countryCode?: string | null;
    mobileNumber?: string | null;
    mobile?: string | null;
    contact?: string | null;
  }) => {
    const raw =
      String(c?.countryCode ?? "") +
      String(c?.mobileNumber ?? c?.mobile ?? c?.contact ?? "");
    const digits = raw.replace(/\D/g, "");
    return digits || null;
  };

  const getActiveTileLabel = () =>
    TILES.find((t) => t.key === activeFilter)?.label ?? "All Candidates";

  // Show a loading state while projects are being fetched and auto-selected
  if (projectRole.projectId === "all") {
    if (isLoadingProjects) {
      return (
        <div className="min-h-screen">
          <div className="w-full max-w-[98%] mx-auto space-y-4 mt-8 px-4 text-center">
            <div className="bg-white p-12 rounded-3xl shadow-xl border-0 border-slate-100">
              <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-slate-500 text-lg font-medium animate-pulse">Loading projects...</p>
            </div>
          </div>
        </div>
      );
    }

    if (allProjects.length === 0) {
      return (
        <div className="min-h-screen">
          <div className="w-full max-w-[98%] mx-auto space-y-4 mt-8 px-4 text-center">
            <div className="bg-white p-12 rounded-3xl shadow-xl border-0 border-slate-100">
              <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-lg font-medium">No projects found.</p>
              <p className="text-slate-400 text-sm mt-2">Please create a project first to view the candidates overview.</p>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-[98%] mx-auto space-y-4 mt-2 px-4">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              <span>{projectTitle || "Candidate Overview"}</span>
            </h1>
            <p className="text-slate-500 text-sm">
              Comprehensive dashboard for candidate tracking and status overview
            </p>
          </div>
        </div>

        {/* ── Search & Filter ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, role, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <ProjectRoleFilter
                value={projectRole}
                onChange={(v) => {
                  setProjectRole(v);
                  setPage(1);
                }}
                defaultProject={true}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdvancedFiltersOpen(true)}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border transition-all duration-200 shrink-0 ${
                  isAdvancedFiltersOpen
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Filters</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Status Tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {TILES.map((tile, i) => {
            const Icon = tile.icon;
            const s = TILE_ACCENT_STYLES[tile.accent];
            const isActive = activeFilter === tile.key;

            return (
              <motion.button
                key={tile.key}
                type="button"
                onClick={() => {
                  handleTileClick(tile.key);
                  tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 + i * 0.08 }}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-2.5 right-2.5 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 leading-tight">{tile.label}</p>
                    <p className={cn("text-2xl font-bold tabular-nums", s.value)}>{counts[tile.key] ?? 0}</p>
                    <p className="text-[10px] text-slate-500">{tile.subtitle}</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2 shadow-sm", s.iconBg)}>
                    <Icon className={cn("h-4 w-4", s.icon)} />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Candidates Table ── */}
        <div ref={tableRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Table Header Bar */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate">{getActiveTileLabel()}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {meta?.total ?? 0} candidate{(meta?.total ?? 0) !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-[400px]">  
              {isError ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                  <p className="text-red-500 font-medium">Failed to load overview data</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : isLoading || isFetching ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium animate-pulse">Fetching overview data...</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 border-b border-gray-200">
                        <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                          Candidate
                        </TableHead>
                        <TableHead className="h-11 px-6 text-center text-xs font-medium uppercase tracking-wider text-gray-600">
                          Contact
                        </TableHead>
                        <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                          Project & Role
                        </TableHead>
                        <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                          Stage
                        </TableHead>
                        <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                          Sub Status
                        </TableHead>
                        <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                          Recruiter
                        </TableHead>
                        <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                          Applied At
                        </TableHead>
                        <TableHead className="h-11 px-6 text-right text-xs font-medium uppercase tracking-wider text-gray-600">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {Array.isArray(candidates) && candidates.map((item) => {
                        const candidate = item.candidate;
                        if (!candidate) return null;

                        const statusName = item.mainStatus?.name || "nominated";
                        const badge = STATUS_BADGE[statusName] ?? STATUS_BADGE.nominated;

                        return (
                          <TableRow
                            key={item.id}
                            className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors last:border-b-0 group"
                          >
                            <TableCell className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <ImageViewer
                                  src={candidate.profileImage}
                                  title={`${candidate.firstName} ${candidate.lastName}`}
                                  className="h-11 w-11 shadow"
                                />
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-all duration-200"
                                  >
                                    {candidate.firstName} {candidate.lastName}
                                  </button>
                                  {candidate.candidateCode ? (
                                    <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                                      {candidate.candidateCode}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="px-6 py-5 text-center">
                              <div className="flex flex-col items-stretch gap-2">
                                <div className="flex items-center justify-center gap-1.5 w-full">
                                  {/* {(() => {
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
                                  })()} */}
                                </div>
                                <div className="w-full min-w-0 text-center text-xs text-slate-500 space-y-1">
                                  {candidate.email ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                                      <span className="text-gray-700 truncate max-w-[220px]">
                                        {candidate.email}
                                      </span>
                                    </div>
                                  ) : null}
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                                    <span className="text-gray-700">
                                      {candidate.countryCode} {candidate.mobileNumber}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                                  {item.project?.title || "N/A"}
                                </span>
                                <span className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                  {item.roleNeeded?.roleCatalog?.label || item.roleNeeded?.designation || "N/A"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="px-6 py-5">
                              <Badge
                                variant="outline"
                                className={`${badge.textColor} ${badge.bgColor} ${badge.borderColor} border font-medium text-xs px-2.5 py-1 capitalize`}
                              >
                                {item.mainStatus?.label || statusName}
                              </Badge>
                            </TableCell>

                            <TableCell className="px-6 py-5">
                              <span className="text-sm text-slate-600">
                                {item.subStatus?.label || "Initial"}
                              </span>
                            </TableCell>

                            <TableCell className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-slate-800">
                                  {item.recruiter?.name || "System"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="px-6 py-5 text-sm text-gray-600">
                              {formatDate(item.createdAt)}
                            </TableCell>
                           
                            <TableCell className="px-6 py-5 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/candidates/${candidate.id}`)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {candidates.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <UserCheck className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-600">No candidates found</p>
                      <p className="text-sm text-slate-400 text-center max-w-xs">Try selecting a different filter or project.</p>
                    </div>
                  )}
                </>
              )}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}–{Math.min(page * limit, meta.total)}</span> of{" "}
                <span className="font-semibold text-slate-700">{meta.total}</span> candidates
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((n) => {
                    if (meta.totalPages <= 7 || n === 1 || n === meta.totalPages || (n >= page - 1 && n <= page + 1)) {
                      return (
                        <Button
                          key={n}
                          variant={page === n ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(n)}
                          className={cn("h-8 w-8 p-0 text-xs", page === n ? "bg-blue-600 hover:bg-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
                        >
                          {n}
                        </Button>
                      );
                    } else if (n === page - 2 || n === page + 2) {
                      return <span key={n} className="text-slate-300 text-xs px-0.5">…</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdvancedFiltersSheet
        isOpen={isAdvancedFiltersOpen}
        onOpenChange={setIsAdvancedFiltersOpen}
        filters={{
          ...advancedFilters,
          search,
          page,
          limit,
          dateFilter: dateRange,
          dateFrom,
          dateTo,
          sectorTypes: advancedFilters.sectorTypes,
          facilityPreferences: [],
          sources: [],
          status: "all",
        }}
        setFilters={(update) => {
          setAdvancedFilters((prev) => ({
            ...prev,
            ...update,
          }));
          if (update.search !== undefined) setSearch(update.search);
          if (update.dateFilter !== undefined) setDateRange(update.dateFilter);
          if (update.dateFrom !== undefined) setDateFrom(update.dateFrom);
          if (update.dateTo !== undefined) setDateTo(update.dateTo);
          setPage(1);
        }}
        isManagerOrAdmin={isManagerOrAdmin}
        isRecruiter={isRecruiter}
        handleResetFilters={handleResetFilters}
      />
    </div>
  );
}
