import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useChartTheme } from "@/lib/chart-theme";
import { Recruiter } from "../data/mockRecruiterData";

interface RecruiterActivityChartProps {
  recruiter: Recruiter;
}

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function RecruiterActivityChart({ recruiter }: RecruiterActivityChartProps) {
  const chart = useChartTheme();
  const chartData = [
    { activity: "Added", count: recruiter.stats.candidatesAdded },
    { activity: "Submitted", count: recruiter.stats.submitted },
    { activity: "Scheduled", count: recruiter.stats.interviewsScheduled },
    { activity: "Passed", count: recruiter.stats.interviewsPassed },
    { activity: "Hired", count: recruiter.stats.hired },
  ];

  return (
    <div className="bg-card rounded-xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-foreground mb-1">
        Recruiter Activity Breakdown
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Pipeline conversion for {recruiter.name}
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis
            dataKey="activity"
            tick={{ fontSize: 12, fill: chart.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: chart.axis }}
            tickLine={false}
            axisLine={false}
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
          <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
