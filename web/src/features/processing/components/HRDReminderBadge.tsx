import { useState, useEffect } from "react";
import { useAppSelector } from "@/app/hooks";
import { FileClock, Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetHRDRemindersQuery } from "@/services/hrdRemindersApi";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHasRole } from "@/hooks/useCan";

export function HRDReminderBadge() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { accessToken, user } = useAppSelector((s) => s.auth);
  // Allow both exact role match and case-insensitive substring match (e.g. "Processing", "Processing Team")
  const isProcessingUser = useHasRole("processing") || (!!user && (
    Array.isArray(user.roles)
      ? user.roles.some((r: string) => r.toLowerCase().includes("processing"))
      : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("processing")
  ));

  // If user isn't authenticated or not a processing team member, do not call API
  if (!accessToken || !isProcessingUser) return null;

  // socket-first: fetch actionable reminders only, with low-frequency polling fallback
  const { data, isLoading, refetch } = useGetHRDRemindersQuery(undefined, {
    pollingInterval: 300000, // 5 minutes
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    refetchOnFocus: false,
  });

  // ensure fresh data when tab becomes visible
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetch().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch]);

  if (!isProcessingUser) return null;

  const reminders = data?.data || [];
  const activeReminders = reminders
    .filter((r) => (r.dailyCount && r.dailyCount > 0) || (r.reminderCount && r.reminderCount > 0))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const pendingCount = reminders.filter((r) => (r.dailyCount && r.dailyCount > 0) || (r.reminderCount && r.reminderCount > 0)).length;

  if (isLoading) {
    return (
      <div className="h-10 w-10 flex items-center justify-center">
        <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (pendingCount === 0) return null;

  const handleView = (reminder: typeof activeReminders[0]) => {
    const processingCandidateId = reminder.processingStep.processingCandidate?.id || reminder.processingCandidate?.id || reminder.processingCandidate?.processingId;
    const processingId = reminder.processingStep.processingId || (reminder as any).processingId || reminder.processingStep.id;
    const target = processingCandidateId || processingId;
    navigate(`/processingCandidateDetails/${target}`);
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
            "hover:bg-red-100/20",
            "transition-all duration-300"
          )}
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
            <FileClock className={cn("h-5 w-5 relative z-10 text-white animate-pulse")} />
          </div>

          {pendingCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0",
                "flex items-center justify-center text-xs font-bold",
                "bg-gradient-to-br from-red-500 to-rose-600 text-white",
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
        className="w-[420px] border-2 border-rose-200 shadow-2xl bg-gradient-to-br from-white to-rose-50"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900">HRD Reminders 🔔</h3>
              <p className="text-xs text-slate-600">HRD Documents pending review</p>
            </div>
            <Badge className="bg-gradient-to-r from-rose-500 to-red-500 text-white">{pendingCount} total</Badge>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto overflow-x-hidden pr-2">
            {activeReminders.map((reminder, index) => {
              const candidate = reminder.processingStep.processingCandidate?.candidate || reminder.processingStep.processing?.candidate || (reminder.processingCandidate as any)?.candidate;
              const candidateName = candidate ? `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() : "Candidate";
              const project = reminder.processingStep.processingCandidate?.project || reminder.processingStep.processing?.project || (reminder.processingCandidate as any)?.project;
              const projectName = (project as any)?.title || (project as any)?.name || "Project";

              return (
                <div key={reminder.id} className="bg-white rounded-md p-2 border border-rose-100 shadow-sm hover:shadow-md transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{candidateName}</p>
                        <p className="text-xs text-slate-500 truncate">{projectName}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">#{reminder.reminderCount}</Badge>
                      <Button
                        onClick={() => handleView(reminder)}
                        size="sm"
                        className="h-7 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pendingCount > 8 && (
            <div className="pt-3 border-t border-rose-200">
              <p className="text-xs text-slate-500 text-center">Showing latest 8 of {pendingCount} reminders</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
