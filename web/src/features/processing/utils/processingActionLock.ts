import type { PendingStatusChangeRequest } from "@/features/candidates/api";
import { format } from "date-fns";

export type ProcessingActionLockReason =
  | "pending_cancel"
  | "pending_hold"
  | "cancelled"
  | "on_hold";

export interface ProcessingActionLockState {
  isLocked: boolean;
  reason: ProcessingActionLockReason | null;
  tooltip: string | null;
  pendingRequest?: PendingStatusChangeRequest | null;
  submittedAtLabel?: string | null;
}

const LOCK_TOOLTIPS: Record<ProcessingActionLockReason, string> = {
  pending_cancel: "Cancellation request is pending approval",
  pending_hold: "Hold request is pending approval",
  cancelled: "This processing has been cancelled — actions are disabled",
  on_hold: "This processing is on hold — actions are disabled",
};

export function formatProcessingStatusChangeRequestDate(
  createdAt?: string | null,
): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "PPP 'at' p");
}

export function getProcessingActionLock(input: {
  pendingRequest?: PendingStatusChangeRequest | null;
  processingStatus?: string;
}): ProcessingActionLockState {
  const { pendingRequest, processingStatus } = input;
  const submittedAtLabel = formatProcessingStatusChangeRequestDate(
    pendingRequest?.createdAt,
  );
  const base = {
    pendingRequest: pendingRequest ?? null,
    submittedAtLabel,
  };

  if (pendingRequest?.requestType === "processing_cancel") {
    return {
      ...base,
      isLocked: true,
      reason: "pending_cancel",
      tooltip: LOCK_TOOLTIPS.pending_cancel,
    };
  }

  if (pendingRequest?.requestType === "processing_hold") {
    return {
      ...base,
      isLocked: true,
      reason: "pending_hold",
      tooltip: LOCK_TOOLTIPS.pending_hold,
    };
  }

  if (processingStatus === "cancelled") {
    return {
      ...base,
      isLocked: true,
      reason: "cancelled",
      tooltip: LOCK_TOOLTIPS.cancelled,
    };
  }

  if (processingStatus === "on_hold") {
    return {
      ...base,
      isLocked: true,
      reason: "on_hold",
      tooltip: LOCK_TOOLTIPS.on_hold,
    };
  }

  return {
    ...base,
    isLocked: false,
    reason: null,
    tooltip: null,
  };
}
