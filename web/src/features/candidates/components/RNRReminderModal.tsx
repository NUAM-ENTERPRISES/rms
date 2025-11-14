import { useState } from "react";
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
import { AlertTriangle, Phone, Eye, X, Clock } from "lucide-react";
import type { RNRReminder } from "@/services/rnrRemindersApi";

interface RNRReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: RNRReminder | null;
}

export function RNRReminderModal({
  isOpen,
  onClose,
  reminder,
}: RNRReminderModalProps) {
  const navigate = useNavigate();
  const [isCallHandled, setIsCallHandled] = useState(false);

  if (!reminder || !reminder.candidate) {
    return null;
  }

  const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;
  const phoneNumber = `${reminder.candidate.countryCode} ${reminder.candidate.mobileNumber}`;

  // Format time since status was updated
  const getTimeSinceUpdate = () => {
    const statusDate = new Date(reminder.statusHistory.statusUpdatedAt);
    const now = new Date();
    const diffMs = now.getTime() - statusDate.getTime();
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

  const handleCallNow = () => {
    // Open phone dialer
    window.location.href = `tel:${reminder.candidate.countryCode}${reminder.candidate.mobileNumber}`;
    setIsCallHandled(true);
  };

  const handleViewProfile = () => {
    navigate(`/candidates/${reminder.candidateId}`);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                Follow-up Required
              </DialogTitle>
              <DialogDescription className="text-slate-600 mt-1">
                Ring Not Response - Candidate needs attention
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Candidate Info Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Candidate Name
                </label>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {candidateName}
                </p>
              </div>
              
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Reminder
                </label>
                <div className="mt-1">
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 shadow-md">
                    #{reminder.reminderCount} of 6
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 font-semibold">
                RNR Status
              </Badge>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {getTimeSinceUpdate()}
              </span>
            </div>
          </div>

          {/* Phone Number Card */}
          <div className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              Contact Number
            </label>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-lg font-bold text-slate-900">
                {phoneNumber}
              </p>
            </div>
          </div>

          {reminder.statusHistory.reason && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <label className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2 block">
                Previous Note
              </label>
              <p className="text-sm text-slate-700 italic">
                "{reminder.statusHistory.reason}"
              </p>
            </div>
          )}

          {/* Call Status Message */}
          {isCallHandled && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <span className="text-xl">📞</span>
                After your call, please update the candidate's status accordingly
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-300">
            <p className="text-sm text-slate-700 leading-relaxed">
              💡 <span className="font-semibold">Action Required:</span> This candidate hasn't responded to your previous call. 
              Please try calling again or update their status if they are no longer interested.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 h-11 border-2 hover:bg-slate-50"
          >
            <X className="h-4 w-4 mr-2" />
            Dismiss
          </Button>
          <Button
            variant="outline"
            onClick={handleViewProfile}
            className="flex-1 h-11 border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          <Button
            onClick={handleCallNow}
            className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg text-white font-semibold"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
