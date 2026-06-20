import { CheckCircle2, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewedStatusChangeRequest } from "@/features/candidates/api";
import { getStatusChangeRequestTitle } from "@/features/candidates/utils/statusChangeRequestDisplay";

interface ReviewedStatusChangeRequestBannerProps {
  request: ReviewedStatusChangeRequest;
}

export function ReviewedStatusChangeRequestBanner({
  request,
}: ReviewedStatusChangeRequestBannerProps) {
  const statusLabel = getStatusChangeRequestTitle(request);

  const isApproved = request.status === "approved";
  const reviewedDate = request.reviewedAt
    ? new Date(request.reviewedAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-5 shadow-sm",
        isApproved
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50"
          : "border-red-200 bg-gradient-to-br from-red-50 to-rose-50",
      )}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
              isApproved
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white",
            )}
          >
            {isApproved ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            ) : (
              <XCircle className="h-6 w-6" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "text-base font-bold",
                isApproved ? "text-emerald-900" : "text-red-900",
              )}
            >
              {statusLabel} Request {isApproved ? "Approved" : "Rejected"}
            </h3>
            {reviewedDate && (
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  isApproved ? "text-emerald-700" : "text-red-700",
                )}
              >
                Reviewed on {reviewedDate}
                {request.reviewer?.name ? ` by ${request.reviewer.name}` : ""}
              </p>
            )}
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0",
            isApproved
              ? "border-emerald-300 bg-emerald-100 text-emerald-800"
              : "border-red-300 bg-red-100 text-red-800",
          )}
        >
          {isApproved ? "Approved" : "Rejected"}
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-white/80 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <FileText
              className={cn(
                "h-4 w-4",
                isApproved ? "text-emerald-600" : "text-red-600",
              )}
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Request Remarks
            </p>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {request.reason}
          </p>
        </div>

        {request.reviewNotes && (
          <div className="rounded-lg border border-white/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Reviewer Notes
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {request.reviewNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
