import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetCoordinatorProjectsByStatusQuery } from "../api/projectCoordinatorDashboardApi";

const STATUS_CONFIG = [
  {
    key: "active",
    label: "Active",
    fill: "#6366f1",
    dotColor: "bg-indigo-500",
  },
  {
    key: "completed",
    label: "Completed",
    fill: "#10b981",
    dotColor: "bg-emerald-500",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    fill: "#f59e0b",
    dotColor: "bg-amber-500",
  },
] as const;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.payload.fill }}
        />
        <span className="text-sm font-medium text-slate-700">{item.name}</span>
      </div>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
        {item.value} {item.value === 1 ? "project" : "projects"}
      </p>
    </div>
  );
}

export default function ProjectsByStatusChart() {
  const { data, isLoading, isError } =
    useGetCoordinatorProjectsByStatusQuery();
  const breakdown = data?.data;

  const chartData = useMemo(
    () =>
      STATUS_CONFIG.map((status) => ({
        name: status.label,
        key: status.key,
        value: breakdown?.[status.key] ?? 0,
        fill: status.fill,
      })).filter((item) => item.value > 0),
    [breakdown]
  );

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">
          My Projects by Status
        </CardTitle>
        <CardDescription>
          Distribution of your projects across statuses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">
              Failed to load chart data
            </p>
          </div>
        ) : total === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-slate-100 p-3">
              <Briefcase className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                No projects yet
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Create your first project to see the breakdown here
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="relative flex-1">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums text-slate-800">
                  {total}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Total
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pr-2">
              {STATUS_CONFIG.map((status) => {
                const count = breakdown?.[status.key] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status.key} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-3 w-3 shrink-0 rounded-full",
                        status.dotColor
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">
                        {status.label}
                      </p>
                      <p className="text-xs tabular-nums text-slate-400">
                        {count} ({pct}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
