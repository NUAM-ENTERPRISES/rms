import { useEffect, useState } from "react";
import { Clock, History, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetOperationsCallHistoryQuery } from "@/services/candidatesApi";
import type { TransferToRecruiterPayload } from "@/components/molecules/TransferCandidateModal";
import {
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
  getOperationsFollowUpStageLabel,
  type OperationsFollowUpStage,
} from "@/features/candidates/utils/operations-follow-up.util";
import {
  OPERATIONS_CALL_OUTCOME,
  OPERATIONS_CALL_OUTCOME_OPTIONS,
  type OperationsCallOutcome,
} from "@/features/candidates/constants/operations-call-outcome";
import { OperationsCallReassignPanel } from "./OperationsCallReassignPanel";
import { OperationsCallJunkPanel } from "./OperationsCallJunkPanel";

export type LogOperationsCallPayload = {
  note: string;
  usedPhone: boolean;
  usedWhatsapp: boolean;
};

type ModalStep = "call" | "reassign" | "junk";

export type LogOperationsCallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  candidateId?: string;
  candidateName: string;
  callAttempts: number;
  nextAttempt: number;
  followUpStage?: OperationsFollowUpStage;
  canLog: boolean;
  isSubmitting?: boolean;
  isSubmittingReassign?: boolean;
  isSubmittingJunk?: boolean;
  currentRecruiterName?: string;
  currentStatus?: string;
  /** No answer — existing follow-up logging */
  onConfirm: (payload: LogOperationsCallPayload) => void | Promise<void>;
  /** Interested — reassign after call details */
  onReassign?: (
    callPayload: LogOperationsCallPayload,
    transferPayload: TransferToRecruiterPayload,
  ) => void | Promise<void>;
  /** Not interested — mark junk after call details */
  onMarkNotInterested?: (payload: LogOperationsCallPayload) => void | Promise<void>;
};

function formatLoggedAt(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PhoneContactBadge({
  selected = false,
  className,
}: {
  selected?: boolean;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700",
        selected && "ring-2 ring-blue-300 ring-offset-1",
        className,
      )}
    >
      <Phone className="h-3 w-3" aria-hidden />
      Phone
    </Badge>
  );
}

function WhatsAppContactBadge({
  selected = false,
  className,
}: {
  selected?: boolean;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "rounded-full border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700",
        selected && "ring-2 ring-green-300 ring-offset-1",
        className,
      )}
    >
      <FaWhatsapp className="h-3 w-3" aria-hidden />
      WhatsApp
    </Badge>
  );
}

function ContactMethodBadges({
  usedPhone,
  usedWhatsapp,
}: {
  usedPhone: boolean;
  usedWhatsapp: boolean;
}) {
  if (!usedPhone && !usedWhatsapp) {
    return <span className="text-[10px] text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {usedPhone && <PhoneContactBadge />}
      {usedWhatsapp && <WhatsAppContactBadge />}
    </div>
  );
}

