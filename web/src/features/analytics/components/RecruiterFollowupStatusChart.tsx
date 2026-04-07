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

interface FollowupStatusData {
  status: string;
  count: number;
}

interface RecruiterFollowupStatusChartProps {
  data: FollowupStatusData[];
  total: number;
  isLoading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Untouched: "#94a3b8",
  Interested: "#6366f1",
  "Not Interested": "#ef4444",
  "Not Eligible": "#f97316",
  "Other Enquiry": "#8b5cf6",
  Future: "#0ea5e9",
  "On Hold": "#f59e0b",
  RNR: "#ec4899",
  Qualified: "#10b981",
  Deployed: "#14b8a6",
};

export default function RecruiterFollowupStatusChart({
  data,
  total,
  isLoading,
}: RecruiterFollowupStatusChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-64 bg-slate-200 rounded" />
          <div className="h-3 w-48 bg-slate-200 rounded" />
          <div className="h-[400px] bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Recruiter Follow-up Status Overview
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Distribution of candidates by follow-up status
      </p>

      {/* Status count pills */}
      <div className="flex flex-wrap gap-3 mb-6">
        {data.map((entry) => (
          <div
            key={entry.status}
            className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLORS[entry.status] ?? "#6366f1" }}
            />
            <span className="text-xs text-gray-600">{entry.status}</span>
            <span className="text-xs font-bold text-gray-900">{entry.count}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-xs font-medium text-indigo-600">Total</span>
          <span className="text-xs font-bold text-indigo-700">{total}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="status"
            width={110}
            tick={{ fontSize: 12, fill: "#6b7280" }}
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
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "#6366f1"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
