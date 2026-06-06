import { useMemo } from "react";
import { Link } from "react-router-dom";
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
import { ExternalLink, Loader2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetCoordinatorClientProjectsQuery } from "../api/projectCoordinatorDashboardApi";

function statusVariant(
  status: "active" | "completed" | "cancelled"
): "default" | "secondary" | "outline" {
  if (status === "active") return "default";
  if (status === "completed") return "secondary";
  return "outline";
}

function statusDot(status: "active" | "completed" | "cancelled") {
  if (status === "active") return "bg-indigo-500";
  if (status === "completed") return "bg-emerald-500";
  return "bg-amber-500";
}

function RoleFillBar({
  filled,
  target,
  name,
}: {
  filled: number;
  target: number;
  name: string;
}) {
  const pct = target > 0 ? Math.min(Math.round((filled / target) * 100), 100) : 0;

  return (
    <div className="group/role flex items-center gap-2">
      <span className="w-24 shrink-0 truncate text-xs text-slate-600" title={name}>
        {name}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 100
              ? "bg-emerald-500"
              : pct >= 50
                ? "bg-indigo-500"
                : "bg-amber-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
        {filled}/{target}
      </span>
    </div>
  );
}

export default function ClientProjectsTable() {
  const { data, isLoading, isError } = useGetCoordinatorClientProjectsQuery({
    page: 1,
    limit: 20,
  });

  const rows = data?.data?.rows ?? [];

  const summaryStats = useMemo(() => {
    const totalRoles = rows.reduce(
      (sum, row) => sum + row.roles.reduce((s, r) => s + r.target, 0),
      0
    );
    const totalFilled = rows.reduce(
      (sum, row) => sum + row.roles.reduce((s, r) => s + r.filled, 0),
      0
    );
    return { totalRoles, totalFilled };
  }, [rows]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-700">
              Client Projects Overview
            </CardTitle>
            <CardDescription>
              Your clients, projects, and candidate fill progress
            </CardDescription>
          </div>
          {rows.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Total Positions</p>
                <p className="text-sm font-bold tabular-nums text-slate-700">
                  {summaryStats.totalFilled}/{summaryStats.totalRoles}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Fill Rate</p>
                <p
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    summaryStats.totalRoles > 0 &&
                      summaryStats.totalFilled / summaryStats.totalRoles >= 0.75
                      ? "text-emerald-600"
                      : summaryStats.totalFilled / summaryStats.totalRoles >= 0.5
                        ? "text-amber-600"
                        : "text-slate-700"
                  )}
                >
                  {summaryStats.totalRoles > 0
                    ? `${Math.round((summaryStats.totalFilled / summaryStats.totalRoles) * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">
              Failed to load client projects
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-slate-100 p-3">
              <FolderOpen className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                No projects yet
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Add a client and create your first project to see fill progress
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Client
                  </TableHead>
                  <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Project
                  </TableHead>
                  <TableHead scope="col" className="min-w-[240px] text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role Fill Progress
                  </TableHead>
                  <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.projectId}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    <TableCell className="font-medium text-slate-700">
                      {row.clientName}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/projects/${row.projectId}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {row.projectName}
                        <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.roles.length === 0 ? (
                        <span className="text-xs text-slate-400">
                          No roles defined
                        </span>
                      ) : (
                        <div className="space-y-1.5">
                          {row.roles.map((role) => (
                            <RoleFillBar
                              key={role.name}
                              name={role.name}
                              filled={role.filled}
                              target={role.target}
                            />
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant(row.status)}
                        className="gap-1.5 text-xs"
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            statusDot(row.status)
                          )}
                        />
                        {row.status.charAt(0).toUpperCase() +
                          row.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
