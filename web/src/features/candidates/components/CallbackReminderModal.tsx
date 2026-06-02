import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Eye, X, Phone } from "lucide-react";

interface CallbackReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: any;
}

export function CallbackReminderModal({
  isOpen,
  onClose,
  notification,
}: CallbackReminderModalProps) {
  const navigate = useNavigate();
  if (!notification) return null;

  const candidateName = notification.meta?.candidateName || "Candidate";
  const callbackDateTime = notification.meta?.callbackDateTime
    ? new Date(notification.meta.callbackDateTime)
    : null;

  const formattedDate = callbackDateTime
    ? callbackDateTime.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Scheduled soon";

  const handleViewProfile = () => {
    if (notification.meta?.candidateId) {
      navigate(`/candidates/${notification.meta.candidateId}`);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl border-0 shadow-2xl">
        <DialogHeader className="space-y-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                Callback Reminder
              </DialogTitle>
              <p className="text-sm text-slate-600">
                Schedule a follow-up call for the candidate.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">
                  Candidate
                </p>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  {candidateName}
                </p>
              </div>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-semibold">
                Call Back
              </Badge>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500 font-semibold">
                  Callback Time
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Reminder:</span> This candidate has a scheduled call back. Please follow up at the scheduled time and update their status after the call.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11"
          >
            <X className="h-4 w-4 mr-2" />
            Dismiss
          </Button>
          <Button
            onClick={handleViewProfile}
            className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
