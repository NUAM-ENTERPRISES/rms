import { useState, useEffect } from "react";
import { useAppSelector } from "@/app/hooks";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { PhoneCall, Phone, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetMyRNRRemindersQuery } from "@/services/rnrRemindersApi";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHasRole } from "@/hooks/useCan";
export function RNRReminderBadge() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { accessToken, user } = useAppSelector((s) => s.auth);
  
  // Allow both exact role match and case-insensitive substring match (e.g. "Recruiter", "Recruiter Team")
  const isRecruiterUser = useHasRole("recruiter") || (!!user && (
    Array.isArray(user.roles)
      ? user.roles.some((r: string) => r.toLowerCase().includes("recruiter"))
      : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("recruiter")
  ));

  // If user isn't authenticated or not a recruiter, do not call API
  if (!accessToken || !isRecruiterUser) return null;

  // Force show for testing - set to true to test UI without real data
  const FORCE_SHOW_FOR_TESTING = false;
  
  // Socket-first: fetch actionable reminders with low-frequency poll fallback
  const queryArg = accessToken && isRecruiterUser ? {} : skipToken;
  const { data: remindersData, isLoading, refetch } = useGetMyRNRRemindersQuery(queryArg as any, {
    pollingInterval: 300000, // 5 minutes
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    refetchOnFocus: false,
  });

  // ensure fresh data when tab becomes visible
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && typeof refetch === "function") {
        const maybe = refetch();
        if (maybe && typeof (maybe as any).catch === "function") maybe.catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch]);

  const reminders = remindersData?.data || [];
  const activeReminders = reminders
    .filter((r) => r.dailyCount && r.dailyCount > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5); // Get latest 5 reminders
  const pendingCount = reminders.filter((r) => r.dailyCount && r.dailyCount > 0).length; // Total count
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="h-10 w-10 flex items-center justify-center">
        <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (pendingCount === 0 && !FORCE_SHOW_FOR_TESTING) {
    return null;
  }

  const handleCall = (reminder: typeof activeReminders[0]) => {
    window.location.href = `tel:${reminder.candidate.countryCode}${reminder.candidate.mobileNumber}`;
    setOpen(false);
  };

  const handleViewProfile = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative h-10 w-10 rounded-full",
            "hover:bg-orange-100/20",
            "transition-all duration-300"
          )}
        >
          {/* Blinking Bell Icon */}
          <div className="relative">
            {/* Outer pulse ring */}
            <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-75" />
            
            {/* Inner blinking icon */}
            <PhoneCall className={cn(
              "h-5 w-5 relative z-10",
              "text-white animate-pulse"
            )} />
          </div>
          
          {/* Badge counter */}
          {pendingCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0",
                "flex items-center justify-center text-xs font-bold",
                "bg-gradient-to-br from-orange-500 to-red-600 text-white",
                "border-2 border-[#051027]",
                "animate-bounce"
              )}
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[420px] border-2 border-orange-200 shadow-2xl bg-gradient-to-br from-white to-orange-50"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <PhoneCall className="h-6 w-6 text-white animate-wiggle" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900">
                RNR Reminders 📞
              </h3>
              <p className="text-xs text-slate-600">
                Don't forget to call these candidates
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              {pendingCount} total
            </Badge>
          </div>

          {/* Candidates List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto overflow-x-hidden pr-2">
            {activeReminders.map((reminder, index) => {
              const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;
              const phoneNumber = `${reminder.candidate.countryCode} ${reminder.candidate.mobileNumber}`;
              
              return (
                <div
                  key={reminder.id}
                  className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-sm space-y-3 hover:border-orange-300 transition-colors"
                >
                  {/* Candidate Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                          {index + 1}
                        </span>
                        <p className="text-sm font-bold text-orange-600 uppercase tracking-wide">
                          Candidate
                        </p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">
                        {candidateName}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                      Reminder #{reminder.reminderCount}
                    </Badge>
                  </div>
                  
                  {/* Phone Number */}
                  <div className="flex items-center gap-2 pt-2 border-t border-orange-100">
                    <Phone className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-semibold text-slate-900">
                      {phoneNumber}
                    </p>
                  </div>

                  {/* Previous Note */}
                  {reminder.statusHistory.reason && (
                    <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                        Previous Note
                      </p>
                      <p className="text-xs text-slate-700 italic">
                        "{reminder.statusHistory.reason}"
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleCall(reminder)}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md"
                    >
                      <Phone className="h-3.5 w-3.5 mr-1.5" />
                      Call Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(reminder.candidateId)}
                      className="flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          {pendingCount > 5 && (
            <div className="pt-3 border-t border-orange-200">
              <p className="text-xs text-slate-500 text-center">
                Showing latest 5 of {pendingCount} reminders
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
