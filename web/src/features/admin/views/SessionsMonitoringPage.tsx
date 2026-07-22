import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import {
  Monitor,
  Smartphone,
  Tablet,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Activity,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageViewer } from "@/components/molecules";
import { useGetAdminSessionsQuery } from "@/features/admin/api";
import type { AdminSession, AdminSessionsQuery } from "@/features/admin/api";
import { formatDistanceToNow } from "date-fns";
import type { SessionAvailability } from "@/shared/types/session-availability";
import { ROLE_NAMES, LEGACY_CRE_ROLE_NAME } from "@/config/role-names";

// All staff roles that can be monitored (excludes executive leadership)
const MONITORED_ROLES = [
  "Recruiter",
  ROLE_NAMES.OPERATIONS,
  "CRE",
  "Interview Coordinator",
  "Screening Trainer",
  "Documentation Executive",
  "Processing Executive",
  "Team Lead",
  "Team Head",
  "Manager",
  "Director",
  "CEO",
  "System Admin",
];

const ROLE_COLORS: Record<string, string> = {
  Recruiter:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  Operations:
    "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  CRE: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  "Interview Coordinator":
    "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  "Screening Trainer":
    "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  "Documentation Executive":
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  "Processing Executive":
    "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
  "Team Lead":
    "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
  "Team Head":
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-primary dark:border-violet-800",
  Manager:
    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  Director:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  CEO: "bg-slate-900 text-slate-50 border border-slate-700 dark:bg-muted dark:text-foreground dark:border-border",
  "System Admin":
    "bg-muted text-foreground border border-border dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

function displayRoleName(role: string): string {
  return role === LEGACY_CRE_ROLE_NAME ? ROLE_NAMES.OPERATIONS : role;
}

function roleBadgeClass(role: string): string {
  const key = role === LEGACY_CRE_ROLE_NAME ? ROLE_NAMES.OPERATIONS : role;
  return (
    ROLE_COLORS[key] ??
    "bg-muted text-muted-foreground border border-border"
  );
}

const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

function DeviceIcon({ type }: { type: string | null }) {
  const cls = "h-3.5 w-3.5";
  if (type === "mobile") return <Smartphone className={cls} />;
  if (type === "tablet") return <Tablet className={cls} />;
  return <Monitor className={cls} />;
}

function displayIp(ip: string | null) {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return "localhost";
  return ip;
}

// Animated live pulse indicator
function LivePulse({
  color,
}: {
  color: "green" | "amber" | "gray" | "sky" | "violet";
}) {
  const map = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    gray: "bg-slate-400",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
  };
  const ping = {
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    gray: "bg-slate-300",
    sky: "bg-sky-400",
    violet: "bg-violet-400",
  };
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {color !== "gray" && (
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ping[color]}`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${map[color]}`}
      />
    </span>
  );
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return Boolean(value);
}

function getSessionFlags(session: AdminSession) {
  const raw = session as unknown as { isActive?: unknown; isIdle?: unknown };
  return {
    isActive: coerceBoolean(raw.isActive),
    isIdle: coerceBoolean(raw.isIdle),
  };
}

function SessionStatusBadge({ session }: { session: AdminSession }) {
  const { isActive, isIdle } = getSessionFlags(session);

  // Idle should never appear as "Ended". The API computes idle separately.
  if (isIdle) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-400">
        <LivePulse color="amber" />
        Idle
      </span>
    );
  }

  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <LivePulse color="gray" />
        Ended
      </span>
    );
  }

  const availability: SessionAvailability =
    session.availability ?? "ACTIVE";

  if (availability === "BREAK") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/50 dark:text-sky-300">
        <LivePulse color="sky" />
        On break
      </span>
    );
  }

  if (availability === "ON_CALL") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-800 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-primary">
        <LivePulse color="violet" />
        On call
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-400">
      <LivePulse color="green" />
      Active
    </span>
  );
}

