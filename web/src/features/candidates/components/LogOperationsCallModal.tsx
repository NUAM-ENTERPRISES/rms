import { useEffect, useState } from "react";
import { Clock, History, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetOperationsCallHistoryQuery } from "@/services/candidatesApi";
import { OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE } from "@/features/candidates/utils/operations-follow-up.util";

export type LogOperationsCallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  candidateId?: string;
  candidateName: string;
  callAttempts: number;
  nextAttempt: number;
  canLog: boolean;
  isSubmitting?: boolean;
  onConfirm: (note: string) => void | Promise<void>;
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

export function LogOperationsCallModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  callAttempts,
  nextAttempt,
  canLog,
  isSubmitting = false,
  onConfirm,
}: LogOperationsCallModalProps) {
  const [note, setNote] = useState("");

  const { data: historyResponse, isLoading: isHistoryLoading } =
    useGetOperationsCallHistoryQuery(candidateId ?? "", {
      skip: !isOpen || !candidateId,
    });

  const history = historyResponse?.data ?? [];

  useEffect(() => {
    if (!isOpen) {
      setNote("");
    }
  }, [isOpen, candidateId]);

  const handleConfirm = () => {
    void onConfirm(note.trim());
  };

  const noteTooShort = note.trim().length < 3;
  const title = canLog ? "Log call (no answer)" : "Call history";
  const description = canLog
    ? `Log call ${nextAttempt} of ${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} for ${candidateName}. Add a note about the attempt.`
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
                {callAttempts}/{OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE}
              </p>
            </div>
          </div>

          {canLog && (
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
              disabled={isSubmitting || noteTooShort}
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
