import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/lib/chart-theme";
import { Loader2 } from "lucide-react";
import { useGetRecruiterPerformanceStagesQuery } from "@/services/recruiterAnalyticsApi";

interface RecruiterPerformanceStagesChartProps {
  selectedRecruiter: { id: string; name: string } | null;
}

type Period = "weekly" | "monthly";

const STAGE_CONFIG = [
  { key: "nominated", label: "Nominated", color: "#3b82f6" },
  { key: "documentVerified", label: "Document Verified", color: "#8b5cf6" },
  { key: "submittedToClient", label: "SubmittedToClient", color: "#f97316" },
  { key: "interviewPassed", label: "Interview Passed", color: "#eab308" },
  { key: "readyForProcessing", label: "Ready for Processing", color: "#22c55e" },
  { key: "hired", label: "Hired", color: "#15803d" },
] as const;

export default function RecruiterPerformanceStagesChart({
  selectedRecruiter,
}: RecruiterPerformanceStagesChartProps) {
  const chart = useChartTheme();
  const [period, setPeriod] = useState<Period>("weekly");

  const { data: res, isLoading } = useGetRecruiterPerformanceStagesQuery(
    { recruiterId: selectedRecruiter?.id ?? "", period },
    { skip: !selectedRecruiter },
  );

  const data = res?.data?.stages ?? [];
  const xKey = period === "weekly" ? "day" : "month";

  return (
    <div className="bg-card rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Recruiter {period === "weekly" ? "Weekly" : "Monthly"} Performance
          </h3>
          <p className="text-sm text-muted-foreground">
            Track recruiter candidate progress across recruitment stages
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden self-start">
          <button
            onClick={() => setPeriod("weekly")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              period === "weekly"
                ? "bg-indigo-600 text-white"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              period === "monthly"
                ? "bg-indigo-600 text-white"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[360px]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[360px] text-sm text-muted-foreground">
          No performance data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: chart.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: chart.axis }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(99,102,241,0.06)" }}
            contentStyle={{
              borderRadius: "0.75rem",
              border: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              fontSize: 13,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          {STAGE_CONFIG.map(({ key, label, color }) => (
            <Bar
              key={key}
              dataKey={key}
              name={label}
              stackId="stages"
              fill={color}
              radius={key === "hired" ? [4, 4, 0, 0] : undefined}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
