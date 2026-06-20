import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  History,
  User,
  CalendarDays,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useGetProjectAgentCandidateRequestsQuery,
  type AgentCandidateRequestStatus,
} from "@/features/projects/api";

const STATUS_CONFIG: Record<
  AgentCandidateRequestStatus,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
  },
  APPROVED: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-400",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-400",
  },
};

interface AgentCandidateRequestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

export default function AgentCandidateRequestHistoryModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
}: AgentCandidateRequestHistoryModalProps) {
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, isFetching } = useGetProjectAgentCandidateRequestsQuery(
    { projectId, page, limit },
    { skip: !isOpen }
  );

  const requests = data?.data ?? [];
  const meta = data?.meta;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-xl">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-foreground">
                Request History
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm leading-relaxed line-clamp-1">
                Past agent candidate requests for{" "}
                <span className="font-medium text-foreground">{projectTitle}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mx-6 h-px bg-border" />

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-muted/20 p-4 animate-pulse space-y-2"
                >
                  <div className="flex justify-between">
                    <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                    <div className="h-5 w-16 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              ))
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Inbox className="h-7 w-7 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-600">No requests yet</p>
                <p className="text-sm text-slate-400 text-center max-w-xs">
                  No agent candidate requests have been submitted for this project.
                </p>
              </div>
            ) : (
              <div className={cn("space-y-3", isFetching && "opacity-60 pointer-events-none transition-opacity")}>
                {requests.map((req) => {
                  const s = STATUS_CONFIG[req.status];
                  const totalRequested = req.items.reduce(
                    (sum, item) => sum + item.requestedCount,
                    0
                  );
                  const requestDate = new Date(req.createdAt);

                  return (
                    <div
                      key={req.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                    >
                      {/* Top row: requester + status badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold uppercase">
                            {req.requestedBy.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {req.requestedBy.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {req.requestedBy.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-2 py-0", s.className)}
                          >
                            {s.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      {/* Role items */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Roles Requested
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {req.items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                            >
                              <span className="font-bold">{item.requestedCount}×</span>
                              {item.roleNeeded?.designation ?? "Role"}
                            </span>
                          ))}
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                            Total: {totalRequested} candidate{totalRequested !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Notes */}
                      {req.notes && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Notes
                          </p>
                          <p className="text-xs text-muted-foreground italic leading-relaxed">
                            "{req.notes}"
                          </p>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>{format(requestDate, "d MMM yyyy, h:mm a")}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>{formatDistanceToNow(requestDate, { addSuffix: true })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer: pagination + close */}
        <div className="shrink-0 border-t border-border bg-background px-6 py-4">
          {meta && meta.total > 0 && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, meta.total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">{meta.total}</span>{" "}
                request{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground px-1 min-w-[48px] text-center">
                  {page} / {meta.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={page >= meta.totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full h-9"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
