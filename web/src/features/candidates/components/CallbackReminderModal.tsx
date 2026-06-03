import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Eye, X, Clock, MessageSquare } from "lucide-react";
import { useGetCandidateStatusHistoryQuery } from "@/services/candidatesApi";
import type { CallbackReminder } from "@/services/callbackRemindersApi";

interface CallbackReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: CallbackReminder | null;
}

const normalizeStatusKey = (value?: string) =>
  (value ?? "").toLowerCase().trim().replace(/[\s_]+/g, " ");

const isCallBackStatusName = (value?: string) => {
  const key = normalizeStatusKey(value);
  return key === "call back" || key === "callback";
};

export function getCallbackReminderNote(
  reminder: CallbackReminder | null | undefined,
  historyEntries: Array<{
    id: string;
    statusNameSnapshot: string;
    reason?: string;
  }> = [],
): string | null {
  const fromReminder = reminder?.statusHistory?.reason?.trim();
  if (fromReminder) return fromReminder;

  if (reminder?.statusHistoryId && historyEntries.length > 0) {
    const linked = historyEntries.find((e) => e.id === reminder.statusHistoryId);
    const linkedReason = linked?.reason?.trim();
    if (linkedReason) return linkedReason;
  }

  const callBackWithNote = historyEntries.find(
    (e) => isCallBackStatusName(e.statusNameSnapshot) && e.reason?.trim(),
  );
  return callBackWithNote?.reason?.trim() ?? null;
}

export function CallbackReminderModal({
  isOpen,
  onClose,
  reminder,
}: CallbackReminderModalProps) {
  const navigate = useNavigate();
  const [isCallHandled, setIsCallHandled] = useState(false);

  const candidateId = reminder?.candidateId;
  const { data: statusHistoryResponse, isFetching: isNoteLoading } =
    useGetCandidateStatusHistoryQuery(
      isOpen && candidateId ? candidateId : skipToken,
    );

  const historyEntries = statusHistoryResponse?.data?.history ?? [];

  const recentNote = useMemo(
    () => getCallbackReminderNote(reminder, historyEntries),
    [reminder, historyEntries],
  );

  if (!reminder || !reminder.candidate) {
    return null;
  }

  const candidateName =
    [reminder.candidate.firstName, reminder.candidate.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Candidate";
  const phoneNumber =
    [reminder.candidate.countryCode, reminder.candidate.mobileNumber]
      .filter(Boolean)
      .join(" ")
      .trim() || "Contact not available";
  const telHref =
    reminder.candidate.countryCode && reminder.candidate.mobileNumber
      ? `tel:${reminder.candidate.countryCode}${reminder.candidate.mobileNumber}`
      : undefined;

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCallNow = () => {
    if (telHref) {
      window.location.href = telHref;
      setIsCallHandled(true);
    }
  };

  const handleViewProfile = () => {
    navigate(`/candidates/${reminder.candidateId}`);
    onClose();
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                Time to call back
              </DialogTitle>
              <DialogDescription className="mt-1 text-slate-600">
                Please call this candidate now
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Candidate
              </label>
              <p className="mt-1 text-xl font-bold text-slate-900">{candidateName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
              <Badge
                variant="outline"
                className="border-cyan-300 bg-cyan-50 font-semibold text-cyan-700"
              >
                Call Back
              </Badge>
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Scheduled: {formatDateTime(reminder.scheduledFor)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Contact number
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Phone className="h-5 w-5 text-green-600" aria-hidden />
              </div>
              <p className="text-lg font-bold text-slate-900">{phoneNumber}</p>
            </div>
          </div>

          <div
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
            aria-live="polite"
          >
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
              Recent note
            </label>
            {isNoteLoading && !recentNote ? (
              <p className="text-sm text-slate-500">Loading note…</p>
            ) : recentNote ? (
              <p className="text-sm italic leading-relaxed text-slate-700">
                &ldquo;{recentNote}&rdquo;
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                No note was added when this callback was scheduled.
              </p>
            )}
          </div>

          {isCallHandled && (
            <div className="rounded-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-blue-900">
                After your call, update the candidate status if needed.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 flex-1 border-2"
          >
            <X className="mr-2 h-4 w-4" aria-hidden />
            Dismiss
          </Button>
          <Button
            variant="outline"
            onClick={handleViewProfile}
            className="h-11 flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Eye className="mr-2 h-4 w-4" aria-hidden />
            View profile
          </Button>
          <Button
            onClick={handleCallNow}
            disabled={!telHref}
            className="h-11 flex-1 bg-gradient-to-r from-green-600 to-emerald-600 font-semibold text-white shadow-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
          >
            <Phone className="mr-2 h-4 w-4" aria-hidden />
            Call now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
