import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileStack,
  FilterX,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Upload,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { CandidateListIdentityCell, ImageViewer } from "@/components/molecules";
import { useDebounce } from "@/hooks/useDebounce";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import {
  useGetOriginalDocumentCollectionStatsQuery,
  useGetOriginalDocumentCollectionsQuery,
} from "../api";
import { CollectionExportButton } from "../components/CollectionExportButton";
import { CollectionProgressCell } from "../components/CollectionProgressCell";
import {
  COLLECTION_STATUS,
  COLLECTION_STATUS_LABELS,
  COLLECTION_TYPE,
  COLLECTION_TYPE_LABELS,
  DIRECT_OFFICE_LABELS,
} from "../constants";

type StatusFilter = "all" | "pending" | "completed" | "in_locker";

const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

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

function getStatusInfo(status: string) {
  switch (status) {
    case "completed":
      return {
        icon: CheckCircle2,
        textColor: "text-emerald-700",
        bgColor: "bg-emerald-100",
        borderColor: "border-emerald-300",
      };
    case "locker_submitted":
      return {
        icon: Archive,
        textColor: "text-blue-700",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-300",
      };
    case "merged_uploaded":
      return {
        icon: Upload,
        textColor: "text-purple-700",
        bgColor: "bg-purple-100",
        borderColor: "border-purple-300",
      };
    default:
      return {
        icon: Clock,
        textColor: "text-amber-700",
        bgColor: "bg-amber-100",
        borderColor: "border-amber-300",
      };
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

  const filters = {
    search: debouncedSearch || undefined,
    collectionType: collectionType === "all" ? undefined : collectionType,
    status:
      statusFilter === "completed" ? COLLECTION_STATUS.COMPLETED : undefined,
    pendingOnly: statusFilter === "pending" ? true : undefined,
    lockerSubmittedOnly: statusFilter === "in_locker" ? true : undefined,
    page,
    limit: 10,
  };

  const { data: statsResponse } = useGetOriginalDocumentCollectionStatsQuery();
  const { data, isLoading, isFetching } =
    useGetOriginalDocumentCollectionsQuery(filters);

  const stats = statsResponse?.data ?? {
    totalCollections: 0,
    completedCollections: 0,
    pendingCollections: 0,
    inLocker: 0,
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

  const getTableSubtitle = () => {
    switch (statusFilter) {
      case "completed":
        return "Fully processed collections";
      case "pending":
        return "Draft or in-progress collections";
      case "in_locker":
        return "Collections submitted to physical locker";
      default:
        return "All candidate document collections";
    }
  };

  const totalCount = pagination.total;
  const totalPages = pagination.totalPages;
  const limit = pagination.limit;

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
                  Add Original Documents
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-2.5 shadow-md">
                  <FileStack className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-gray-900">
                    {getTableTitle()}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {getTableSubtitle()} — {totalCount} collection
                    {totalCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div ref={tableRef} className="overflow-hidden">
            <Table>
              <TableHeader className="sticky">
                <TableRow className="border-b border-gray-200 bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="h-10 min-w-[14rem] whitespace-normal px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Candidate
                  </TableHead>
                  <TableHead className="h-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                  <TableHead className="h-10 min-w-[10rem] px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Progress
                  </TableHead>
                  <TableHead className="h-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                {isLoading || isFetching
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={10} className="px-4 py-3">
                          <div className="h-10 rounded bg-slate-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  : collections.map((collection) => {
                      const latest = collection.latestEvent;
                      const docsOnFile =
                        collection.cumulativeReceivedCount ??
                        collection.cumulativeReceived?.length ??
                        0;
                      const statusInfo = getStatusInfo(collection.status);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <TableRow
                          key={collection.id}
                          className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-blue-50/30"
                        >
                          <TableCell className="min-w-[14rem] whitespace-normal px-4 py-3 align-top">
                            <div className="flex items-start gap-3">
                              <ImageViewer
                                title={`${collection.candidate.firstName} ${collection.candidate.lastName}`}
                                src={collection.candidate.profileImage || null}
                                fallbackSrc={DEFAULT_PROFILE_IMAGE}
                                className="h-10 w-10 shrink-0 rounded-full"
                                ariaLabel={`View full image for ${collection.candidate.firstName} ${collection.candidate.lastName}`}
                                enableHoverPreview
                              />
                              <div className="min-w-0 flex-1">
                                <CandidateListIdentityCell
                                  firstName={collection.candidate.firstName}
                                  lastName={collection.candidate.lastName}
                                  candidateCode={
                                    collection.candidate.candidateCode
                                  }
                                  onNameClick={() =>
                                    navigate(
                                      `/original-documents/${collection.id}`,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            <Badge
                              variant="secondary"
                              className="font-medium tabular-nums"
                            >
                              {collection.eventCount ??
                                collection.events?.length ??
                                0}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-slate-700">
                            {latest
                              ? COLLECTION_TYPE_LABELS[latest.collectionType]
                              : "—"}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate px-4 py-3 text-sm text-slate-600">
                            {latest ? formatSourceDetail(latest) : "—"}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {latest ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                {format(
                                  new Date(latest.collectedAt),
                                  "dd MMM yyyy",
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm font-medium text-slate-700">
                            {collection.lockerFileNumber ?? (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top">
                            <CollectionProgressCell
                              cumulativeReceived={collection.cumulativeReceived}
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <Badge variant="secondary" className="font-medium">
                              {docsOnFile} doc{docsOnFile !== 1 ? "s" : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "rounded-full p-1",
                                  statusInfo.bgColor,
                                )}
                              >
                                <StatusIcon
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    statusInfo.textColor.replace("700", "600"),
                                  )}
                                />
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border px-2 py-0.5 text-[10px] font-medium",
                                  statusInfo.textColor,
                                  statusInfo.bgColor,
                                  statusInfo.borderColor,
                                )}
                              >
                                {COLLECTION_STATUS_LABELS[collection.status] ??
                                  collection.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  aria-label="Collection actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/original-documents/${collection.id}`}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>

            {!isLoading && !isFetching && collections.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <FileStack className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-600">
                  No collections found
                </p>
                <p className="max-w-xs text-center text-sm text-slate-400">
                  {hasActiveFilters
                    ? "Try adjusting your search criteria or filters."
                    : "Get started by adding candidate documents."}
                </p>
                {!hasActiveFilters && canWrite && (
                  <Button
                    onClick={() => navigate("/original-documents/new")}
                    size="sm"
                    className="mt-1 h-9 gap-1.5 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Original Documents
                  </Button>
                )}
              </div>
            )}
          </div>

          {totalCount > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {(page - 1) * limit + 1}
                </span>
                –
                <span className="font-semibold text-slate-700">
                  {Math.min(page * limit, totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {totalCount}
                </span>{" "}
                collections
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 gap-1 border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => {
                      if (
                        totalPages <= 7 ||
                        p === 1 ||
                        p === totalPages ||
                        (p >= page - 1 && p <= page + 1)
                      ) {
                        return (
                          <Button
                            key={p}
                            variant={page === p ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setPage(p)}
                            className={cn(
                              "h-8 w-8 p-0 text-xs",
                              page === p
                                ? "bg-blue-600 shadow-sm hover:bg-blue-700"
                                : "text-slate-500 hover:bg-slate-100",
                            )}
                          >
                            {p}
                          </Button>
                        );
                      }
                      if (p === page - 2 || p === page + 2) {
                        return (
                          <span
                            key={p}
                            className="px-0.5 text-xs text-slate-300"
                          >
                            …
                          </span>
                        );
                      }
                      return null;
                    },
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page >= totalPages}
                  className="h-8 gap-1 border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
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
