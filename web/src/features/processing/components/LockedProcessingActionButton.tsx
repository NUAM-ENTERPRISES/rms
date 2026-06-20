import { cloneElement, isValidElement, type ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProcessingActionLock } from "../context/ProcessingActionLockContext";

interface LockedProcessingActionButtonProps {
  children: ReactElement<{ disabled?: boolean; className?: string }>;
  forceDisabled?: boolean;
  lockTooltip?: string | null;
}

export function LockedProcessingActionButton({
  children,
  forceDisabled = false,
  lockTooltip,
}: LockedProcessingActionButtonProps) {
  const { isLocked, tooltip } = useProcessingActionLock();
  const shouldDisable = forceDisabled || isLocked;
  const message =
    lockTooltip ??
    tooltip ??
    (shouldDisable ? "This action is unavailable" : null);

  if (!shouldDisable || !message) {
    return children;
  }

  if (!isValidElement(children)) {
    return children;
  }

  const disabledChild = cloneElement(children, {
    disabled: true,
    className: [children.props.className, "opacity-80"].filter(Boolean).join(" "),
    "aria-disabled": true,
    onClick: undefined,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">{disabledChild}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
