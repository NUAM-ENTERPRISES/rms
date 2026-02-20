import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
  Eye,
  Users,
  FileText,
  Mic,
  Settings,
  CheckCircle,
  Send,
  UserCheck,
  CalendarDays,
  ArrowRight,
  Phone,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { DatePicker, ProjectRoleFilter, ImageViewer } from "@/components/molecules";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useGetProjectOverviewQuery } from "@/services/candidateProjectsApi";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { useDebounce } from "@/hooks/useDebounce";



// -------------------------------------------------------------------
// Status tile config (matches seed main statuses)
// -------------------------------------------------------------------
type TileDef = {
  key: string;
  label: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  iconBg: string;
  textColor: string;
};

const TILES: TileDef[] = [
  {
    key: "all",
    label: "Total Candidates In Project",
    icon: Users,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-blue-100/50",
    iconBg: "bg-blue-200/40",
    textColor: "text-blue-600",
  },
  {
    key: "nominated",
    label: "Nominated",
    icon: Send,
    gradient: "from-indigo-500 to-blue-500",
    bgGradient: "from-indigo-50 to-blue-100/50",
    iconBg: "bg-indigo-200/40",
    textColor: "text-indigo-600",
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
    gradient: "from-yellow-400 to-amber-500",
    bgGradient: "from-yellow-50 to-amber-100/50",
    iconBg: "bg-yellow-200/40",
    textColor: "text-amber-600",
  },
  {
    key: "interview",
    label: "Interview",
    icon: Mic,
    gradient: "from-purple-500 to-violet-500",
    bgGradient: "from-purple-50 to-violet-100/50",
    iconBg: "bg-purple-200/40",
    textColor: "text-purple-600",
  },
  {
    key: "processing",
    label: "Processing",
    icon: Settings,
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-50 to-red-100/50",
    iconBg: "bg-orange-200/40",
    textColor: "text-orange-600",
  },
  {
    key: "final",
    label: "Deployed",
    icon: CheckCircle,
    gradient: "from-emerald-500 to-green-500",
    bgGradient: "from-emerald-50 to-green-100/50",
    iconBg: "bg-emerald-200/40",
    textColor: "text-emerald-600",
  },
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
export default function CandidatesOverviewPage() {
  const navigate = useNavigate();

  // Filter states
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebounce(search, 500);

  // Project and Role state
  const [projectRole, setProjectRole] = useState({
    projectId: "all",
    roleCatalogId: "all",
  });

  // Date filter state
  const [dateRange, setDateRange] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

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

  const getActiveTileLabel = () =>
    TILES.find((t) => t.key === activeFilter)?.label ?? "All Candidates";

  // Show a loading state while projects are being fetched and auto-selected
  if (projectRole.projectId === "all") {
    if (isLoadingProjects) {
      return (
        <div className="min-h-screen">
          <div className="w-full max-w-7xl mx-auto space-y-4 mt-8 px-4 text-center">
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
          <div className="w-full max-w-7xl mx-auto space-y-4 mt-8 px-4 text-center">
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
      <div className="w-full max-w-7xl mx-auto space-y-4 mt-2 px-4">
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
        <Card className="border-0 shadow-lg bg-white/90">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative group flex-1">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <Input
                  placeholder="Search by name, role, or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <ProjectRoleFilter
                  value={projectRole}
                  onChange={(v) => {
                    setProjectRole(v);
                    setPage(1);
                  }}
                  defaultProject={true}
                />
              </div>
            </div>

            {/* ── Date Filter Section ── */}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 mr-1">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">Date Added</span>
                </div>

                {[
                  { key: "all", label: "All" },
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "this_week", label: "This week" },
                  { key: "last_week", label: "Last week" },
                  { key: "this_month", label: "This month" },
                  { key: "custom", label: "Custom" },
                ].map((preset) => {
                  const isActive = dateRange === preset.key;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => {
                        setDateRange(preset.key);
                        if (preset.key !== "custom") {
                          setDateFrom(undefined);
                          setDateTo(undefined);
                        }
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {dateRange === "custom" && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 border-blue-300 bg-blue-50/50`}>
                    <span className="text-xs font-medium text-gray-500 min-w-[32px]">From</span>
                    <div className="w-36">
                      <DatePicker
                        value={dateFrom}
                        showTime={false}
                        onChange={(d) => {
                          const newFrom = d as Date | undefined;
                          setDateFrom(newFrom);
                          setPage(1);
                        }}
                        placeholder="Start date"
                        compact
                      />
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 mx-1" />

                    <span className="text-xs font-medium text-gray-500 min-w-[20px]">To</span>
                    <div className="w-36">
                      <DatePicker
                        value={dateTo}
                        showTime={false}
                        onChange={(d) => {
                          const newTo = d as Date | undefined;
                          setDateTo(newTo);
                          setPage(1);
                        }}
                        placeholder="End date"
                        compact
                        disabled={!dateFrom}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Status Tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {TILES.map((tile, i) => {
            const Icon = tile.icon;
            const isActive = activeFilter === tile.key;

            return (
              <motion.div
                key={tile.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 + i * 0.08 }}
              >
                <Card
                  onClick={() => {
                    setActiveFilter(tile.key);
                    setPage(1);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setActiveFilter(tile.key);
                      setPage(1);
                    }
                  }}
                  className={`border-0 shadow-sm bg-gradient-to-br ${tile.bgGradient} backdrop-blur-sm transition-all duration-200 cursor-pointer hover:shadow-md transform hover:-translate-y-0.5 ${
                    isActive ? "ring-2 ring-blue-500/30 shadow-md" : ""
                  }`}
                >
                  <CardContent className="pt-2 pb-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-slate-600 mb-0.5 truncate">
                          {tile.label}
                        </p>
                        <h3 className={`text-lg font-bold ${tile.textColor}`}>
                          {counts[tile.key] ?? 0}
                        </h3>
                      </div>
                      <div className={`p-1.5 ${tile.iconBg} rounded-full shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 ${tile.textColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ── Candidates Table ── */}
        <Card className="border-0 shadow-lg bg-white/90">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {getActiveTileLabel()}
                </CardTitle>
                <CardDescription>
                  {meta?.total ?? 0} candidate{(meta?.total ?? 0) !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-[400px]">
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
                  <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-purple-500/20">
                        <Users className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {getActiveTileLabel()}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 font-medium">
                          {counts[activeFilter] || candidates.length} candidate{counts[activeFilter] !== 1 ? "s" : ""} in total
                        </p>
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 border-b border-gray-200">
                        <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                          Candidate
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
                            className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors last:border-b-0"
                          >
                            <TableCell className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <ImageViewer
                                  src={candidate.profileImage}
                                  title={`${candidate.firstName} ${candidate.lastName}`}
                                  className="h-11 w-11 shadow"
                                />
                                <div className="flex-1">
                                  <button
                                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-all duration-200"
                                  >
                                    {candidate.firstName} {candidate.lastName}
                                  </button>
                                  <div className="text-sm text-slate-500 mt-1.5 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                                      <span className="text-gray-700">{candidate.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                                      <span className="text-gray-700">
                                        {candidate.countryCode} {candidate.mobileNumber}
                                      </span>
                                    </div>
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
                    <div className="text-center py-20">
                      <UserCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-600 mb-2">
                        No candidates found
                      </h3>
                      <p className="text-slate-500">
                        Try selecting a different filter or project.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <Card className="mt-4 border-0 shadow-lg bg-white/90">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 font-medium">
                      Showing {(page - 1) * limit + 1} to{" "}
                      {Math.min(page * limit, meta.total)} of {meta.total}{" "}
                      candidates
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-9 px-3"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                          .filter(
                            (n) =>
                              n === 1 ||
                              n === meta.totalPages ||
                              (n >= page - 1 && n <= page + 1)
                          )
                          .map((n, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && n - prev > 1;
                            return (
                              <div key={n} className="flex items-center">
                                {showEllipsis && (
                                  <span className="px-2 text-slate-400">
                                    ...
                                  </span>
                                )}
                                <Button
                                  variant={page === n ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setPage(n)}
                                  className={`h-9 w-9 p-0 font-semibold ${
                                    page === n
                                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
                                      : ""
                                  }`}
                                >
                                  {n}
                                </Button>
                              </div>
                            );
                          })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                        disabled={page >= meta.totalPages}
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
    </div>
  );
}
