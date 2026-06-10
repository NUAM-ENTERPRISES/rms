import { useState } from "react";
import {
  History,
  User,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
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
  useGetCandidateProjectStatusChangeRequestHistoryQuery,
  type StatusChangeRequestHistoryItem,
} from "@/features/candidates/api";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
} as const;

interface StatusChangeRequestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProjectMapId: string;
  candidateName: string;
  projectTitle: string;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatusChangeRequestHistoryModal({
  isOpen,
  onClose,
  candidateProjectMapId,
  candidateName,
  projectTitle,
}: StatusChangeRequestHistoryModalProps) {
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, isFetching } =
    useGetCandidateProjectStatusChangeRequestHistoryQuery(
      { candidateProjectMapId, page, limit },
      { skip: !isOpen || !candidateProjectMapId },
    );

  const requests = data?.data ?? [];
  const meta = data?.meta;

  const renderRequest = (request: StatusChangeRequestHistoryItem) => {
    const statusKey = request.status as keyof typeof STATUS_CONFIG;
    const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
    const StatusIcon = config.icon;
    const statusLabel = getStatusChangeTargetLabel(request.requestedStatus);

    return (
      <div
        key={request.id}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{statusLabel} Request</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {formatDate(request.createdAt)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 gap-1", config.className)}
          >
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>
              Requested by{" "}
              <span className="font-medium text-foreground">
                {request.requester?.name ?? "Unknown"}
              </span>
            </span>
          </div>

          {request.reviewedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                Reviewed {formatDate(request.reviewedAt)}
                {request.reviewer?.name ? ` by ${request.reviewer.name}` : ""}
              </span>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="h-3 w-3" />
              Remarks
            </div>
            <p className="text-sm text-foreground">{request.reason}</p>
          </div>

          {request.reviewNotes && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Reviewer Notes
              </p>
              <p className="mt-1 text-sm text-foreground">{request.reviewNotes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-foreground">
                Request History
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm leading-relaxed">
                Withdrawn / On Hold requests for{" "}
                <span className="font-medium text-foreground">{candidateName}</span>{" "}
                on{" "}
                <span className="font-medium text-foreground">{projectTitle}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mx-6 h-px bg-border" />

        <ScrollArea className="flex-1">
          <div className="space-y-3 px-6 py-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse space-y-2 rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              ))
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Inbox className="h-7 w-7 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-600">No requests yet</p>
                <p className="max-w-xs text-center text-sm text-slate-400">
                  Withdrawn or On Hold requests will appear here once submitted.
                </p>
              </div>
            ) : (
              requests.map(renderRequest)
            )}
          </div>
        </ScrollArea>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-xs text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages || isFetching}
                onClick={() =>
                  setPage((current) => Math.min(meta.totalPages, current + 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