export default function SessionsMonitoringPage() {
  const [filters, setFilters] = useState<AdminSessionsQuery>({
    role: undefined,
    search: "",
    status: undefined,
    availability: undefined,
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState("");

  const queryArgs: AdminSessionsQuery = {
    role: filters.role || undefined,
    search: filters.search || undefined,
    status: filters.status,
    availability: filters.availability,
    page: filters.page,
    limit: filters.limit,
  };

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetAdminSessionsQuery(queryArgs, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });

  // Keep tile counts stable: respect role/search but ignore status + pagination.
  const countsQueryArgs: AdminSessionsQuery = useMemo(
    () => ({
      role: filters.role || undefined,
      search: filters.search || undefined,
      status: undefined,
      availability: undefined,
      page: 1,
      limit: 1,
    }),
    [filters.role, filters.search]
  );

  const {
    data: countsData,
    isFetching: isFetchingCounts,
    isError: isErrorCounts,
    refetch: refetchCounts,
  } = useGetAdminSessionsQuery(countsQueryArgs, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });

  const sessions = data?.data ?? [];
  const total = data?.total ?? 0; // table total (changes with filters)
  const totalPages = data?.totalPages ?? 1;

  function handleSearch() {
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  }

  function handleRoleChange(value: string) {
    setFilters((f) => ({
      ...f,
      role: value === "all" ? undefined : value,
      page: 1,
    }));
  }

  function handleStatusChange(value: string) {
    setFilters((f) => ({
      ...f,
      status:
        value === "active"
          ? "ACTIVE"
          : value === "idle"
            ? "IDLE"
            : value === "ended"
              ? "ENDED"
              : undefined,
      availability: undefined,
      page: 1,
    }));
  }

  function handlePageChange(newPage: number) {
    setFilters((f) => ({ ...f, page: newPage }));
  }

  const allCount = countsData?.counts?.total ?? 0;
  const activeCount = countsData?.counts?.active ?? 0;
  const idleCount = countsData?.counts?.idle ?? 0;
  const onBreakCount = countsData?.counts?.onBreak ?? 0;
  const onCallCount = countsData?.counts?.onCall ?? 0;

  const isErrorAny = isError || isErrorCounts;
  const isFetchingAny = isFetching || isFetchingCounts;

  const selectedTile: "all" | "active" | "idle" | "break" | "call" =
    filters.availability === "BREAK"
      ? "break"
      : filters.availability === "ON_CALL"
        ? "call"
        : filters.status === "ACTIVE"
          ? "active"
          : filters.status === "IDLE"
            ? "idle"
            : "all";

  function handleTileFilter(next: "all" | "active" | "idle" | "break" | "call") {
    setFilters((f) => ({
      ...f,
      status: next === "active" ? "ACTIVE" : next === "idle" ? "IDLE" : undefined,
      availability:
        next === "break"
          ? "BREAK"
          : next === "call"
            ? "ON_CALL"
            : undefined,
      page: 1,
      limit: 10,
    }));
  }

  const startIndex = total > 0 ? (filters.page ?? 1) * (filters.limit ?? 10) - (filters.limit ?? 10) + 1 : 0;
  const endIndex = total > 0 ? Math.min((filters.page ?? 1) * (filters.limit ?? 10), total) : 0;

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-6 mt-2">

        {/* ── Header ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                      Session Monitoring
                    </h1>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                        isFetchingAny
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                      )}
                    >
                      <LivePulse color={isFetchingAny ? "amber" : "green"} />
                      {isFetchingAny ? "Syncing" : "Live"}
                    </span>

                    {(filters.role || filters.search || filters.status) && (
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                        Filtered
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Monitor live and historical login sessions across all staff roles
                  </p>

                  {isErrorAny && (
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                        <WifiOff className="h-4 w-4" />
                        Unable to refresh sessions. Check connection and try again.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetch();
                  refetchCounts();
                }}
                disabled={isFetchingAny}
                className="gap-2 border-border bg-card text-foreground hover:bg-muted"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetchingAny ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* ── Dashboard tiles (click to filter table) ── */}
        <div className="grid auto-rows-fr gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <DashboardStatTile
            accent="slate"
            label="Total sessions"
            value={allCount}
            subtitle="All roles"
            icon={Users}
            active={selectedTile === "all"}
            interactive
            footerText={selectedTile === "all" ? "Viewing now" : "Click to filter"}
            onClick={() => handleTileFilter("all")}
          />
          <DashboardStatTile
            accent="emerald"
            label="Active (this page)"
            value={activeCount}
            subtitle="Live sessions (not idle)"
            icon={Wifi}
            active={selectedTile === "active"}
            interactive
            footerText={selectedTile === "active" ? "Viewing now" : "Click to filter"}
            valueAddon={
              <div className="mb-1.5">
                <LivePulse color="green" />
              </div>
            }
            onClick={() => handleTileFilter("active")}
          />
          <DashboardStatTile
            accent="amber"
            label="Idle"
            value={idleCount}
            subtitle="15+ min inactive (ACTIVE only)"
            icon={Clock}
            active={selectedTile === "idle"}
            interactive
            footerText={selectedTile === "idle" ? "Viewing now" : "Click to filter"}
            valueAddon={
              <div className="mb-1.5">
                <LivePulse color="amber" />
              </div>
            }
            onClick={() => handleTileFilter("idle")}
          />
          <DashboardStatTile
            accent="sky"
            label="On break"
            value={onBreakCount}
            subtitle="BREAK"
            icon={Clock}
            active={selectedTile === "break"}
            interactive
            footerText={selectedTile === "break" ? "Viewing now" : "Click to filter"}
            valueAddon={
              <div className="mb-1.5">
                <LivePulse color="sky" />
              </div>
            }
            onClick={() => handleTileFilter("break")}
          />
          <DashboardStatTile
            accent="violet"
            label="On call"
            value={onCallCount}
            subtitle="CALL"
            icon={Clock}
            active={selectedTile === "call"}
            interactive
            footerText={selectedTile === "call" ? "Viewing now" : "Click to filter"}
            valueAddon={
              <div className="mb-1.5">
                <LivePulse color="violet" />
              </div>
            }
            onClick={() => handleTileFilter("call")}
          />
        </div>

        {/* ── Filters ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm px-4 py-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-9 text-sm border-border bg-muted focus:bg-card focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                className="h-9 px-3 rounded-xl border-border hover:bg-muted text-muted-foreground"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>

              <Select value={filters.role ?? "all"} onValueChange={handleRoleChange}>
                <SelectTrigger className="h-9 w-[200px] text-sm border-border rounded-xl bg-card">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  {MONITORED_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={
                  filters.status === "ACTIVE"
                    ? "active"
                    : filters.status === "IDLE"
                      ? "idle"
                      : filters.status === "ENDED"
                        ? "ended"
                        : "all"
                }
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-9 w-[150px] text-sm border-border rounded-xl bg-card">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Table (CandidatesPage-style) ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground truncate">
                    {selectedTile === "active"
                      ? "Active sessions"
                      : selectedTile === "idle"
                        ? "Idle sessions"
                        : selectedTile === "break"
                          ? "On break"
                          : selectedTile === "call"
                            ? "On call"
                            : "All sessions"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filters.role ? `Role: ${filters.role}` : "All roles"}
                    {filters.search ? ` • Search: "${filters.search}"` : ""}
                    {" — "}
                    {total} session{total !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Table Container */}
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/80">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {[
                      "User",
                      "Role",
                      "Device",
                      "Browser / OS",
                      "IP Address",
                      "Login Time",
                      "Last Activity",
                      "Status",
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className={cn(
                          "h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
                          h === "Status" && "text-center"
                        )}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

              <TableBody>
                {isLoading ? (
                  /* Loading skeleton rows */
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow
                      key={i}
                      className="border-b border-border last:border-b-0"
                    >
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-muted animate-pulse w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sessions.length === 0 ? (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={8} className="px-4 py-20">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                          <Users className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-semibold text-foreground">
                          No sessions found
                        </p>
                        <p className="text-sm text-muted-foreground text-center max-w-xs">
                          {filters.search || filters.role || filters.status
                            ? "Try adjusting your search criteria or filters."
                            : "No sessions available yet."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => {
                    const displayName = session.userName ?? "Unknown user";

                    return (
                      <TableRow
                        key={session.id}
                        className="border-b border-border hover:bg-muted/60 transition-colors last:border-b-0"
                      >
                        {/* User */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ImageViewer
                              title={displayName}
                              src={session.profileImage || null}
                              fallbackSrc={DEFAULT_PROFILE_IMAGE}
                              className="h-8 w-8 shrink-0 rounded-full border border-border shadow-sm"
                              ariaLabel={`View profile image for ${displayName}`}
                              enableHoverPreview
                              hoverPosition="right"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate leading-tight">
                                {session.userName ?? "—"}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                {session.userEmail ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Roles */}
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {session.roles.length === 0 ? (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            ) : (
                              session.roles.map((r) => (
                                <span
                                  key={r}
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${roleBadgeClass(r)}`}
                                >
                                  {displayRoleName(r)}
                                </span>
                              ))
                            )}
                          </div>
                        </TableCell>

                        {/* Device */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <DeviceIcon type={session.deviceType} />
                            <span className="text-xs capitalize">
                              {session.deviceType ?? "—"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Browser / OS */}
                        <TableCell className="px-4 py-3">
                          <p className="text-xs font-medium text-foreground leading-tight">
                            {session.browser ?? "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {session.os ?? "—"}
                          </p>
                        </TableCell>

                        {/* IP */}
                        <TableCell className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">
                            {displayIp(session.ipAddress)}
                          </span>
                        </TableCell>

                        {/* Login time */}
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(session.loginAt), {
                            addSuffix: true,
                          })}
                        </TableCell>

                        {/* Last activity — "last seen X ago" for better admin UX */}
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          {session.lastActivityAt ? (
                            <span
                              className="text-xs text-muted-foreground"
                              title={new Date(session.lastActivityAt).toLocaleString()}
                            >
                              {formatDistanceToNow(
                                new Date(session.lastActivityAt),
                                { addSuffix: true }
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Status (reflects break / on-call from session availability) */}
                        <TableCell className="px-4 py-3 text-center">
                          <SessionStatusBadge session={session} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-3 bg-muted/50">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {startIndex}
                </span>
                –
                <span className="font-semibold text-foreground">
                  {endIndex}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {total}
                </span>{" "}
                sessions
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, (filters.page ?? 1) - 1))}
                  disabled={(filters.page ?? 1) === 1 || isFetching}
                  className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Prev
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const current = filters.page ?? 1;
                    const shouldShow =
                      totalPages <= 7 ||
                      p === 1 ||
                      p === totalPages ||
                      (p >= current - 1 && p <= current + 1);

                    if (shouldShow) {
                      return (
                        <Button
                          key={p}
                          variant={current === p ? "default" : "ghost"}
                          size="sm"
                          disabled={isFetching}
                          onClick={() => handlePageChange(p)}
                          className={cn(
                            "h-8 w-8 p-0 text-xs",
                            current === p
                              ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {p}
                        </Button>
                      );
                    }

                    if (p === (filters.page ?? 1) - 2 || p === (filters.page ?? 1) + 2) {
                      return (
                        <span key={p} className="text-muted-foreground/40 text-xs px-0.5">
                          …
                        </span>
                      );
                    }

                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, (filters.page ?? 1) + 1))}
                  disabled={(filters.page ?? 1) >= totalPages || isFetching}
                  className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}