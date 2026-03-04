import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Mail, Phone } from "lucide-react";

interface AssignmentCardProps {
  assignedTo?: {
    id: string;
    name: string;
    email?: string;
    mobileNumber?: string;
  };
  recruiter?: {
    id: string;
    name: string;
    email?: string;
  };
  processingStatus: string;
  /** Optional explicit progress percentage from API (0-100) */
  progressCount?: number;
}

export function AssignmentCard({
  assignedTo,
  recruiter,
  processingStatus,
  progressCount,
}: AssignmentCardProps) {
  const getProgressPercentage = () => {
    switch (processingStatus) {
      case "assigned":
        return 0;
      case "in_progress":
        return 35;
      case "completed":
        return 100;
      case "cancelled":
        return 0;
      default:
        return 0;
    }
  };

  const pct = typeof progressCount === "number"
    ? Math.min(100, Math.max(0, Math.round(progressCount)))
    : getProgressPercentage();

  const barWidth = pct === 0 ? 0 : Math.max(pct, 5);

  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 dark:from-violet-950 dark:via-indigo-950 dark:to-purple-950 text-white">
      <CardHeader className="py-3 pb-2 border-b border-white/10 dark:border-white/5">
        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Assignment
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 bg-white/5 dark:bg-black/30">
        {/* Processing Executive */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10">
          <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg font-black shadow">
            {assignedTo?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">
              {assignedTo?.name || "Unassigned"}
            </div>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">
              Processing Exec
            </div>
          </div>
        </div>

        {/* Recruiter */}
        {recruiter && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10">
            <div className="h-8 w-8 rounded-lg bg-white/20 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
              {recruiter.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{recruiter.name}</div>
              <div className="text-[10px] opacity-60">Recruiter</div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Progress</span>
            <span className="text-lg font-black">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20 dark:bg-white/10 overflow-hidden">
            <div
              style={{ width: `${barWidth}%` }}
              className="h-full rounded-full bg-white dark:bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] dark:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}