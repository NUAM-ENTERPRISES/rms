// React import not directly used (JSX runtime handles it)
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type InterviewHistoryItem = {
  id: string;
  date: string; // ISO date
  actor?: string; // who made the change
  action: string; // e.g., "Status updated to passed"
  status?: string; // passed/failed/pending
  note?: string;
};

export const screeningHistory: InterviewHistoryItem[] = [
  {
    id: "h1",
    date: new Date().toISOString(),
    actor: "Jane Doe",
    action: "Status updated to completed",
    status: "completed",
    note: "Candidate performed well on the coding challenge.",
  },
  {
    id: "h2",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    actor: "John Smith",
    action: "Screening scheduled",
    status: "scheduled",
  },
  {
    id: "h3",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    actor: "Jane Doe",
    action: "Meeting link added",
    status: "updated",
    note: "Added Zoom meeting link for the interview",
  },
  {
    id: "h4",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    actor: "Recruiter Bot",
    action: "Reminder sent to candidate",
    status: "notified",
  },
  {
    id: "h5",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    actor: "System",
    action: "Screening created",
    status: "created",
    note: "Auto-created after candidate applied to project",
  },
];

const statusColor = (s?: string) => {
  if (!s) return "bg-slate-100 text-slate-700 border-slate-200";
  if (s === "passed" || s === "completed") return "bg-green-100 text-green-700 border-green-200";
  if (s === "failed") return "bg-red-100 text-red-700 border-red-200";
  if (s === "scheduled") return "bg-amber-100 text-amber-700 border-amber-200";
  if (s === "updated") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "notified") return "bg-purple-100 text-purple-700 border-purple-200";
  if (s === "created") return "bg-cyan-100 text-cyan-700 border-cyan-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const mapHistoryStatusLabel = (status?: string) => {
  if (!status) return "Unknown";
  switch (status) {
    case "basic_training_assigned":
      return "Basic Training Assigned";
    case "screening_assigned":
      return "Screening Assigned";
    case "interview_assigned":
      return "Interview Assigned";
    case "ready_for_reassessment":
      return "Ready for Reassessment";
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  // `items` comes from server (array) or mock local data — fall back to mock only when `items` is undefined
  const list = items !== undefined && items !== null ? (Array.isArray(items) ? items : []) : screeningHistory;
  const totalCount = pagination?.total ?? list.length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Interview History
          </h3>
          <Badge variant="outline" className="text-xs">
            {totalCount} {totalCount === 1 ? "event" : "events"}
          </Badge>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="w-[140px]">Actor</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="text-sm text-muted-foreground">Loading history…</div>
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No history available
                  </TableCell>
                </TableRow>
              ) : (
                list.map((raw) => {
                  // Normalize server or local mock item
                  const it = (raw as ServerHistoryItem).statusAt
                    ? (() => {
                        const srv = raw as ServerHistoryItem;
                        const statusRaw = srv.status;
                        const statusDisplay = srv.statusSnapshot || mapHistoryStatusLabel(statusRaw);
                        return {
                          id: srv.id,
                          date: srv.statusAt || srv.createdAt,
                          action: srv.statusSnapshot || srv.reason || mapHistoryStatusLabel(statusRaw) || "Updated",
                          actor: srv.changedByName || srv.changedBy?.name || "System",
                          statusRaw,
                          status: statusDisplay,
                          note: srv.reason,
                        };
                      })()
                    : (raw as InterviewHistoryItem);

                  return (
                    <TableRow key={it.id} className="group hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-foreground">
                              {format(new Date(it.date ?? ""), "MMM d, yyyy")}
                            </div>
                            <div className="text-muted-foreground">
                              {format(new Date(it.date ?? ""), "h:mm a")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{it.action}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {it.actor || "System"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize font-medium border",
                            statusColor((it as any).statusRaw || (it as any).status)
                          )}
                        >
                          {(it as any).status || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination controls (shown when server provides pagination) */}
          {pagination ? (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/5">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-medium">{list.length}</span> of <span className="font-medium">{pagination.total}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-muted-foreground">Per page</label>
                  <select
                    value={pagination.limit}
                    onChange={(e) => onLimitChange && onLimitChange(Number(e.target.value))}
                    className="text-xs bg-transparent border rounded px-2 py-1"
                    disabled={isLoading}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange && onPageChange(Math.max(1, (pagination.page || 1) - 1))}
                    className="px-2 py-1 rounded border text-xs"
                    disabled={isLoading || (pagination.page || 1) <= 1}
                  >
                    Prev
                  </button>
                  <div className="text-xs text-muted-foreground">Page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.totalPages}</span></div>
                  <button
                    onClick={() => onPageChange && onPageChange(Math.min(pagination.totalPages, (pagination.page || 1) + 1))}
                    className="px-2 py-1 rounded border text-xs"
                    disabled={isLoading || (pagination.page || 1) >= pagination.totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
