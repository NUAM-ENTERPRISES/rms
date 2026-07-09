import { useEffect, useState, type ComponentType } from "react";
import {
  Clock,
  History,
  Inbox,
  Loader2,
  Phone,
  PhoneMissed,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  getOperationsCallOutcomeBadgeClass,
  getOperationsCallOutcomeLabel,
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
  /** When false, only interested / not-interested outcomes are available (e.g. initial 3/3 wait). */
  canLogNoAnswer?: boolean;
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

const OUTCOME_ICONS: Record<
  OperationsCallOutcome,
  ComponentType<{ className?: string }>
> = {
  [OPERATIONS_CALL_OUTCOME.INTERESTED]: ThumbsUp,
  [OPERATIONS_CALL_OUTCOME.NOT_INTERESTED]: ThumbsDown,
  [OPERATIONS_CALL_OUTCOME.NO_RESPONDED]: PhoneMissed,
};

const OUTCOME_ACCENT: Record<OperationsCallOutcome, string> = {
  [OPERATIONS_CALL_OUTCOME.INTERESTED]:
    "border-emerald-500 bg-emerald-50 ring-emerald-100 text-emerald-800",
  [OPERATIONS_CALL_OUTCOME.NOT_INTERESTED]:
    "border-red-500 bg-red-50 ring-red-100 text-red-800",
  [OPERATIONS_CALL_OUTCOME.NO_RESPONDED]:
    "border-amber-500 bg-amber-50 ring-amber-100 text-amber-800",
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

function formatCallCount(
  callAttempts: number,
  followUpStage: OperationsFollowUpStage,
): string {
  if (followUpStage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL) {
    return `${Math.min(callAttempts, OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE)}/${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE}`;
  }
  return String(callAttempts);
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
      {usedPhone && (
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
        >
          <Phone className="h-2.5 w-2.5" aria-hidden />
          Phone
        </Badge>
      )}
      {usedWhatsapp && (
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700"
        >
          <FaWhatsapp className="h-2.5 w-2.5" aria-hidden />
          WhatsApp
        </Badge>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm"
        >
          <div className="mb-2 h-3 w-1/4 rounded bg-slate-200" />
          <div className="mb-1.5 h-2.5 w-full rounded bg-slate-100" />
          <div className="h-2.5 w-2/3 rounded bg-slate-100" />
        </div>
      ))}
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
  canLogNoAnswer = true,
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
      return;
    }

    if (!canLogNoAnswer) {
      setOutcome(OPERATIONS_CALL_OUTCOME.INTERESTED);
    }
  }, [isOpen, candidateId, canLogNoAnswer]);

  const buildCallPayload = (): LogOperationsCallPayload => ({
    note: note.trim(),
    usedPhone,
    usedWhatsapp,
  });

  const noteTooShort = note.trim().length < 3;
  const noContactMethod = !usedPhone && !usedWhatsapp;
  const callFormInvalid = noteTooShort || noContactMethod;
  const stageLabel = getOperationsFollowUpStageLabel(followUpStage);
  const callCountLabel = formatCallCount(callAttempts, followUpStage);

  const supportsInterested = !!onReassign;
  const supportsNotInterested = !!onMarkNotInterested;

  const availableOutcomes = OPERATIONS_CALL_OUTCOME_OPTIONS.filter((option) => {
    if (option.value === OPERATIONS_CALL_OUTCOME.NO_RESPONDED) {
      return canLogNoAnswer;
    }
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
          ? followUpStage === OPERATIONS_FOLLOW_UP_STAGE.JUNK
            ? `Junk candidate called back — record outcome and contact method.`
            : followUpStage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL
              ? `Log call ${nextAttempt} of ${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} · ${stageLabel} stage`
              : followUpStage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO &&
                  outcome === OPERATIONS_CALL_OUTCOME.NO_RESPONDED
                ? `No-answer on ${stageLabel} will mark candidate as junk.`
                : `Record outcome, contact method, and notes for ${stageLabel}.`
          : `All logged call attempts for this candidate.`;

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
      if (
        followUpStage === OPERATIONS_FOLLOW_UP_STAGE.JUNK &&
        onMarkNotInterested
      ) {
        void onMarkNotInterested(buildCallPayload());
        return;
      }
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
  const isHistoryOnly = !canLog && step === "call";
  const isCallStep = step === "call";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,44rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-slate-200/90 bg-slate-100 p-0 shadow-2xl",
          isHistoryOnly ? "sm:max-w-4xl" : "sm:max-w-2xl",
        )}
      >
        <DialogHeader
          className={cn(
            "shrink-0 space-y-0 border-b px-6 pb-4 pt-6",
            isHistoryOnly
              ? "border-indigo-100/80 bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50/70"
              : "border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60",
          )}
        >
          <div className="flex items-start gap-3.5 pr-6">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-2 ring-white/80",
                isHistoryOnly
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600"
                  : "bg-gradient-to-br from-emerald-600 to-teal-600",
              )}
            >
              {canLog && isCallStep ? (
                <Phone className="h-5 w-5" aria-hidden />
              ) : (
                <History className="h-5 w-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-slate-600">
                {description}
              </DialogDescription>
            </div>
          </div>

          {isCallStep && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                <User className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <span className="max-w-[12rem] truncate font-semibold text-slate-900">
                  {candidateName}
                </span>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700"
              >
                {stageLabel}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700"
              >
                {callCountLabel} calls logged
              </Badge>
            </div>
          )}
        </DialogHeader>

        {step === "reassign" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5">
            <OperationsCallReassignPanel
              candidateName={candidateName}
              currentRecruiterName={currentRecruiterName}
              currentStatus={currentStatus}
              isSubmitting={isSubmittingReassign}
              onBack={() => setStep("call")}
              onConfirm={handleReassignConfirm}
            />
          </div>
        ) : step === "junk" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5">
            <OperationsCallJunkPanel
              candidateName={candidateName}
              isSubmitting={isSubmittingJunk}
              onBack={() => setStep("call")}
              onConfirm={handleJunkConfirm}
            />
          </div>
        ) : (
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5",
              "bg-gradient-to-b from-slate-50 via-white to-slate-50/80",
              isHistoryOnly && "flex flex-col",
            )}
          >
            {canLog && (
              <div className="space-y-5">
                <section className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Call outcome
                  </Label>
                  <div
                    className={cn(
                      "grid gap-2",
                      availableOutcomes.length === 1
                        ? "grid-cols-1"
                        : availableOutcomes.length === 2
                          ? "grid-cols-1 sm:grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-3",
                    )}
                  >
                    {availableOutcomes.map((option) => {
                      const Icon = OUTCOME_ICONS[option.value];
                      const isSelected = outcome === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setOutcome(option.value)}
                          aria-pressed={isSelected}
                          className={cn(
                            "rounded-xl border-2 p-3.5 text-left transition-all duration-200",
                            "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                            isSelected
                              ? cn("shadow-sm ring-2", OUTCOME_ACCENT[option.value])
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                isSelected
                                  ? "bg-white/80"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <Icon className="h-4 w-4" aria-hidden />
                            </div>
                            <span className="text-sm font-semibold">{option.label}</span>
                          </div>
                          <p className="mt-1.5 pl-10 text-xs leading-snug text-slate-500">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contact method
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={usedPhone}
                      onClick={() => setUsedPhone((value) => !value)}
                      className={cn(
                        "flex items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3.5 transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2",
                        usedPhone
                          ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-100"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-sm font-semibold">Phone</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={usedWhatsapp}
                      onClick={() => setUsedWhatsapp((value) => !value)}
                      className={cn(
                        "flex items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3.5 transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2",
                        usedWhatsapp
                          ? "border-green-500 bg-green-50 text-green-800 shadow-sm ring-2 ring-green-100"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <FaWhatsapp className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-sm font-semibold">WhatsApp</span>
                    </button>
                  </div>
                  {noContactMethod && (
                    <p className="text-xs font-medium text-amber-600">
                      Select at least one contact method.
                    </p>
                  )}
                </section>

                <section className="space-y-2.5">
                  <Label htmlFor="operations-call-note" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Call note
                  </Label>
                  <Textarea
                    id="operations-call-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Candidate answered and is interested in the role."
                    rows={3}
                    maxLength={500}
                    className="min-h-[5.5rem] resize-none rounded-xl border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-emerald-500/30"
                  />
                  <p className="text-xs text-slate-500">
                    Minimum 3 characters ·{" "}
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        noteTooShort ? "text-amber-600" : "text-slate-700",
                      )}
                    >
                      {note.trim().length}/500
                    </span>
                  </p>
                </section>
              </div>
            )}

            {isHistoryOnly && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Candidate
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {candidateName}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Follow-up stage
                  </p>
                  <p className="mt-1 text-sm font-semibold text-violet-700">{stageLabel}</p>
                </div>
                <div className="col-span-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 shadow-sm sm:col-span-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
                    Calls logged
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
                    {callCountLabel}
                  </p>
                </div>
              </div>
            )}

            <section
              className={cn(
                "space-y-3",
                canLog && "mt-6 border-t border-slate-200/80 pt-5",
                isHistoryOnly && "flex min-h-0 flex-1 flex-col",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Call history
                </h3>
                {!isHistoryLoading && history.length > 0 && (
                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                    {history.length} {history.length === 1 ? "entry" : "entries"}
                  </span>
                )}
              </div>

              <div
                className={cn(
                  "overflow-y-auto rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-inner",
                  isHistoryOnly
                    ? "min-h-[18rem] max-h-[28rem] flex-1"
                    : "max-h-52",
                )}
              >
                {isHistoryLoading ? (
                  <HistorySkeleton />
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-emerald-100 text-emerald-500 shadow-sm">
                      <Inbox className="h-5 w-5" aria-hidden />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No calls logged yet</p>
                    <p className="max-w-xs text-center text-xs text-slate-500">
                      Logged calls will appear here with outcome, contact method, and notes.
                    </p>
                  </div>
                ) : (
                  <div className="relative space-y-0 pl-1">
                    {history.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={cn("relative flex gap-3 pb-4", index === history.length - 1 && "pb-0")}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow-sm ring-2",
                              index === 0
                                ? "bg-emerald-500 text-white ring-emerald-100"
                                : "bg-slate-200 text-slate-600 ring-slate-100",
                            )}
                          >
                            {entry.attemptNumber}
                          </div>
                          {index < history.length - 1 && (
                            <div className="mt-1 w-px flex-1 bg-slate-200" aria-hidden />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-800">
                                Call {entry.attemptNumber}
                              </span>
                              {entry.callOutcome && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-semibold uppercase",
                                    getOperationsCallOutcomeBadgeClass(entry.callOutcome),
                                  )}
                                >
                                  {getOperationsCallOutcomeLabel(entry.callOutcome)}
                                </Badge>
                              )}
                              <ContactMethodBadges
                                usedPhone={entry.usedPhone ?? false}
                                usedWhatsapp={entry.usedWhatsapp ?? false}
                              />
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              <Clock className="h-3 w-3" aria-hidden />
                              {formatLoggedAt(entry.loggedAt)}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "mt-2 text-sm leading-relaxed text-slate-700",
                              !isHistoryOnly && "line-clamp-2",
                            )}
                          >
                            {entry.note}
                          </p>
                          <p className="mt-2 text-[11px] text-slate-400">
                            Logged by{" "}
                            <span className="font-medium text-slate-600">
                              {entry.loggedBy.name}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {isCallStep && (
          <DialogFooter className="shrink-0 gap-2 border-t border-slate-200/80 bg-slate-50/90 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
              className="border-slate-200 bg-white"
            >
              {canLog ? "Cancel" : "Close"}
            </Button>
            {canLog && (
              <Button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isBusy || callFormInvalid}
                className={cn(
                  "min-w-[7rem] shadow-sm",
                  outcome === OPERATIONS_CALL_OUTCOME.NO_RESPONDED
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Logging…
                  </>
                ) : outcome === OPERATIONS_CALL_OUTCOME.NO_RESPONDED ? (
                  "Log Call"
                ) : (
                  "Next"
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
