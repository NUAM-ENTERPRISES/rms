import { TrendingUp, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGetProjectRoleFillSummaryQuery } from "@/features/projects/api";

const PRIORITY_BADGE: Record<string, string> = {
  high:   "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low:    "border-emerald-200 bg-emerald-50 text-emerald-700",
  urgent: "border-purple-200 bg-purple-50 text-purple-700",
};

interface RoleRowProps {
  designation: string;
  priority: string;
  targetCount: number;
  filledCount: number;
}

function RoleRow({ designation, priority, targetCount, filledCount }: RoleRowProps) {
  const isFulfilled = targetCount > 0 && filledCount >= targetCount;
  const isInProgress = filledCount > 0 && !isFulfilled;
  const isNotStarted = filledCount === 0;

  /** Progress capped at 100% visually, but we show actual number */
  const pct = targetCount > 0 ? Math.min((filledCount / targetCount) * 100, 100) : 0;

  const barColor = isFulfilled
    ? "bg-emerald-500"
    : isInProgress
    ? "bg-amber-400"
    : "bg-slate-200";

  const statusIcon = isFulfilled ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
  ) : isInProgress ? (
    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
  ) : (
    <AlertCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
  );

  const statusLabel = isFulfilled ? "Fulfilled" : isInProgress ? "In Progress" : "Not Started";
  const statusLabelColor = isFulfilled
    ? "text-emerald-600"
    : isInProgress
    ? "text-amber-600"
    : "text-slate-400";

  const priorityKey = (priority ?? "").toLowerCase();

  return (
    <div className="space-y-2">
      {/* Role name + priority */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-xs font-semibold text-slate-700 truncate">{designation}</p>
        {PRIORITY_BADGE[priorityKey] && (
          <Badge
            variant="outline"
            className={cn("shrink-0 px-1.5 py-0 text-[10px] capitalize", PRIORITY_BADGE[priorityKey])}
          >
            {priority}
          </Badge>
        )}
      </div>

      {/* Progress bar + count */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("shrink-0 tabular-nums text-[11px] font-bold w-12 text-right", isFulfilled ? "text-emerald-600" : isInProgress ? "text-amber-600" : "text-slate-400")}>
          {filledCount}
          <span className="font-normal text-slate-400">/{targetCount}</span>
        </span>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-1">
        {statusIcon}
        <span className={cn("text-[10px] font-medium", statusLabelColor)}>
          {statusLabel}
        </span>
        {filledCount > targetCount && targetCount > 0 && (
          <span className="text-[10px] text-emerald-500 font-medium ml-1">
            (+{filledCount - targetCount} over target)
          </span>
        )}
      </div>
    </div>
  );
}

interface RoleFillSummaryCardProps {
  projectId: string;
}

export default function RoleFillSummaryCard({ projectId }: RoleFillSummaryCardProps) {
  const { data, isLoading } = useGetProjectRoleFillSummaryQuery({ projectId });

  const roles = data?.data ?? [];
  const summary = data?.summary;

  const fulfilledCount = roles.filter((r) => r.targetCount > 0 && r.filledCount >= r.targetCount).length;
  const overallPct =
    summary && summary.totalTarget > 0
      ? Math.round((summary.totalFilled / summary.totalTarget) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Role Fill Progress</p>
            <p className="text-[10px] text-slate-500">Your nominations per role</p>
          </div>
        </div>

        {/* Overall pill */}
        {summary && summary.totalTarget > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
            <Users className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold tabular-nums text-slate-700">
              {summary.totalFilled}
            </span>
            <span className="text-[10px] text-slate-400">/ {summary.totalTarget}</span>
            <span className={cn("text-[10px] font-semibold ml-0.5", overallPct >= 100 ? "text-emerald-600" : "text-indigo-600")}>
              {overallPct}%
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="flex justify-between">
                <div className="h-3 w-2/5 rounded bg-slate-100" />
                <div className="h-4 w-12 rounded-full bg-slate-100" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100" />
              <div className="h-2.5 w-1/4 rounded bg-slate-100" />
            </div>
          ))
        ) : roles.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            No roles defined for this project.
          </p>
        ) : (
          <>
            {roles.map((role, idx) => (
              <div key={role.roleNeededId}>
                <RoleRow
                  designation={role.designation}
                  priority={role.priority}
                  targetCount={role.targetCount}
                  filledCount={role.filledCount}
                />
                {idx < roles.length - 1 && (
                  <div className="mt-4 h-px bg-slate-100" />
                )}
              </div>
            ))}

            {/* Footer summary */}
            <div className="mt-1 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                <span className="font-semibold text-slate-700">{fulfilledCount}</span>
                {" "}of{" "}
                <span className="font-semibold text-slate-700">{roles.length}</span>
                {" "}role{roles.length !== 1 ? "s" : ""} fulfilled
              </span>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Fulfilled
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  In Progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-200" />
                  Not Started
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
