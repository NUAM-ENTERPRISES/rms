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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4"];

interface RecruiterActivityBreakdownChartProps {
  data: Array<{ activity: string; value: number }>;
  isLoading?: boolean;
}

export default function RecruiterActivityBreakdownChart({ 
  data, 
  isLoading 
}: RecruiterActivityBreakdownChartProps) {
  const chart = useChartTheme();
  const chartData = isLoading || !data
    ? [
        { activity: "Projects Assigned", value: 0 },
        { activity: "Documents Verified", value: 0 },
        { activity: "Interviews Passed", value: 0 },
        { activity: "Candidates Deployed", value: 0 },
      ]
    : data;

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Recruiter Activity Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis
              dataKey="activity"
              tick={{ fontSize: 11, fill: chart.axis }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12, fill: chart.axis }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              cursor={{ fill: "rgba(99,102,241,0.08)" }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Count">
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
