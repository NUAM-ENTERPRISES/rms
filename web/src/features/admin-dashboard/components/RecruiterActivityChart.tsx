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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetTopRecruiterStatsQuery } from "@/features/admin/api/adminDashboardApi";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
];

export default function RecruiterActivityChart() {
  const { data, isLoading, isError } = useGetTopRecruiterStatsQuery({});
  const recruiterActivities = data?.data?.recruiterActivities ?? [];

  const defaultStages = [
    { activity: "Positive Candidate", value: 0 },
    { activity: "Document Verified", value: 0 },
    { activity: "Interview Shortlisted", value: 0 },
    { activity: "Interview Passed", value: 0 },
    { activity: "Processing", value: 0 },
    { activity: "Deployed", value: 0 },
  ];

  const chartData = isLoading ? defaultStages : recruiterActivities.length > 0 ? recruiterActivities : defaultStages;

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">
          Top Recruiter — Stage Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {isError ? (
          <div className="text-center text-red-500 font-medium">
            Failed to load recruiter activity
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="activity"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
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
        )}
      </CardContent>
    </Card>
  );
}
