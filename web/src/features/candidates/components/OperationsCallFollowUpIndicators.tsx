import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getDisplayedOperationsCallAttempts,
  getOperationsCallAttempts,
  getOperationsFollowUpStage,
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
  type OperationsFollowUpAssignment,
} from "@/features/candidates/utils/operations-follow-up.util";

export type OperationsCallFollowUpIndicatorsProps = {
  assignment?: OperationsFollowUpAssignment;
  canLogCall?: boolean;
  onLogCall?: () => void;
  onViewHistory?: () => void;
  showLogCallButton?: boolean;
  isLoggingCall?: boolean;
};

export function OperationsCallFollowUpIndicators({
  assignment,
  canLogCall = false,
  onLogCall,
  onViewHistory,
  showLogCallButton = false,
  isLoggingCall = false,
}: OperationsCallFollowUpIndicatorsProps) {
  if (!assignment) {
    return null;
  }

  const followUpStage = getOperationsFollowUpStage(assignment);
  const callAttempts = getOperationsCallAttempts(assignment);
  const displayedCallAttempts = getDisplayedOperationsCallAttempts(callAttempts);
  const showInitialPill = followUpStage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL;
  const showViewHistory =
    Boolean(onViewHistory) &&
    (displayedCallAttempts > 0 ||
      followUpStage !== OPERATIONS_FOLLOW_UP_STAGE.INITIAL);

  if (!showInitialPill && !showViewHistory && !(showLogCallButton && canLogCall)) {
    return null;
  }

  return (
    <div className="mt-1.5 space-y-1">
      {showInitialPill && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
            displayedCallAttempts >= OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : displayedCallAttempts > 0
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-blue-200 bg-blue-50 text-blue-700",
          )}
        >
          <Phone className="h-2.5 w-2.5 shrink-0 opacity-80" aria-hidden />
          <span>
            {displayedCallAttempts}/{OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} calls
          </span>
        </span>
      )}

      {showViewHistory && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onViewHistory?.();
          }}
          className="block text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          View history
        </button>
      )}

      {showLogCallButton && canLogCall && onLogCall && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px] font-semibold border-slate-200"
          disabled={isLoggingCall}
          onClick={(event) => {
            event.stopPropagation();
            onLogCall();
          }}
        >
          Log Call
        </Button>
      )}
    </div>
  );
}
