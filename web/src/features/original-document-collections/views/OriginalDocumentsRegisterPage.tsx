import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  FileStack,
  FilterX,
  MoreHorizontal,
  Package,
  Plus,
  Search,
} from "lucide-react";
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import {
  useGetOriginalDocumentCollectionStatsQuery,
  useGetOriginalDocumentCollectionsQuery,
} from "../api";
import { CollectionExportButton } from "../components/CollectionExportButton";
import {
  COLLECTION_STATUS,
  COLLECTION_STATUS_LABELS,
  COLLECTION_TYPE,
  COLLECTION_TYPE_LABELS,
  DIRECT_OFFICE_LABELS,
} from "../constants";

type StatusFilter = "all" | "pending" | "completed" | "in_locker" | "this_month";

function formatSourceDetail(collection: {
  collectionType: string;
  directOffice?: string | null;
  directOfficeOther?: string | null;
  interviewVenue?: string | null;
  agent?: { name: string } | null;
  agentNameManual?: string | null;
  courierPartner?: string | null;
  trackingNumber?: string | null;
}) {
  switch (collection.collectionType) {
    case COLLECTION_TYPE.DIRECT:
      return collection.directOffice === "other"
        ? collection.directOfficeOther ?? "Other"
        : DIRECT_OFFICE_LABELS[collection.directOffice ?? ""] ??
            collection.directOffice ??
            "—";
    case COLLECTION_TYPE.AGENT:
      return collection.agent?.name ?? collection.agentNameManual ?? "—";
    case COLLECTION_TYPE.INTERVIEW_COORDINATOR:
      return collection.interviewVenue ?? "—";
    case COLLECTION_TYPE.COURIER:
      return (
        [collection.courierPartner, collection.trackingNumber]
          .filter(Boolean)
          .join(" / ") || "—"
      );
    case COLLECTION_TYPE.RECRUITER:
      return "Recruiter handover";
    default:
      return "—";
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "locker_submitted":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "merged_uploaded":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

const accentStyles: Record<
  string,
  {
    card: string;
    icon: string;
    iconBg: string;
    value: string;
    ring: string;
    dot: string;
  }
> = {
  blue: {
    card: "from-blue-50 via-white to-blue-50/30 border-blue-100",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    value: "text-blue-700",
    ring: "ring-blue-400/50",
    dot: "bg-blue-500",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    value: "text-emerald-700",
    ring: "ring-emerald-400/50",
    dot: "bg-emerald-500",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    value: "text-amber-700",
    ring: "ring-amber-400/50",
    dot: "bg-amber-500",
  },
  indigo: {
    card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100",
    icon: "text-indigo-600",
    iconBg: "bg-indigo-100",
    value: "text-indigo-700",
    ring: "ring-indigo-400/50",
    dot: "bg-indigo-500",
  },
  purple: {
    card: "from-purple-50 via-white to-purple-50/30 border-purple-100",
    icon: "text-purple-600",
    iconBg: "bg-purple-100",
    value: "text-purple-700",
    ring: "ring-purple-400/50",
    dot: "bg-purple-500",
  },
  teal: {
    card: "from-teal-50 via-white to-teal-50/30 border-teal-100",
    icon: "text-teal-600",
    iconBg: "bg-teal-100",
    value: "text-teal-700",
    ring: "ring-teal-400/50",
    dot: "bg-teal-500",
  },
};

export default function OriginalDocumentsRegisterPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const { user } = useAppSelector((state) => state.auth);
  const canWrite = useCan("write:documents");

  const [search, setSearch] = useState("");
  const [collectionType, setCollectionType] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const filters = {
    search: debouncedSearch || undefined,
    collectionType: collectionType === "all" ? undefined : collectionType,
    status:
      statusFilter === "completed" ? COLLECTION_STATUS.COMPLETED : undefined,
    pendingOnly: statusFilter === "pending" ? true : undefined,
    lockerSubmittedOnly: statusFilter === "in_locker" ? true : undefined,
    dateFrom:
      statusFilter === "this_month" ? monthStart.toISOString() : undefined,
    page,
    limit: 10,
  };

  const { data: statsResponse } = useGetOriginalDocumentCollectionStatsQuery();
  const { data, isLoading, isFetching } =
    useGetOriginalDocumentCollectionsQuery(filters);

  const stats = statsResponse?.data ?? {
    totalCollections: 0,
    totalDocumentsCollected: 0,
    completedCollections: 0,
    pendingCollections: 0,
    inLocker: 0,
    thisMonthCollections: 0,
    byType: {},
  };

  const collections = data?.data?.collections ?? [];
  const pagination = data?.data?.pagination ?? {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  };

  const statTiles = [
    {
      label: "Original Documents Collected",
      value: stats.totalDocumentsCollected,
      icon: FileStack,
      accent: "blue",
      subtitle: "Physical originals marked received",
      filter: "all" as StatusFilter,
    },
    {
      label: "Candidates",
      value: stats.totalCollections,
      icon: Package,
      accent: "indigo",
      subtitle: "One collection per candidate",
      filter: "all" as StatusFilter,
    },
    {
      label: "Completed",
      value: stats.completedCollections,
      icon: CheckCircle2,
      accent: "emerald",
      subtitle: "Fully processed intakes",
      filter: "completed" as StatusFilter,
    },
    {
      label: "Pending Intake",
      value: stats.pendingCollections,
      icon: Clock,
      accent: "amber",
      subtitle: "Draft or in-progress events",
      filter: "pending" as StatusFilter,
    },
    {
      label: "In Locker",
      value: stats.inLocker,
      icon: Archive,
      accent: "purple",
      subtitle: "Submitted to physical locker",
      filter: "in_locker" as StatusFilter,
    },
    {
      label: "This Month",
      value: stats.thisMonthCollections,
      icon: Package,
      accent: "teal",
      subtitle: "Collections this month",
      filter: "this_month" as StatusFilter,
    },
  ];

  const handleTileClick = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleResetFilters = () => {
    setSearch("");
    setCollectionType("all");
    setStatusFilter("all");
    setPage(1);
  };

  const getTableTitle = () => {
    if (statusFilter === "all") return "Original Document Intake";
    const tile = statTiles.find((t) => t.filter === statusFilter);
    return tile?.label ?? "Collection List";
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    collectionType !== "all" ||
    statusFilter !== "all";

  return (
    <div className="min-h-screen">
      <div className="mx-auto mt-2 w-full space-y-6 px-6">
        <DashboardWelcomeHeader
          userName={user?.name ?? "Documents Control Executive"}
          subtitle="Original Document Intake"
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
            <div className="group relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
              <Input
                placeholder="Search candidate, locker number, tracking..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 transition-all focus:bg-white focus:ring-blue-500/10"
                aria-label="Search collections"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={collectionType}
                onValueChange={(value) => {
                  setCollectionType(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-[190px] rounded-xl border-slate-200">
                  <SelectValue placeholder="Collection type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.values(COLLECTION_TYPE).map((type) => (
                    <SelectItem key={type} value={type}>
                      {COLLECTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="h-11 gap-2 rounded-xl px-4 font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <FilterX className="h-4 w-4" />
                  Reset
                </Button>
              )}

              <CollectionExportButton filters={filters} />

              {canWrite && (
                <Button
                  onClick={() => navigate("/original-documents/new")}
                  className="h-11 shrink-0 gap-2 rounded-xl bg-blue-600 px-4 font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Log Intake Event
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statTiles.map((stat, i) => {
            const Icon = stat.icon;
            const s = accentStyles[stat.accent];
            const isActive = statusFilter === stat.filter;
            return (
              <motion.button
                key={stat.label}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleTileClick(stat.filter)}
                className={cn(
                  "group relative rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive
                    ? `ring-2 shadow-md ${s.ring}`
                    : "hover:-translate-y-0.5 hover:shadow-md",
                )}
              >
                {isActive && (
                  <span
                    className={cn(
                      "absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full",
                      s.dot,
                    )}
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {stat.label}
                    </p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500">{stat.subtitle}</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <Icon className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-600">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </motion.button>
            );
          })}
        </div>

        <div
          ref={tableRef}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-2.5 shadow-md">
                <FileStack className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-900">
                  {getTableTitle()}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {pagination.total} collection
                  {pagination.total !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader className="sticky">
              <TableRow className="border-b border-gray-200 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="h-10 min-w-[12rem] px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Candidate
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Events
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Latest Type
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Latest Source
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Latest Date
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Locker #
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Received
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Status
                </TableHead>
                <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isFetching ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={9} className="px-4 py-3">
                      <div className="h-10 rounded bg-slate-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <FileStack className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-600">
                        No collections found
                      </p>
                      <p className="text-sm text-slate-400">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((collection) => {
                  const latest = collection.latestEvent;
                  const docsOnFile =
                    collection.cumulativeReceivedCount ??
                    collection.cumulativeReceived?.length ??
                    0;
                  return (
                    <TableRow
                      key={collection.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <TableCell className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {collection.candidate.firstName}{" "}
                          {collection.candidate.lastName}
                        </div>
                        {collection.candidate.candidateCode && (
                          <p className="text-xs text-slate-500">
                            {collection.candidate.candidateCode}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">
                        {collection.eventCount ?? collection.events?.length ?? 0}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">
                        {latest
                          ? COLLECTION_TYPE_LABELS[latest.collectionType]
                          : "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate px-4 py-3 text-sm text-slate-600">
                        {latest ? formatSourceDetail(latest) : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">
                        {latest
                          ? format(new Date(latest.collectedAt), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">
                        {collection.lockerFileNumber ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="secondary" className="font-medium">
                          {docsOnFile} doc{docsOnFile !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClass(collection.status)}
                        >
                          {COLLECTION_STATUS_LABELS[collection.status] ??
                            collection.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Collection actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/original-documents/${collection.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View details
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
