import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import {
  ChevronRight,
  Building2,
  UserRoundSearch,
  Inbox,
  CalendarDays,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FlagIcon } from "@/shared/components/FlagIcon";
import {
  useGetAgentCandidateRequestsQuery,
  type AgentCandidateRequestStatus,
} from "@/features/projects/api";

const STATUS_CONFIG: Record<
  AgentCandidateRequestStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  APPROVED: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const FILTERS: Array<{ label: string; value: AgentCandidateRequestStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

/** Renders the requests list panel — designed to be embedded inside the main card body. */
export function AgentCandidateRequestsPanel() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<AgentCandidateRequestStatus | "ALL">(
    "PENDING"
  );
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isFetching } = useGetAgentCandidateRequestsQuery({
    page,
    limit,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
  });

  const requests = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-6 py-3 bg-slate-50/40">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-0.5 text-xs font-medium transition-all",
              statusFilter === f.value
                ? "border-amber-300 bg-amber-100 text-amber-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-slate-50 px-6 py-4 animate-pulse last:border-0"
            >
              <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-2/5" />
              </div>
              <div className="h-5 w-16 rounded-full bg-slate-100 shrink-0" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Inbox className="h-7 w-7 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600">No requests found</p>
          <p className="text-sm text-slate-400 text-center max-w-xs">
            {statusFilter === "PENDING"
              ? "No pending requests right now. You're all caught up!"
              : "No requests match the selected filter."}
          </p>
        </div>
      ) : (
        <>
          <div className={cn(isFetching && "opacity-60 pointer-events-none transition-opacity")}>
            {requests.map((req, idx) => {
              const status = STATUS_CONFIG[req.status];
              const totalRequested = req.items.reduce(
                (sum, item) => sum + item.requestedCount,
                0
              );

              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => navigate(`/projects/${req.project.id}`)}
                  className={cn(
                    "group w-full text-left px-6 py-4 transition-all duration-150 hover:bg-amber-50/60",
                    idx < requests.length - 1 && "border-b border-slate-100"
                  )}
                  aria-label={`View project ${req.project.title}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                      <UserRoundSearch className="h-[18px] w-[18px]" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                            {req.project.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {req.project.client?.name ?? "—"}
                            </span>
                            {req.project.countryCode && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                <FlagIcon
                                  countryCode={req.project.countryCode}
                                  size="sm"
                                  className="rounded-sm shadow-sm"
                                  aria-label={
                                    req.project.country?.name ?? req.project.countryCode
                                  }
                                />
                                <span className="font-medium text-slate-600">
                                  {req.project.country?.name ??
                                    req.project.countryCode.toUpperCase()}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-2 py-0", status.className)}
                          >
                            {status.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0 tabular-nums"
                          >
                            {totalRequested} to fill
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          Roles needed
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {req.items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs shadow-sm"
                            >
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-amber-600 px-1 text-[11px] font-bold tabular-nums text-white">
                                {item.requestedCount}
                              </span>
                              <span className="truncate font-medium text-amber-900">
                                {item.roleNeeded?.designation ?? "Role"}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <User className="h-3 w-3 shrink-0" />
                          {req.requestedBy.name}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          {format(new Date(req.createdAt), "d MMM yyyy")}
                          <span className="text-slate-300">·</span>
                          {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      {req.notes && (
                        <p className="line-clamp-2 text-xs italic text-slate-400">
                          "{req.notes}"
                        </p>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {(page - 1) * limit + 1}–
                  {Math.min(page * limit, meta.total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">{meta.total}</span>{" "}
                requests
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-xl border-slate-200"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="text-xs tabular-nums text-slate-500 px-1">
                  {page} / {meta.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-xl border-slate-200"
                  disabled={page >= meta.totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Thin hook to get the pending requests count for the stat tile. */
export function useAgentCandidateRequestsCount(skip: boolean) {
  const { data } = useGetAgentCandidateRequestsQuery(
    { page: 1, limit: 1, status: "PENDING" },
    { skip }
  );
  return data?.meta?.total ?? 0;
}
