import { AlertCircle, FileText, PauseCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewedStatusChangeRequest } from "@/features/candidates/api";
import { formatProcessingStatusChangeRequestDate } from "@/features/processing/utils/processingActionLock";

interface ProcessingStatusChangeOutcomeBannerProps {
  request: ReviewedStatusChangeRequest;
}

function getOutcomeCopy(request: ReviewedStatusChangeRequest) {
  const isApproved = request.status === "approved";
  const isCancel = request.requestType === "processing_cancel";
  const isHold = request.requestType === "processing_hold";

  if (isCancel && isApproved) {
    return {
      title: "Cancellation request approved",
      subtitle: "Processing has been cancelled for this candidate.",
      badge: "Approved",
      Icon: XCircle,
      theme: {
        border: "border-rose-200",
        bg: "bg-gradient-to-br from-rose-50 to-rose-100/80",
        iconWrap: "bg-rose-600 text-white",
        title: "text-rose-900",
        meta: "text-rose-700",
        badge: "border-rose-300 bg-rose-100 text-rose-800",
        accent: "text-rose-600",
      },
    };
  }

  if (isCancel && !isApproved) {
    return {
      title: "Cancellation request rejected",
      subtitle: "Processing will continue as before.",
      badge: "Rejected",
      Icon: XCircle,
      theme: {
        border: "border-amber-200",
        bg: "bg-gradient-to-br from-amber-50 to-orange-50",
        iconWrap: "bg-amber-600 text-white",
        title: "text-amber-900",
        meta: "text-amber-800",
        badge: "border-amber-300 bg-amber-100 text-amber-900",
        accent: "text-amber-700",
      },
    };
  }

  if (isHold && isApproved) {
    return {
      title: "Hold request approved",
      subtitle: "Processing is on hold until further notice.",
      badge: "Approved",
      Icon: PauseCircle,
      theme: {
        border: "border-orange-200",
        bg: "bg-gradient-to-br from-orange-50 to-amber-50",
        iconWrap: "bg-orange-600 text-white",
        title: "text-orange-900",
        meta: "text-orange-800",
        badge: "border-orange-300 bg-orange-100 text-orange-900",
        accent: "text-orange-700",
      },
    };
  }

  return {
    title: "Hold request rejected",
    subtitle: "Processing will continue as before.",
    badge: "Rejected",
    Icon: PauseCircle,
    theme: {
      border: "border-amber-200",
      bg: "bg-gradient-to-br from-amber-50 to-orange-50",
      iconWrap: "bg-amber-600 text-white",
      title: "text-amber-900",
      meta: "text-amber-800",
      badge: "border-amber-300 bg-amber-100 text-amber-900",
      accent: "text-amber-700",
    },
  };
}

export function ProcessingStatusChangeOutcomeBanner({
  request,
}: ProcessingStatusChangeOutcomeBannerProps) {
  const copy = getOutcomeCopy(request);
  const ThemeIcon = copy.Icon;
  const reviewedAtLabel = formatProcessingStatusChangeRequestDate(
    request.reviewedAt ?? undefined,
  );
  const reviewerLabel = request.reviewer?.name?.trim() || "Unknown reviewer";

  return (
    <div
      className={cn(
        "w-full rounded-xl border-2 p-4 shadow-lg",
        copy.theme.border,
        copy.theme.bg,
      )}
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm",
              copy.theme.iconWrap,
            )}
          >
            <ThemeIcon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-lg font-bold", copy.theme.title)}>
              {copy.title}
            </h3>
            <p className={cn("mt-0.5 text-sm", copy.theme.meta)}>
              {copy.subtitle}
            </p>
            <p className={cn("mt-2 text-xs", copy.theme.meta)}>
              {request.status === "approved" ? "Approved" : "Rejected"} by{" "}
              <span className="font-semibold">{reviewerLabel}</span>
              {reviewedAtLabel ? (
                <>
                  {" "}
                  on <span className="font-semibold">{reviewedAtLabel}</span>
                </>
              ) : null}
            </p>
            {request.requester?.name ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Originally requested by {request.requester.name}
              </p>
            ) : null}
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", copy.theme.badge)}>
          {copy.badge}
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-white/80 bg-white/90 p-3 shadow-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <FileText className={cn("h-4 w-4", copy.theme.accent)} aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Request reason
            </p>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {request.reason}
          </p>
        </div>

        {request.reviewNotes?.trim() ? (
          <div className="rounded-lg border border-white/80 bg-white/90 p-3 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2">
              <AlertCircle
                className={cn("h-4 w-4", copy.theme.accent)}
                aria-hidden
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Review notes
              </p>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              {request.reviewNotes.trim()}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No review notes were provided.
          </p>
        )}
      </div>
    </div>
  );
}
