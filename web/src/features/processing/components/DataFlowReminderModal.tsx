import { useNavigate } from "react-router-dom";
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
import { AlertTriangle, FileText, Eye, X, Clock, Package } from "lucide-react";
import type { DataFlowReminder } from "@/services/dataFlowRemindersApi";

interface DataFlowReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: DataFlowReminder | null;
}

export function DataFlowReminderModal({
  isOpen,
  onClose,
  reminder,
}: DataFlowReminderModalProps) {
  const navigate = useNavigate();

  if (!reminder || !reminder.processingStep) {
    return null;
  }

  const processing = reminder.processingStep.processing;
  const stepCandidate = reminder.processingStep.processingCandidate?.candidate;
  const candidate = stepCandidate || processing?.candidate;
  const candidateName = candidate
    ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
    : "Candidate";

  const stepProcessingCandidate = reminder.processingStep.processingCandidate;
  const project = stepProcessingCandidate?.project || processing?.project || reminder.processingCandidate?.project;
  const projectName = (project as any)?.title || (project as any)?.name || "Project";

  const processingId = reminder.processingStep.processingId || processing?.id || (reminder as any).processingId || reminder.processingStep.id;
  const processingCandidateId = reminder.processingStep.processingCandidate?.id || reminder.processingCandidate?.id || reminder.processingCandidate?.processingId;

  const candidateEmail = candidate?.email || "";
  const candidatePhone = candidate && candidate.countryCode && candidate.mobileNumber ? `${candidate.countryCode} ${candidate.mobileNumber}` : "";

  const submittedAtIso = reminder.processingStep.submittedAt || reminder.createdAt || null;
  const submittedAtFormatted = submittedAtIso
    ? new Date(submittedAtIso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  const getTimeSinceSubmission = () => {
    const submittedDate = submittedAtIso ? new Date(submittedAtIso) : new Date(reminder.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - submittedDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  const handleViewProcessing = () => {
    const targetId = processingCandidateId || processingId;
    navigate(`/processingCandidateDetails/${targetId}`);
    onClose();
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const getUrgencyColor = () => {
    if (reminder.daysCompleted >= 2) return "from-red-500 to-rose-500";
    if (reminder.daysCompleted >= 1) return "from-orange-500 to-amber-500";
    return "from-yellow-500 to-orange-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md w-full border-0 shadow-2xl">
        <DialogHeader className="space-y-2 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getUrgencyColor()} flex items-center justify-center shadow-md`}>
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Data Flow Reminder
                </DialogTitle>
                <DialogDescription className="text-slate-600 mt-1 text-sm">
                  Data Flow - Pending Action
                </DialogDescription>
              </div>
            </div>

            <button
              aria-label="Close reminder"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md hover:bg-slate-100 p-1"
            >
              <X className="h-4 w-4 text-slate-700" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-3">
          <div className="bg-gradient-to-br from-slate-50 to-purple-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Candidate Name
                </label>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {candidateName}
                </p>
                {candidateEmail && (
                  <p className="text-sm text-slate-600 mt-1">{candidateEmail}</p>
                )}
                {candidatePhone && (
                  <p className="text-sm text-slate-600">{candidatePhone}</p>
                )}
              </div>
              
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Reminder
                </label>
                <div className="mt-1">
                  <Badge className={`bg-gradient-to-r ${getUrgencyColor()} text-white text-sm px-3 py-1 shadow-md`}>
                    #{reminder.reminderCount} (Day {reminder.daysCompleted + 1})
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
              <Package className="h-4 w-4 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{projectName}</p>
                {reminder.processingStep.processingCandidate?.role?.roleCatalog?.label && (
                  <p className="text-sm text-slate-600 mt-1">Role: {reminder.processingStep.processingCandidate.role.roleCatalog.label}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border-2 border-amber-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-md font-bold text-slate-900">
                  {reminder.processingStep.status.replace(/_/g, ' ').toUpperCase()}
                </p>
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {submittedAtFormatted ? `Submitted ${submittedAtFormatted}` : `Created ${getTimeSinceSubmission()}`}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-3 border border-slate-300">
            <p className="text-sm text-slate-700 leading-relaxed">
              💡 <span className="font-semibold">Action Required:</span> Please review data flow items or update the status to avoid delays.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={handleViewProcessing}
            className="w-full sm:flex-1 h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg text-white font-semibold"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Processing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
