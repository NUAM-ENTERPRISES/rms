import { useState } from "react";
import { Coffee, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useGetSessionsQuery,
  useSetSessionAvailabilityMutation,
} from "@/features/profile/api";
import { usePermissions } from "@/shared/hooks/usePermissions";
import type { SessionAvailability } from "@/shared/types/session-availability";

type PendingAvailability = {
  next: SessionAvailability;
  source: "break" | "call";
};

function confirmCopy(pending: PendingAvailability): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  if (pending.source === "break") {
    if (pending.next === "BREAK") {
      return {
        title: "Go on break?",
        description:
          "While on break you won’t be counted as idle when you’re away from your desk.",
        confirmLabel: "Yes, start break",
      };
    }
    return {
      title: "End break?",
      description: "Return to available status and normal activity tracking.",
      confirmLabel: "End break",
    };
  }
  if (pending.next === "ON_CALL") {
    return {
      title: "On a call now?",
      description:
        "Mark yourself on a call so you aren’t shown as idle during the call.",
      confirmLabel: "Yes, I'm on a call",
    };
  }
  return {
    title: "End on-call?",
    description: "Return to available when you’ve finished the call.",
    confirmLabel: "End on-call",
  };
}

const LEADERSHIP_ROLES = [
  "CEO",
  "Director",
  "Manager",
  "System Admin",
] as const;

export default function SessionAvailabilityToggles() {
  const { hasRole } = usePermissions();
  const isLeadership = hasRole([...LEADERSHIP_ROLES]);

  const { data: sessionsData } = useGetSessionsQuery();
  const [setAvailability, { isLoading }] = useSetSessionAvailabilityMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingAvailability | null>(null);

  const currentSession = sessionsData?.data?.find((s) => s.isCurrent);
  const availability: SessionAvailability =
    currentSession?.availability ?? "ACTIVE";

  if (isLeadership) {
    return null;
  }

  const onBreak = availability === "BREAK";
  const onCall = availability === "ON_CALL";

  const openBreakConfirm = () => {
    const next: SessionAvailability = onBreak ? "ACTIVE" : "BREAK";
    setPending({ next, source: "break" });
    setConfirmOpen(true);
  };

  const openCallConfirm = () => {
    const next: SessionAvailability = onCall ? "ACTIVE" : "ON_CALL";
    setPending({ next, source: "call" });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    await setAvailability({ availability: pending.next }).unwrap();
    setConfirmOpen(false);
    setPending(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setConfirmOpen(open);
    if (!open) setPending(null);
  };

  const copy = pending ? confirmCopy(pending) : null;

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          aria-pressed={onBreak}
          aria-label={onBreak ? "End break" : "Start break"}
          aria-haspopup="dialog"
          onClick={openBreakConfirm}
          className={cn(
            "h-8 gap-1.5 px-2.5 text-xs font-medium text-violet-100",
            "hover:bg-white/10 hover:text-white",
            onBreak && "bg-white/15 ring-1 ring-white/30 text-white"
          )}
        >
          <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{onBreak ? "On break" : "Break"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          aria-pressed={onCall}
          aria-label={onCall ? "End on-call" : "Start on-call"}
          aria-haspopup="dialog"
          onClick={openCallConfirm}
          className={cn(
            "h-8 gap-1.5 px-2.5 text-xs font-medium text-violet-100",
            "hover:bg-white/10 hover:text-white",
            onCall && "bg-white/15 ring-1 ring-white/30 text-white"
          )}
        >
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{onCall ? "In call" : "On call"}</span>
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[360px] gap-3 p-5">
          {copy && pending && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-lg font-semibold leading-snug">
                  {copy.title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {copy.description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={isLoading}
                  onClick={() => void handleConfirm()}
                >
                  {copy.confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
