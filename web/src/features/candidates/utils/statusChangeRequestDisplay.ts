import type { PendingStatusChangeRequest } from "@/features/candidates/api";
import { formatProcessingStepLabel } from "@/features/processing/utils/formatProcessingStepLabel";
import {
  getProcessingStatusChangeTransition,
  type ProcessingStatusChangeRequestType,
} from "@/features/processing/utils/processingStatusChangeDisplay";
import { getStatusChangeTargetLabel } from "./candidateProjectPipelineBlocked";

export function isProcessingStatusChangeRequestType(
  requestType: string,
): requestType is ProcessingStatusChangeRequestType {
  return (
    requestType === "processing_cancel" ||
    requestType === "processing_hold" ||
    requestType === "processing_reactivate"
  );
}

export function getStatusChangeRequestTitle(
  request: Pick<PendingStatusChangeRequest, "requestType" | "requestedStatus">,
): string {
  if (request.requestType === "reactivate") {
    return "Reactivation";
  }

  if (isProcessingStatusChangeRequestType(request.requestType)) {
    return getProcessingStatusChangeTransition(request.requestType).reviewTitle;
  }

  if (request.requestedStatus) {
    return getStatusChangeTargetLabel(request.requestedStatus);
  }

  return "Status Change";
}

export function getStatusChangeRequestCategory(
  requestType: string,
): "pipeline" | "processing" {
  return isProcessingStatusChangeRequestType(requestType)
    ? "processing"
    : "pipeline";
}

export function getStatusChangeRequestDisplay(
  request: Pick<
    PendingStatusChangeRequest,
    "requestType" | "requestedStatus" | "stepKey"
  >,
) {
  const title = getStatusChangeRequestTitle(request);
  const category = getStatusChangeRequestCategory(request.requestType);
  const stepLabel = request.stepKey
    ? formatProcessingStepLabel(request.stepKey)
    : null;

  const processingTransition = isProcessingStatusChangeRequestType(
    request.requestType,
  )
    ? getProcessingStatusChangeTransition(request.requestType)
    : null;

  return {
    title,
    category,
    stepLabel,
    processingTransition,
    headline: `${title} Request`,
  };
}

export function getStatusChangeRequestAccent(
  requestType: string,
  requestedStatus?: string,
) {
  if (requestType === "processing_cancel") {
    return {
      iconWrap: "bg-rose-100 text-rose-700 ring-1 ring-rose-200/60",
      border: "border-rose-200/70",
      category: "border-rose-200 bg-rose-50 text-rose-800",
      targetBadge: "border-rose-200 bg-rose-50 text-rose-800",
      card: "border-rose-100/80 bg-gradient-to-br from-white via-white to-rose-50/50",
      leftAccent: "border-l-rose-400",
      noteSurface: "border-rose-100/60 bg-rose-50/30",
    };
  }

  if (requestType === "processing_hold") {
    return {
      iconWrap: "bg-orange-100 text-orange-700 ring-1 ring-orange-200/60",
      border: "border-orange-200/70",
      category: "border-orange-200 bg-orange-50 text-orange-800",
      targetBadge: "border-orange-200 bg-orange-50 text-orange-800",
      card: "border-orange-100/80 bg-gradient-to-br from-white via-white to-orange-50/50",
      leftAccent: "border-l-orange-400",
      noteSurface: "border-orange-100/60 bg-orange-50/30",
    };
  }

  if (
    requestType === "processing_reactivate" ||
    requestType === "reactivate"
  ) {
    return {
      iconWrap: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60",
      border: "border-emerald-200/70",
      category: "border-emerald-200 bg-emerald-50 text-emerald-800",
      targetBadge: "border-emerald-200 bg-emerald-50 text-emerald-800",
      card: "border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/50",
      leftAccent: "border-l-emerald-400",
      noteSurface: "border-emerald-100/60 bg-emerald-50/30",
    };
  }

  if (requestType === "block" && requestedStatus === "on_hold") {
    return {
      iconWrap: "bg-amber-100 text-amber-800 ring-1 ring-amber-200/60",
      border: "border-amber-200/70",
      category: "border-amber-200 bg-amber-50 text-amber-900",
      targetBadge: "border-amber-200 bg-amber-50 text-amber-900",
      card: "border-amber-100/80 bg-gradient-to-br from-white via-white to-amber-50/50",
      leftAccent: "border-l-amber-400",
      noteSurface: "border-amber-100/60 bg-amber-50/30",
    };
  }

  return {
    iconWrap: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/60",
    border: "border-slate-200/70",
    category: "border-slate-200 bg-slate-50 text-slate-700",
    targetBadge: "border-slate-200 bg-slate-50 text-slate-800",
    card: "border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80",
    leftAccent: "border-l-slate-400",
    noteSurface: "border-slate-200/60 bg-slate-50/50",
  };
}
