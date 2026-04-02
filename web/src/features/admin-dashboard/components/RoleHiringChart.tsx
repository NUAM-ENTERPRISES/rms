import { cn } from "@/lib/utils";
import type { ProjectRole } from "../data/mockData";

type RoleHiringChartProps = {
  roles: ProjectRole[];
};

export default function RoleHiringChart({ roles }: RoleHiringChartProps) {
  if (!roles.length) {
    return (
      <div className="text-sm text-slate-400 text-center py-6">
        No role data available for this project.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roles.map((r) => {
        const pct = r.required > 0 ? Math.round((r.filled / r.required) * 100) : 0;
        const remaining = r.required - r.filled;
        const isComplete = pct >= 100;
        const isGood = pct >= 75;
        const isMid = pct >= 50;

        const barColor = isComplete
          ? "bg-emerald-500"
          : isGood
          ? "bg-blue-500"
          : isMid
          ? "bg-amber-400"
          : "bg-red-400";

        const pctColor = isComplete
          ? "text-emerald-600"
          : isGood
          ? "text-blue-600"
          : isMid
          ? "text-amber-600"
          : "text-red-500";

        const badgeBg = isComplete
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : isGood
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : isMid
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-red-50 text-red-600 border-red-200";

        return (
          <div key={r.role} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-slate-700 truncate">{r.role}</span>
                <span
                  className={cn(
                    "text-[11px] font-semibold px-1.5 py-0.5 rounded border shrink-0",
                    badgeBg
                  )}
                >
                  {isComplete ? "Full" : `${remaining} left`}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">{r.filled}</span>
                  <span className="mx-0.5">/</span>
                  {r.required}
                </span>
                <span className={cn("text-xs font-bold w-9 text-right", pctColor)}>
                  {pct}%
                </span>
              </div>
            </div>
            <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                  barColor
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
