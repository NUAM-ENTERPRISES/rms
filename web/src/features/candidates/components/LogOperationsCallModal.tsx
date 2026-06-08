import { useEffect, useState } from "react";
import { Clock, History, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
  getOperationsFollowUpStageLabel,
  type OperationsFollowUpStage,
} from "@/features/candidates/utils/operations-follow-up.util";

export type LogOperationsCallPayload = {
  note: string;
  usedPhone: boolean;
  usedWhatsapp: boolean;
};

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
  onConfirm: (payload: LogOperationsCallPayload) => void | Promise<void>;
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
  onConfirm,
}: LogOperationsCallModalProps) {
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
      setNote("");
      setUsedPhone(false);
      setUsedWhatsapp(false);
    }
  }, [isOpen, candidateId]);

  const handleConfirm = () => {
    void onConfirm({
      note: note.trim(),
      usedPhone,
      usedWhatsapp,
    });
  };

  const noteTooShort = note.trim().length < 3;
  const noContactMethod = !usedPhone && !usedWhatsapp;
  const stageLabel = getOperationsFollowUpStageLabel(followUpStage);
  const title = canLog ? "Log call (no answer)" : "Call history";
  const description = canLog
    ? followUpStage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL
      ? `Log call ${nextAttempt} of ${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} for ${candidateName} (${stageLabel}). After 3 calls they move to 1 Week automatically.`
      : followUpStage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO
      ? `Log a no-answer call for ${candidateName} (${stageLabel}). This will mark the candidate as junk.`
      : `Log call #${nextAttempt} for ${candidateName} (${stageLabel}). Select how you contacted the candidate and add a note.`
    : `Previous call attempts for ${candidateName}.`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              {canLog ? (
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
                  placeholder="e.g. Called twice, no answer. Will retry tomorrow."
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
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{entry.note}</p>
                    <p className="mt-1 text-[10px] text-slate-400">By {entry.loggedBy.name}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {canLog ? "Cancel" : "Close"}
          </Button>
          {canLog && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || noteTooShort || noContactMethod}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Logging…" : "Log Call"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
