import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type OperationsCallJunkPanelProps = {
  candidateName: string;
  isSubmitting?: boolean;
  onBack: () => void;
  onConfirm: () => void | Promise<void>;
};

export function OperationsCallJunkPanel({
  candidateName,
  isSubmitting = false,
  onBack,
  onConfirm,
}: OperationsCallJunkPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900">Mark as junk</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              <span className="font-medium">{candidateName}</span> is not
              interested. Your call note will be saved and the candidate will be
              moved to the junk list.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="button"
          className="flex-1 bg-amber-600 hover:bg-amber-700"
          disabled={isSubmitting}
          onClick={() => void onConfirm()}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Marking junk…
            </span>
          ) : (
            "Confirm Mark Junk"
          )}
        </Button>
      </div>
    </div>
  );
}
