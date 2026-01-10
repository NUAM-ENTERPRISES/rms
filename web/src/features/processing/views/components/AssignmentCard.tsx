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
}

export function AssignmentCard({
  assignedTo,
  recruiter,
  processingStatus,
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

  const progress = getProgressPercentage();

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Assignment
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Processing Executive */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-indigo-600 text-lg font-black shadow">
            {assignedTo?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{assignedTo?.name || "Unassigned"}</div>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">Processing Exec</div>
          </div>
        </div>

        {/* Recruiter */}
        {recruiter && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
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
            <span className="text-lg font-black">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
            <div
              style={{ width: `${Math.max(progress, 5)}%` }}
              className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
