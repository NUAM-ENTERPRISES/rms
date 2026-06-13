import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User, Briefcase, Clock, CalendarClock, Bell, Eye, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { ProcessingReminder } from "@/services/processingRemindersApi";


interface ProcessingFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: ProcessingReminder | null;
  onPrev: () => void;
  onNext: () => void;
  currentPosition: number;
  total: number;
  isFetching?: boolean;
}

const STEP_LABELS: Record<string, string> = {
  hrd: "HRD",
  data_flow: "Data Flow",
  visa: "Visa",
  offer_letter: "Offer Letter",
  medical: "Medical",
  medical_fitness: "Medical (Fitness)",
  biometric: "Biometric",
  biometrics: "Biometrics",
  prometric: "Prometric",
  emigration: "Emigration",
  document_received: "Document Original Received",
  council_registration: "Council Registration",
};

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ProcessingFollowupModal({
  isOpen,
  onClose,
  reminder,
  onPrev,
  onNext,
  currentPosition,
  total,
  isFetching,
}: ProcessingFollowupModalProps) {
  const navigate = useNavigate();

  if (!reminder) return null;

  const candidateName = reminder.candidateName || "Candidate";
  const projectName = reminder.projectName || "Project";
  const stepKey = reminder.stepKey?.toLowerCase() || "";
  const stepLabel = STEP_LABELS[stepKey] || reminder.stepKey?.toUpperCase().replace(/_/g, " ") || "Step";
  const templateName = reminder.templateName;

  const submittedAtFormatted = formatDate(reminder.submittedAt ?? reminder.sentAt ?? reminder.createdAt);
  const sentAtFormatted = formatDate(reminder.sentAt ?? reminder.createdAt);
  const count = reminder.reminderCount ?? 1;

  const urgencyColor =
    count >= 3 ? "from-red-500 to-rose-600" :
    count === 2 ? "from-orange-500 to-amber-500" :
                  "from-yellow-400 to-orange-500";

  const handleViewProcessing = () => {
    navigate(reminder.route);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${urgencyColor} px-6 py-5 text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Processing Reminder</p>
                <h2 className="text-lg font-bold leading-tight">{stepLabel} Follow-up Required</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {count > 1 && (
                <Badge className="bg-white/25 text-white border-0 text-xs font-bold">
                  #{count}
                </Badge>
              )}
              {/* Pagination counter */}
              {total > 1 && (
                <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
                  <button
                    onClick={onPrev}
                    disabled={currentPosition <= 1 || isFetching}
                    className="text-white/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity p-0.5"
                    aria-label="Previous reminder"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-bold text-white min-w-[36px] text-center">
                    {isFetching ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : `${currentPosition}/${total}`}
                  </span>
                  <button
                    onClick={onNext}
                    disabled={currentPosition >= total || isFetching}
                    className="text-white/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity p-0.5"
                    aria-label="Next reminder"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Candidate & Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Candidate</p>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-tight">{candidateName}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Project</p>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-tight truncate" title={projectName}>{projectName}</p>
            </div>
          </div>

          {/* Step & Template */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Current Step</p>
              <p className="text-sm font-bold text-slate-800">
                {stepLabel}
                {templateName && <span className="font-normal text-slate-500"> — {templateName}</span>}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2.5">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-start gap-3">
              <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-0.5">
                  Submitted to Agency
                </p>
                <p className="text-xs text-blue-800 leading-snug">
                  You submitted this to the agency on{" "}
                  <span className="font-bold">{submittedAtFormatted}</span>
                </p>
              </div>
            </div>
            <div className={`rounded-xl p-3 border flex items-start gap-3 ${
              count >= 3 ? "bg-red-50 border-red-100" :
              count === 2 ? "bg-orange-50 border-orange-100" :
              "bg-amber-50 border-amber-100"
            }`}>
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                count >= 3 ? "bg-red-100" : count === 2 ? "bg-orange-100" : "bg-amber-100"
              }`}>
                <Bell className={`h-3.5 w-3.5 ${
                  count >= 3 ? "text-red-500" : count === 2 ? "text-orange-500" : "text-amber-500"
                }`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-0.5">Reminder Sent</p>
                <p className="text-xs text-amber-800 leading-snug">{sentAtFormatted}</p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This step requires your attention. Please review and take action.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 pb-5 pt-0 gap-2 sm:gap-2">
          {total > 1 && (
            <div className="flex items-center gap-1 mr-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPrev}
                disabled={currentPosition <= 1 || isFetching}
                className="h-8 w-8 p-0 border-slate-200"
                aria-label="Previous reminder"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={currentPosition >= total || isFetching}
                className="h-8 w-8 p-0 border-slate-200"
                aria-label="Next reminder"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 font-semibold text-slate-500 border-slate-200 hover:bg-slate-50"
          >
            Later
          </Button>
          <Button
            type="button"
            onClick={handleViewProcessing}
            className="flex-1 font-bold gap-2 shadow-md"
          >
            <Eye className="h-4 w-4" />
            View Details
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
