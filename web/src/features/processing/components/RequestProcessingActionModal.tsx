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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, PauseCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { FlagIcon } from "@/shared";
import { cn } from "@/lib/utils";

export type ProcessingActionType = "cancel" | "hold";

export interface ProcessingActionConfirmPayload {
  reason: string;
  applyCountryRestriction?: boolean;
  restrictCountryCode?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actionType: ProcessingActionType;
  onConfirm: (payload: ProcessingActionConfirmPayload) => Promise<void>;
  isSubmitting?: boolean;
  isDirectAction?: boolean;
  stepKey?: string;
  projectCountry?: { code: string; name: string };
}

export default function RequestProcessingActionModal({
  isOpen,
  onClose,
  actionType,
  onConfirm,
  isSubmitting,
  isDirectAction,
  stepKey,
  projectCountry,
}: Props) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [applyCountryRestriction, setApplyCountryRestriction] = useState(false);

  const isCancel = actionType === "cancel";
  const canConfirm = reason.trim().length >= 10 && !isSubmitting;
  const showCountryRestrictionOption =
    isCancel && stepKey === "data_flow" && Boolean(projectCountry?.code);

  const handleConfirm = async () => {
    setTouched(true);
    if (!canConfirm) return;
    await onConfirm({
      reason: reason.trim(),
      applyCountryRestriction: showCountryRestrictionOption
        ? applyCountryRestriction
        : undefined,
      restrictCountryCode:
        showCountryRestrictionOption &&
        applyCountryRestriction &&
        projectCountry?.code
          ? projectCountry.code
          : undefined,
    });
    setReason("");
    setTouched(false);
    setApplyCountryRestriction(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setApplyCountryRestriction(false);
    }
  };

  const title = isDirectAction
    ? isCancel
      ? "Cancel Processing"
      : "Hold Processing"
    : isCancel
      ? "Request Processing Cancellation"
      : "Request Processing Hold";

  const description = isDirectAction
    ? isCancel
      ? "Provide a reason for cancelling this processing. This will take effect immediately."
      : "Provide a reason for putting this processing on hold. This will take effect immediately."
    : isCancel
      ? "Submit a cancellation request for manager approval. A reason is required."
      : "Submit a hold request for manager approval. A reason is required.";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            {isCancel ? (
              <XCircle className="h-5 w-5 text-rose-600" />
            ) : (
              <PauseCircle className="h-5 w-5 text-orange-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              onBlur={() => setTouched(true)}
              placeholder="Explain why (minimum 10 characters, required)"
              className="mt-2"
            />
            {touched && reason.trim().length < 10 && (
              <div className="text-rose-600 text-xs mt-2">
                Reason is required (minimum 10 characters)
              </div>
            )}
          </div>

          {showCountryRestrictionOption && projectCountry && (
            <div
              className={cn(
                "rounded-lg border transition-colors",
                applyCountryRestriction
                  ? "border-amber-300 bg-amber-50/80 shadow-sm"
                  : "border-amber-200/80 bg-amber-50/40",
              )}
            >
              <label
                htmlFor="apply-country-restriction"
                className="flex cursor-pointer items-start gap-3 p-4"
              >
                <Checkbox
                  id="apply-country-restriction"
                  checked={applyCountryRestriction}
                  onCheckedChange={(checked) =>
                    setApplyCountryRestriction(checked === true)
                  }
                  className="mt-1 shrink-0"
                  aria-label={`Request country restriction for ${projectCountry.name}`}
                  aria-describedby="country-restriction-help"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert
                        className="h-4 w-4 shrink-0 text-amber-700"
                        aria-hidden
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        Request country restriction
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Block this candidate from all future projects in the
                      destination country below.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-amber-200/90 bg-white px-3 py-2.5 shadow-sm">
                    <FlagIcon
                      countryCode={projectCountry.code}
                      size="lg"
                      className="shrink-0 rounded shadow-sm"
                      aria-label={`Flag of ${projectCountry.name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-slate-900 break-words">
                        {projectCountry.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {projectCountry.code.toUpperCase()} · Project destination
                      </p>
                    </div>
                  </div>

                  <p
                    id="country-restriction-help"
                    className="text-xs leading-relaxed text-slate-600"
                  >
                    {isDirectAction ? (
                      <>
                        The restriction applies{" "}
                        <span className="font-medium text-slate-800">
                          immediately
                        </span>{" "}
                        when you cancel processing.
                      </>
                    ) : (
                      <>
                        If approved, the manager will restrict this candidate
                        from all future projects in{" "}
                        <span className="font-medium text-slate-800">
                          {projectCountry.name}
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={
              isCancel
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            {isDirectAction
              ? isCancel
                ? "Cancel Processing"
                : "Hold Processing"
              : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
