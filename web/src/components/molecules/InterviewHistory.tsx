// React import not directly used (JSX runtime handles it)
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, Clock, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type InterviewHistoryItem = {
  id: string;
  date: string;
  actor?: string;
  action: string;
  status?: string;
  note?: string;
};

export const screeningHistory: InterviewHistoryItem[] = [ /* your mock data */ ];

const statusColor = (s?: string) => {
  if (!s) return "bg-slate-100 text-slate-600 border-slate-200";
  if (s === "passed" || s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "failed") return "bg-red-50 text-red-700 border-red-200";
  if (s === "scheduled") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "updated") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "notified") return "bg-purple-50 text-purple-700 border-purple-200";
  if (s === "created") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (s === "basic_training_assigned" || s === "screening_assigned" || s === "interview_assigned")
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (s === "in_progress") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "cancelled") return "bg-red-50 text-red-700 border-red-200";
  if (s === "assigned") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

const statusDotColor = (s?: string) => {
  if (!s) return "bg-slate-400";
  if (s === "passed" || s === "completed") return "bg-emerald-500";
  if (s === "failed" || s === "cancelled") return "bg-red-500";
  if (s === "scheduled") return "bg-amber-500";
  if (s === "updated" || s === "in_progress") return "bg-blue-500";
  if (s === "notified") return "bg-purple-500";
  if (s === "created") return "bg-cyan-500";
  if (
    s === "basic_training_assigned" ||
    s === "screening_assigned" ||
    s === "interview_assigned" ||
    s === "assigned"
  )
    return "bg-indigo-500";
  return "bg-slate-400";
};

const mapHistoryStatusLabel = (status?: string) => {
  if (!status) return "Unknown";
  switch (status) {
    case "basic_training_assigned": return "Basic Training Assigned";
    case "screening_assigned": return "Screening Assigned";
    case "interview_assigned": return "Interview Assigned";
    case "ready_for_reassessment": return "Ready for Reassessment";
    case "assigned": return "Assigned";
    case "in_progress": return "In Progress";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

type ServerHistoryItem = {
  id: string;
  interviewType?: string;
  interviewId?: string;
  previousStatus?: string | null;
  status?: string;
  statusSnapshot?: string;
  statusAt?: string;
  changedById?: string;
  changedByName?: string;
  changedBy?: { id?: string; name?: string; email?: string };
  reason?: string;
  createdAt?: string;
};

export default function InterviewHistory({
  items,
  isLoading,
  pagination,
  onPageChange,
  onLimitChange,
}: {
  items?: (InterviewHistoryItem | ServerHistoryItem)[];
  isLoading?: boolean;
  pagination?: { page: number; limit: number; total: number; totalPages: number } | null;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}) {
  const list = items !== undefined && items !== null ? (Array.isArray(items) ? items : []) : screeningHistory;
  const totalCount = pagination?.total ?? list.length;

  const normalized = list.map((raw) => {
    if ((raw as ServerHistoryItem).statusAt) {
      const srv = raw as ServerHistoryItem;
      const statusRaw = srv.status;
      return {
        id: srv.id,
        date: srv.statusAt || srv.createdAt,
        action: srv.statusSnapshot || srv.reason || mapHistoryStatusLabel(statusRaw) || "Status Updated",
        actor: srv.changedByName || srv.changedBy?.name || "System",
        statusRaw,
        status: srv.statusSnapshot || mapHistoryStatusLabel(statusRaw),
        note: srv.reason,
        previousStatus: srv.previousStatus,
      };
    }
    const it = raw as InterviewHistoryItem;
    return {
      id: it.id,
      date: it.date,
      action: it.action,
      actor: it.actor,
      statusRaw: it.status,
      status: it.status ? mapHistoryStatusLabel(it.status) : undefined,
      note: it.note,
      previousStatus: undefined,
    };
  });

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-500" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Activity Timeline</h4>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {totalCount} {totalCount === 1 ? "event" : "events"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                <div className="h-3 w-3 rounded-full bg-slate-200" />
                <div className="w-px h-10 bg-slate-100" />
              </div>
              <div className="flex-1 pb-4 space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-40 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : normalized.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
          <History className="h-8 w-8 text-slate-200 mb-2" />
          <p className="text-sm font-bold text-slate-400">No history available</p>
          <p className="text-[11px] text-slate-400 mt-1">Activity events will appear here once recorded.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline track */}
          <div className="absolute left-[5px] top-2 bottom-0 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />

          <div className="space-y-0">
            {normalized.map((it, idx) => (
              <div key={it.id} className="relative flex gap-4 group">
                {/* Dot + line */}
                <div className="flex flex-col items-center shrink-0 pt-1.5 z-10">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm transition-transform group-hover:scale-125",
                      statusDotColor(it.statusRaw)
                    )}
                  />
                  {idx < normalized.length - 1 && (
                    <div className="w-px flex-1 min-h-[28px] bg-slate-100" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 pb-5 min-w-0",
                    idx === normalized.length - 1 && "pb-0"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                    {/* Left: action + note */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-[13px] font-semibold text-slate-800 leading-tight">{it.action}</p>
                        {it.status && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-2 py-0 h-4 border rounded-full",
                              statusColor(it.statusRaw)
                            )}
                          >
                            {it.status}
                          </Badge>
                        )}
                      </div>

                      {/* Previous → current status transition */}
                      {it.previousStatus && it.statusRaw && it.previousStatus !== it.statusRaw && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                            {mapHistoryStatusLabel(it.previousStatus)}
                          </span>
                          <ArrowRight className="h-2.5 w-2.5 text-slate-300" />
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                            statusColor(it.statusRaw)
                          )}>
                            {mapHistoryStatusLabel(it.statusRaw)}
                          </span>
                        </div>
                      )}

                      {it.note && (
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2 pr-4 italic">
                          "{it.note}"
                        </p>
                      )}
                    </div>

                    {/* Right: date + actor */}
                    <div className="shrink-0 text-right sm:pl-4 flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0.5">
                      {it.date && (
                        <>
                          <p className="text-[11px] font-bold text-slate-700">
                            {format(new Date(it.date), "dd MMM yyyy")}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 sm:justify-end">
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(it.date), "hh:mm a")}
                          </p>
                        </>
                      )}
                      {it.actor && (
                        <p className="text-[10px] text-indigo-500 font-bold mt-1 hidden sm:block">
                          {it.actor}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actor badge (mobile) */}
                  {it.actor && (
                    <div className="mt-1 sm:hidden">
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                        {it.actor}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Rows:</span>
            <select
              value={pagination.limit}
              onChange={(e) => onLimitChange?.(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span className="text-slate-400">
              Showing <span className="font-bold text-slate-600">{list.length}</span> of{" "}
              <span className="font-bold text-slate-600">{pagination.total}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange?.(Math.max(1, (pagination.page || 1) - 1))}
              disabled={isLoading || (pagination.page || 1) <= 1}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 px-2">
              {pagination.page} <span className="text-slate-400 font-normal">/ {pagination.totalPages}</span>
            </div>
            <button
              onClick={() => onPageChange?.(Math.min(pagination.totalPages, (pagination.page || 1) + 1))}
              disabled={isLoading || (pagination.page || 1) >= pagination.totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}