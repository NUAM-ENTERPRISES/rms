import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DecisionType = "shortlisted" | "not_shortlisted" | null;

interface ClientDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onSubmit: (decision: DecisionType, reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ClientDecisionModal({
  open,
  onOpenChange,
  candidateName,
  onSubmit,
  isSubmitting = false,
}: ClientDecisionModalProps) {
  const [selectedDecision, setSelectedDecision] = useState<DecisionType>(null);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!selectedDecision) return;
    await onSubmit(selectedDecision, reason);
    // Reset state after successful submission
    setSelectedDecision(null);
    setReason("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedDecision(null);
      setReason("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Client Decision</DialogTitle>
          <DialogDescription>
            Select the client's decision for <span className="font-medium text-foreground">{candidateName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedDecision("shortlisted")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                selectedDecision === "shortlisted"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
              )}
            >
              <CheckCircle2 className={cn(
                "h-8 w-8",
                selectedDecision === "shortlisted" ? "text-green-600" : "text-gray-400"
              )} />
              <span className="font-semibold text-sm">Shortlisted</span>
              <span className="text-xs text-muted-foreground text-center">Client approved this candidate</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDecision("not_shortlisted")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                selectedDecision === "not_shortlisted"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-200 hover:border-red-300 hover:bg-red-50/50"
              )}
            >
              <XCircle className={cn(
                "h-8 w-8",
                selectedDecision === "not_shortlisted" ? "text-red-600" : "text-gray-400"
              )} />
              <span className="font-semibold text-sm">Not Shortlisted</span>
              <span className="text-xs text-muted-foreground text-center">Client rejected this candidate</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Reason / Notes {selectedDecision === "not_shortlisted" && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              placeholder={selectedDecision === "not_shortlisted" 
                ? "Please provide a reason for rejection..." 
                : "Optional notes about this decision..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDecision || isSubmitting || (selectedDecision === "not_shortlisted" && !reason.trim())}
            className={cn(
              selectedDecision === "shortlisted" && "bg-green-600 hover:bg-green-700",
              selectedDecision === "not_shortlisted" && "bg-red-600 hover:bg-red-700"
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirm Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
