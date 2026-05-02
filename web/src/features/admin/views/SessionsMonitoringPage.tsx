import { useState } from "react";
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
  Filter,
  Activity,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetAdminSessionsQuery } from "@/features/admin/api";
import type { AdminSession, AdminSessionsQuery } from "@/features/admin/api";
import { formatDistanceToNow } from "date-fns";
import type { SessionAvailability } from "@/shared/types/session-availability";

// All staff roles that can be monitored (excludes executive leadership)
const MONITORED_ROLES = [
  "Recruiter",
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
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  Manager:
    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  Director:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  CEO: "bg-slate-900 text-slate-50 border border-slate-700 dark:bg-slate-50 dark:text-slate-900 dark:border-slate-200",
  "System Admin":
    "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

// Avatar accent colors cycled by name hash
const AVATAR_PALETTES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
  "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
];

function getAvatarPalette(name: string | null) {
  if (!name) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

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

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

function SessionStatusBadge({ session }: { session: AdminSession }) {
  if (!session.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-800 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300">
        <LivePulse color="violet" />
        On call
      </span>
    );
  }

  if (session.isIdle) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-400">
        <LivePulse color="amber" />
        Idle
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
    isActive: undefined,
    page: 1,
    limit: 30,
  });
  const [searchInput, setSearchInput] = useState("");

  const queryArgs: AdminSessionsQuery = {
    role: filters.role || undefined,
    search: filters.search || undefined,
    isActive: filters.isActive,
    page: filters.page,
    limit: filters.limit,
  };

  const { data, isLoading, isFetching, refetch } =
    useGetAdminSessionsQuery(queryArgs);

  const sessions = data?.data ?? [];
  const total = data?.total ?? 0;
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
      isActive:
        value === "active" ? true : value === "inactive" ? false : undefined,
      page: 1,
    }));
  }

  function handlePageChange(newPage: number) {
    setFilters((f) => ({ ...f, page: newPage }));
  }

  // Count active sessions from current page for summary
  const activeCount = sessions.filter((s) => s.isActive).length;
  const idleCount = sessions.filter((s) => s.isIdle).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-screen-xl mx-auto p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-100">
                <Activity className="h-4 w-4 text-white dark:text-slate-900" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Session Monitoring
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 pl-10">
              Monitor live and historical login sessions across all staff roles
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 gap-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Total sessions
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
              {total}
            </p>
          </div>

          {/* Active */}
          <div className="rounded-xl border border-emerald-100 bg-white dark:border-emerald-900/40 dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Active now
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </p>
              <div className="mb-1.5">
                <LivePulse color="green" />
              </div>
            </div>
          </div>

          {/* Idle */}
          <div className="rounded-xl border border-amber-100 bg-white dark:border-amber-900/40 dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Idle (this page)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-semibold text-amber-600 dark:text-amber-400">
                {idleCount}
              </p>
              <div className="mb-1.5">
                <LivePulse color="amber" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Filters
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search by name or email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSearch}
                className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Role filter */}
            <Select defaultValue="all" onValueChange={handleRoleChange}>
              <SelectTrigger className="h-9 w-[200px] text-sm border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {MONITORED_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select defaultValue="all" onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 w-[150px] text-sm border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 hover:bg-slate-50/80">
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
                      className={`text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 ${
                        h === "Status" ? "text-center" : ""
                      }`}
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
                      className="border-b border-slate-50 dark:border-slate-800/60"
                    >
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-16 text-sm text-slate-400 dark:text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                        <span>No sessions found for the selected filters.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => {
                    const primaryRole = session.roles[0] ?? null;
                    const avatarPalette = getAvatarPalette(session.userName);

                    return (
                      <TableRow
                        key={session.id}
                        className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* User */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback
                                className={`text-[11px] font-semibold ${avatarPalette}`}
                              >
                                {getInitials(session.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate leading-tight">
                                {session.userName ?? "—"}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                                {session.userEmail ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Roles */}
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {session.roles.length === 0 ? (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">
                                —
                              </span>
                            ) : (
                              session.roles.map((r) => (
                                <span
                                  key={r}
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${
                                    ROLE_COLORS[r] ??
                                    "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {r}
                                </span>
                              ))
                            )}
                          </div>
                        </TableCell>

                        {/* Device */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <DeviceIcon type={session.deviceType} />
                            <span className="text-xs capitalize">
                              {session.deviceType ?? "—"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Browser / OS */}
                        <TableCell className="py-3">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">
                            {session.browser ?? "—"}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                            {session.os ?? "—"}
                          </p>
                        </TableCell>

                        {/* IP */}
                        <TableCell className="py-3">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded px-1.5 py-0.5">
                            {displayIp(session.ipAddress)}
                          </span>
                        </TableCell>

                        {/* Login time */}
                        <TableCell className="py-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(session.loginAt), {
                            addSuffix: true,
                          })}
                        </TableCell>

                        {/* Last activity */}
                        <TableCell className="py-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {session.lastActivityAt
                            ? formatDistanceToNow(
                                new Date(session.lastActivityAt),
                                { addSuffix: true }
                              )
                            : "—"}
                        </TableCell>

                        {/* Status (reflects break / on-call from session availability) */}
                        <TableCell className="py-3 text-center">
                          <SessionStatusBadge session={session} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Page{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {filters.page}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {totalPages}
                </span>{" "}
                &mdash;{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {total}
                </span>{" "}
                total sessions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page ?? 1) <= 1 || isFetching}
                  onClick={() => handlePageChange((filters.page ?? 1) - 1)}
                  className="h-7 gap-1 px-2.5 text-xs border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page ?? 1) >= totalPages || isFetching}
                  onClick={() => handlePageChange((filters.page ?? 1) + 1)}
                  className="h-7 gap-1 px-2.5 text-xs border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
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