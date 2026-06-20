import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import { useCreateProcessingStatusChangeRequestMutation } from "@/features/processing/data/processing.endpoints";
import { useProcessingActionLock } from "@/features/processing/context/ProcessingActionLockContext";
import RequestProcessingActionModal, {
  type ProcessingActionType,
} from "./RequestProcessingActionModal";

const PROCESSING_DIRECT_ROLES = new Set(["Manager", "Processing Manager"]);

interface ProcessingStepActionButtonsProps {
  processingStepId?: string;
  show?: boolean;
  hasPendingRequest?: boolean;
  onSubmitted?: () => void | Promise<void>;
  size?: "sm" | "default";
}

function LockedActionButton({
  disabled,
  tooltip,
  children,
}: {
  disabled: boolean;
  tooltip?: string | null;
  children: React.ReactElement<{ disabled?: boolean; className?: string }>;
}) {
  if (!disabled || !tooltip) {
    return children;
  }

  const disabledChild = React.cloneElement(children, {
    disabled: true,
    className: [children.props.className, "opacity-80"].filter(Boolean).join(" "),
    "aria-disabled": true,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">{disabledChild}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProcessingStepActionButtons({
  processingStepId,
  show = true,
  hasPendingRequest = false,
  onSubmitted,
  size = "sm",
}: ProcessingStepActionButtonsProps) {
  const { user } = useAppSelector((state) => state.auth);
  const roleNames = user?.roles ?? [];
  const isDirectAction = roleNames.some((name) => PROCESSING_DIRECT_ROLES.has(name));
  const { isLocked, tooltip: lockTooltip } = useProcessingActionLock();

  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ProcessingActionType>("cancel");
  const [createRequest, { isLoading }] = useCreateProcessingStatusChangeRequestMutation();

  if (!show || !processingStepId) return null;

  const actionsDisabled = isLoading || hasPendingRequest || isLocked;
  const actionLockTooltip =
    lockTooltip ??
    (hasPendingRequest ? "A status change request is pending approval" : null);

  const openModal = (type: ProcessingActionType) => {
    if (actionsDisabled) return;
    setActionType(type);
    setModalOpen(true);
  };

  const handleConfirm = async (reason: string) => {
    if (!processingStepId) return;
    try {
      const requestType =
        actionType === "cancel" ? "processing_cancel" : "processing_hold";
      const result = await createRequest({
        processingStepId,
        requestType,
        reason,
      }).unwrap();

      const isPending = result?.data?.status === "pending";
      if (isPending) {
        toast.success(
          actionType === "cancel"
            ? "Cancellation request submitted for approval"
            : "Hold request submitted for approval",
        );
      } else {
        toast.success(
          actionType === "cancel"
            ? "Processing cancelled"
            : "Processing put on hold",
        );
      }

      setModalOpen(false);
      await onSubmitted?.();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        (err as { error?: string })?.error ||
        "Failed to submit request";
      toast.error(message);
    }
  };

  return (
    <>
      <LockedActionButton disabled={actionsDisabled} tooltip={actionLockTooltip}>
        <Button
          variant="outline"
          size={size}
          onClick={() => openModal("hold")}
          disabled={actionsDisabled}
          className="border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          {isLoading && actionType === "hold" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <PauseCircle className="h-3.5 w-3.5 mr-1" />
          )}
          {isDirectAction ? "Hold Processing" : "Request Hold"}
        </Button>
      </LockedActionButton>

      <LockedActionButton disabled={actionsDisabled} tooltip={actionLockTooltip}>
        <Button
          variant="destructive"
          size={size}
          onClick={() => openModal("cancel")}
          disabled={actionsDisabled}
        >
          {isLoading && actionType === "cancel" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : null}
          {isDirectAction ? "Cancel Processing" : "Request Cancel"}
        </Button>
      </LockedActionButton>

      <React.Suspense fallback={null}>
        <RequestProcessingActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          actionType={actionType}
          onConfirm={handleConfirm}
          isSubmitting={isLoading}
          isDirectAction={isDirectAction}
        />
      </React.Suspense>
    </>
  );
}