export function LogOperationsCallModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  callAttempts,
  nextAttempt,
  followUpStage = OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
  canLog,
  isSubmitting = false,
  isSubmittingReassign = false,
  isSubmittingJunk = false,
  currentRecruiterName = "Unassigned",
  currentStatus = "Unknown",
  onConfirm,
  onReassign,
  onMarkNotInterested,
}: LogOperationsCallModalProps) {
  const [step, setStep] = useState<ModalStep>("call");
  const [outcome, setOutcome] = useState<OperationsCallOutcome>(
    OPERATIONS_CALL_OUTCOME.NO_RESPONDED,
  );
  const [note, setNote] = useState("");
  const [usedPhone, setUsedPhone] = useState(false);
  const [usedWhatsapp, setUsedWhatsapp] = useState(false);

  const { data: historyResponse, isLoading: isHistoryLoading } =
    useGetOperationsCallHistoryQuery(candidateId ?? "", {
      skip: !isOpen || !candidateId,
    });

  const history = historyResponse?.data ?? [];

  useEffect(() => {
    if (!isOpen) {
      setStep("call");
      setOutcome(OPERATIONS_CALL_OUTCOME.NO_RESPONDED);
      setNote("");
      setUsedPhone(false);
      setUsedWhatsapp(false);
    }
  }, [isOpen, candidateId]);

  const buildCallPayload = (): LogOperationsCallPayload => ({
    note: note.trim(),
    usedPhone,
    usedWhatsapp,
  });

  const noteTooShort = note.trim().length < 3;
  const noContactMethod = !usedPhone && !usedWhatsapp;
  const callFormInvalid = noteTooShort || noContactMethod;
  const stageLabel = getOperationsFollowUpStageLabel(followUpStage);

  const supportsInterested = !!onReassign;
  const supportsNotInterested = !!onMarkNotInterested;

  const availableOutcomes = OPERATIONS_CALL_OUTCOME_OPTIONS.filter((option) => {
    if (option.value === OPERATIONS_CALL_OUTCOME.INTERESTED) {
      return supportsInterested;
    }
    if (option.value === OPERATIONS_CALL_OUTCOME.NOT_INTERESTED) {
      return supportsNotInterested;
    }
    return true;
  });

  const title =
    step === "reassign"
      ? "Reassign candidate"
      : step === "junk"
        ? "Mark as junk"
        : canLog
          ? "Log operations call"
          : "Call history";

  const description =
    step === "reassign"
      ? `Complete reassign for ${candidateName} after interested response.`
      : step === "junk"
        ? `Confirm junk for ${candidateName} after not interested response.`
        : canLog
          ? followUpStage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL
            ? `Log call ${nextAttempt} of ${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} for ${candidateName} (${stageLabel}). Select call outcome and contact method.`
            : followUpStage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO &&
                outcome === OPERATIONS_CALL_OUTCOME.NO_RESPONDED
              ? `Log a no-answer call for ${candidateName} (${stageLabel}). This will mark the candidate as junk.`
              : `Log call for ${candidateName} (${stageLabel}). Select outcome, contact method, and add a note.`
          : `Previous call attempts for ${candidateName}.`;

  const handlePrimaryAction = () => {
    if (outcome === OPERATIONS_CALL_OUTCOME.NO_RESPONDED) {
      void onConfirm(buildCallPayload());
      return;
    }
    if (outcome === OPERATIONS_CALL_OUTCOME.INTERESTED) {
      setStep("reassign");
      return;
    }
    if (outcome === OPERATIONS_CALL_OUTCOME.NOT_INTERESTED) {
      setStep("junk");
    }
  };

  const handleReassignConfirm = async (transferPayload: TransferToRecruiterPayload) => {
    if (!onReassign) return;
    await onReassign(buildCallPayload(), transferPayload);
  };

  const handleJunkConfirm = async () => {
    if (!onMarkNotInterested) return;
    await onMarkNotInterested(buildCallPayload());
  };

  const isBusy = isSubmitting || isSubmittingReassign || isSubmittingJunk;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              {canLog && step === "call" ? (
                <Phone className="h-5 w-5 text-green-600" />
              ) : (
                <History className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "reassign" ? (
          <OperationsCallReassignPanel
            candidateName={candidateName}
            currentRecruiterName={currentRecruiterName}
            currentStatus={currentStatus}
            isSubmitting={isSubmittingReassign}
            onBack={() => setStep("call")}
            onConfirm={handleReassignConfirm}
          />
        ) : step === "junk" ? (
          <OperationsCallJunkPanel
            candidateName={candidateName}
            isSubmitting={isSubmittingJunk}
            onBack={() => setStep("call")}
            onConfirm={handleJunkConfirm}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Calls logged
                </p>
                <p className="text-sm font-bold tabular-nums text-slate-800">
                  {followUpStage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL
                    ? `${Math.min(callAttempts, OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE)}/${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE}`
                    : callAttempts}
                </p>
              </div>
            </div>

            {canLog && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="operations-call-outcome">Call outcome</Label>
                  <Select
                    value={outcome}
                    onValueChange={(value) =>
                      setOutcome(value as OperationsCallOutcome)
                    }
                  >
                    <SelectTrigger id="operations-call-outcome">
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOutcomes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {
                      availableOutcomes.find((option) => option.value === outcome)
                        ?.description
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Contact method used</Label>
                  <p className="text-xs text-slate-500">
                    Select one or both — how you tried to reach the candidate.
                  </p>
                  <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <label
                      htmlFor="operations-call-used-phone"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        id="operations-call-used-phone"
                        checked={usedPhone}
                        onCheckedChange={(checked) => setUsedPhone(checked === true)}
                        className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <PhoneContactBadge selected={usedPhone} />
                    </label>
                    <label
                      htmlFor="operations-call-used-whatsapp"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        id="operations-call-used-whatsapp"
                        checked={usedWhatsapp}
                        onCheckedChange={(checked) => setUsedWhatsapp(checked === true)}
                        className="border-green-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <WhatsAppContactBadge selected={usedWhatsapp} />
                    </label>
                  </div>
                  {noContactMethod && (
                    <p className="text-xs text-amber-600">
                      Select at least Phone or WhatsApp.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operations-call-note">Call note</Label>
                  <Textarea
                    id="operations-call-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Candidate answered and is interested in the role."
                    rows={4}
                    maxLength={500}
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Minimum 3 characters. {note.trim().length}/500
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Call history
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                {isHistoryLoading ? (
                  <p className="px-2 py-3 text-sm text-slate-500">Loading history…</p>
                ) : history.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">No calls logged yet.</p>
                ) : (
                  history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700">
                          Call {entry.attemptNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatLoggedAt(entry.loggedAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-medium text-slate-500">Via</span>
                        <ContactMethodBadges
                          usedPhone={entry.usedPhone ?? false}
                          usedWhatsapp={entry.usedWhatsapp ?? false}
                        />
                      </div>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                        {entry.note}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        By {entry.loggedBy.name}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {step === "call" && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
              {canLog ? "Cancel" : "Close"}
            </Button>
            {canLog && (
              <Button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isBusy || callFormInvalid}
                className={
                  outcome === OPERATIONS_CALL_OUTCOME.NO_RESPONDED
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }
              >
                {isSubmitting
                  ? "Logging…"
                  : outcome === OPERATIONS_CALL_OUTCOME.NO_RESPONDED
                    ? "Log Call"
                    : "Next"}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
