import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RNRReminder } from "@/services/rnrRemindersApi";

interface RNRReminderIndicatorProps {
  reminder: RNRReminder;
  onCall: () => void;
  onDismiss: () => void;
}

export function RNRReminderIndicator({
  reminder,
  onCall,
  onDismiss,
}: RNRReminderIndicatorProps) {
  const [open, setOpen] = useState(false);

  const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;
  const phoneNumber = `${reminder.candidate.countryCode} ${reminder.candidate.mobileNumber}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "h-16 w-16 rounded-full shadow-2xl",
              "bg-gradient-to-br from-orange-500 to-red-600",
              "hover:from-orange-600 hover:to-red-700",
              "animate-bounce hover:animate-none",
              "border-4 border-white",
              "relative overflow-hidden",
              "transition-all duration-300"
            )}
          >
            {/* Pulse animation ring */}
            <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-75" />
            
            {/* Icon */}
            <Bell className="h-8 w-8 text-white relative z-10 animate-wiggle" />
            
            {/* Badge counter */}
            <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 bg-red-600 text-white border-2 border-white flex items-center justify-center text-xs font-bold">
              {reminder.reminderCount}
            </Badge>
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          side="left" 
          sideOffset={10}
          className="w-80 border-2 border-orange-200 shadow-2xl bg-gradient-to-br from-white to-orange-50"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    Don't Forget! 📞
                  </h3>
                  <p className="text-xs text-slate-600">
                    RNR Reminder #{reminder.reminderCount}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 w-8 p-0 hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Message */}
            <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
              <p className="text-sm font-semibold text-orange-900 mb-2">
                ⏰ You need to call this candidate:
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Candidate</p>
                  <p className="font-bold text-slate-900">{candidateName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone Number</p>
                  <p className="font-semibold text-slate-900">{phoneNumber}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={onCall}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md"
              >
                📞 Call Now
              </Button>
              <Button
                variant="outline"
                onClick={onDismiss}
                className="flex-1 border-2"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
