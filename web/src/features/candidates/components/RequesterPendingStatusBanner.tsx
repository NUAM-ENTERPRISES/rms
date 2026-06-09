import { Clock, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";
import type { PendingStatusChangeRequest } from "@/features/candidates/api";

interface RequesterPendingStatusBannerProps {
  request: PendingStatusChangeRequest;
}

export function RequesterPendingStatusBanner({
  request,
}: RequesterPendingStatusBannerProps) {
  const statusLabel = getStatusChangeTargetLabel(request.requestedStatus);
  const formattedDate = new Date(request.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 p-5 shadow-md transition-shadow hover:shadow-lg",
      )}
      role="status"
    >
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-blue-100/40 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <Clock className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-900">
                {statusLabel} Request Submitted
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-blue-600">
                <FileText className="h-3 w-3" />
                <span>{formattedDate}</span>
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100"
          >
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-3 w-3 text-blue-600" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Your Remarks
              </p>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              {request.reason}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-100/50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-blue-900">
                Awaiting Approval
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                Your request is being reviewed by a manager or admin. You'll be
                notified once it's processed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
