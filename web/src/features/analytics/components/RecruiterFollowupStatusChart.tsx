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
import { Recruiter } from "../data/mockRecruiterData";

interface RecruiterFollowupStatusChartProps {
  selectedRecruiter: Recruiter;
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

const mockStatusDataByRecruiter: Record<string, { status: string; count: number }[]> = {
  "rec-1": [
    { status: "Untouched", count: 35 },
    { status: "Interested", count: 28 },
    { status: "Not Interested", count: 12 },
    { status: "Not Eligible", count: 6 },
    { status: "Other Enquiry", count: 4 },
    { status: "Future", count: 8 },
    { status: "On Hold", count: 5 },
    { status: "RNR", count: 10 },
    { status: "Qualified", count: 14 },
    { status: "Deployed", count: 7 },
  ],
  "rec-2": [
    { status: "Untouched", count: 22 },
    { status: "Interested", count: 31 },
    { status: "Not Interested", count: 18 },
    { status: "Not Eligible", count: 9 },
    { status: "Other Enquiry", count: 7 },
    { status: "Future", count: 5 },
    { status: "On Hold", count: 3 },
    { status: "RNR", count: 6 },
    { status: "Qualified", count: 11 },
    { status: "Deployed", count: 8 },
  ],
  "rec-3": [
    { status: "Untouched", count: 40 },
    { status: "Interested", count: 15 },
    { status: "Not Interested", count: 10 },
    { status: "Not Eligible", count: 4 },
    { status: "Other Enquiry", count: 2 },
    { status: "Future", count: 6 },
    { status: "On Hold", count: 8 },
    { status: "RNR", count: 3 },
    { status: "Qualified", count: 7 },
    { status: "Deployed", count: 5 },
  ],
  "rec-4": [
    { status: "Untouched", count: 18 },
    { status: "Interested", count: 34 },
    { status: "Not Interested", count: 14 },
    { status: "Not Eligible", count: 7 },
    { status: "Other Enquiry", count: 5 },
    { status: "Future", count: 10 },
    { status: "On Hold", count: 4 },
    { status: "RNR", count: 8 },
    { status: "Qualified", count: 16 },
    { status: "Deployed", count: 12 },
  ],
};

const defaultData = mockStatusDataByRecruiter["rec-1"];

export default function RecruiterFollowupStatusChart({
  selectedRecruiter,
}: RecruiterFollowupStatusChartProps) {
  const data = mockStatusDataByRecruiter[selectedRecruiter.id] ?? defaultData;
  const total = data.reduce((sum, d) => sum + d.count, 0);

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
