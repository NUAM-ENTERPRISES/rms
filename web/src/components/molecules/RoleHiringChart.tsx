import { cn } from "@/lib/utils";

export type RoleHiringChartItem = {
  role: string;
  required: number;
  filled: number;
};

type RoleHiringChartProps = {
  roles: RoleHiringChartItem[];
};

export default function RoleHiringChart({ roles }: RoleHiringChartProps) {
  if (!roles.length) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No role data available for this project.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roles.map((roleItem) => {
        const pct =
          roleItem.required > 0
            ? Math.round((roleItem.filled / roleItem.required) * 100)
            : 0;
        const remaining = roleItem.required - roleItem.filled;
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
          <div key={roleItem.role} className="group">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-700">
                  {roleItem.role}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                    badgeBg
                  )}
                >
                  {isComplete ? "Full" : `${remaining} left`}
                </span>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">
                    {roleItem.filled}
                  </span>
                  <span className="mx-0.5">/</span>
                  {roleItem.required}
                </span>
                <span className={cn("w-9 text-right text-xs font-bold", pctColor)}>
                  {pct}%
                </span>
              </div>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
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
