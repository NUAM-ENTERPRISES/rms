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
import type { AdminSessionsQuery } from "@/features/admin/api";
import { formatDistanceToNow } from "date-fns";

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
  Recruiter: "bg-blue-100 text-blue-800",
  CRE: "bg-purple-100 text-purple-800",
  "Interview Coordinator": "bg-orange-100 text-orange-800",
  "Screening Trainer": "bg-yellow-100 text-yellow-800",
  "Documentation Executive": "bg-green-100 text-green-800",
  "Processing Executive": "bg-teal-100 text-teal-800",
  "Team Lead": "bg-indigo-100 text-indigo-800",
  "Team Head": "bg-violet-100 text-violet-800",
  Manager: "bg-rose-100 text-rose-800",
  Director: "bg-red-100 text-red-800",
  CEO: "bg-gray-900 text-white",
  "System Admin": "bg-gray-100 text-gray-800",
};

function DeviceIcon({ type }: { type: string | null }) {
  if (type === "mobile")
    return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  if (type === "tablet")
    return <Tablet className="h-4 w-4 text-muted-foreground" />;
  return <Monitor className="h-4 w-4 text-muted-foreground" />;
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Session Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor live and historical login sessions across all staff roles
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-sm text-muted-foreground">Total sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {activeCount}
            </div>
            <p className="text-sm text-muted-foreground">
              Active (this page)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {sessions.length > 0 ? sessions.length - activeCount : 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Inactive (this page)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter sessions by role, status, or search by name / email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Role filter */}
            <Select
              defaultValue="all"
              onValueChange={handleRoleChange}
            >
              <SelectTrigger className="w-[210px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser / OS</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Loading sessions…
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No sessions found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => {
                    const primaryRole = session.roles[0] ?? null;
                    const roleColor =
                      primaryRole ? ROLE_COLORS[primaryRole] ?? "bg-gray-100 text-gray-800" : "";
                    return (
                      <TableRow key={session.id}>
                        {/* User */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-muted">
                                {getInitials(session.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {session.userName ?? "—"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {session.userEmail ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Roles */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {session.roles.length === 0 ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              session.roles.map((r) => (
                                <span
                                  key={r}
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    ROLE_COLORS[r] ?? "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {r}
                                </span>
                              ))
                            )}
                          </div>
                        </TableCell>

                        {/* Device */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <DeviceIcon type={session.deviceType} />
                            <span className="text-sm capitalize text-muted-foreground">
                              {session.deviceType ?? "—"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Browser / OS */}
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{session.browser ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{session.os ?? "—"}</p>
                          </div>
                        </TableCell>

                        {/* IP */}
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {displayIp(session.ipAddress)}
                        </TableCell>

                        {/* Login time */}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(session.loginAt), {
                            addSuffix: true,
                          })}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {session.isActive ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-green-500 text-green-700 bg-green-50"
                            >
                              <Wifi className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <WifiOff className="h-3 w-3" />
                              Ended
                            </Badge>
                          )}
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
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {filters.page} of {totalPages} &mdash; {total} total sessions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page ?? 1) <= 1 || isFetching}
                  onClick={() => handlePageChange((filters.page ?? 1) - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page ?? 1) >= totalPages || isFetching}
                  onClick={() => handlePageChange((filters.page ?? 1) + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
