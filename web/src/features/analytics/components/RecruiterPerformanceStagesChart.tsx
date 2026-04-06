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
import { Recruiter } from "../data/mockRecruiterData";

interface RecruiterPerformanceStagesChartProps {
  selectedRecruiter: Recruiter;
}

type Period = "weekly" | "monthly";

const STAGE_CONFIG = [
  { key: "nominated", label: "Nominated", color: "#3b82f6" },
  { key: "documentVerified", label: "Document Verified", color: "#8b5cf6" },
  { key: "submittedToClient", label: "Submitted", color: "#f97316" },
  { key: "interviewPassed", label: "Interview Passed", color: "#eab308" },
  { key: "readyForProcessing", label: "Ready for Processing", color: "#22c55e" },
  { key: "hired", label: "Hired", color: "#15803d" },
] as const;

const weeklyDataByRecruiter: Record<string, Record<string, number | string>[]> = {
  "rec-1": [
    { day: "Mon", nominated: 2, documentVerified: 1, submittedToClient: 1, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
    { day: "Tue", nominated: 4, documentVerified: 3, submittedToClient: 2, interviewPassed: 1, readyForProcessing: 1, hired: 0 },
    { day: "Wed", nominated: 3, documentVerified: 2, submittedToClient: 1, interviewPassed: 1, readyForProcessing: 0, hired: 0 },
    { day: "Thu", nominated: 5, documentVerified: 4, submittedToClient: 3, interviewPassed: 2, readyForProcessing: 1, hired: 1 },
    { day: "Fri", nominated: 2, documentVerified: 1, submittedToClient: 1, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
  ],
  "rec-2": [
    { day: "Mon", nominated: 3, documentVerified: 2, submittedToClient: 1, interviewPassed: 1, readyForProcessing: 0, hired: 0 },
    { day: "Tue", nominated: 2, documentVerified: 1, submittedToClient: 1, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
    { day: "Wed", nominated: 4, documentVerified: 3, submittedToClient: 2, interviewPassed: 1, readyForProcessing: 1, hired: 0 },
    { day: "Thu", nominated: 3, documentVerified: 2, submittedToClient: 2, interviewPassed: 1, readyForProcessing: 0, hired: 1 },
    { day: "Fri", nominated: 1, documentVerified: 1, submittedToClient: 0, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
  ],
  "rec-3": [
    { day: "Mon", nominated: 1, documentVerified: 0, submittedToClient: 0, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
    { day: "Tue", nominated: 3, documentVerified: 2, submittedToClient: 1, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
    { day: "Wed", nominated: 2, documentVerified: 1, submittedToClient: 1, interviewPassed: 1, readyForProcessing: 0, hired: 0 },
    { day: "Thu", nominated: 4, documentVerified: 3, submittedToClient: 2, interviewPassed: 1, readyForProcessing: 1, hired: 0 },
    { day: "Fri", nominated: 2, documentVerified: 1, submittedToClient: 0, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
  ],
  "rec-4": [
    { day: "Mon", nominated: 3, documentVerified: 2, submittedToClient: 2, interviewPassed: 1, readyForProcessing: 0, hired: 0 },
    { day: "Tue", nominated: 5, documentVerified: 4, submittedToClient: 3, interviewPassed: 2, readyForProcessing: 1, hired: 1 },
    { day: "Wed", nominated: 2, documentVerified: 1, submittedToClient: 1, interviewPassed: 0, readyForProcessing: 0, hired: 0 },
    { day: "Thu", nominated: 4, documentVerified: 3, submittedToClient: 2, interviewPassed: 1, readyForProcessing: 1, hired: 0 },
    { day: "Fri", nominated: 3, documentVerified: 2, submittedToClient: 1, interviewPassed: 1, readyForProcessing: 0, hired: 1 },
  ],
};

const monthlyDataByRecruiter: Record<string, Record<string, number | string>[]> = {
  "rec-1": [
    { month: "Jan", nominated: 18, documentVerified: 12, submittedToClient: 8, interviewPassed: 5, readyForProcessing: 3, hired: 2 },
    { month: "Feb", nominated: 22, documentVerified: 16, submittedToClient: 11, interviewPassed: 7, readyForProcessing: 4, hired: 3 },
    { month: "Mar", nominated: 25, documentVerified: 19, submittedToClient: 14, interviewPassed: 9, readyForProcessing: 5, hired: 4 },
    { month: "Apr", nominated: 20, documentVerified: 14, submittedToClient: 10, interviewPassed: 6, readyForProcessing: 3, hired: 2 },
  ],
  "rec-2": [
    { month: "Jan", nominated: 15, documentVerified: 10, submittedToClient: 7, interviewPassed: 4, readyForProcessing: 2, hired: 1 },
    { month: "Feb", nominated: 19, documentVerified: 13, submittedToClient: 9, interviewPassed: 5, readyForProcessing: 3, hired: 2 },
    { month: "Mar", nominated: 21, documentVerified: 15, submittedToClient: 10, interviewPassed: 6, readyForProcessing: 4, hired: 3 },
    { month: "Apr", nominated: 17, documentVerified: 11, submittedToClient: 8, interviewPassed: 5, readyForProcessing: 2, hired: 1 },
  ],
  "rec-3": [
    { month: "Jan", nominated: 10, documentVerified: 6, submittedToClient: 4, interviewPassed: 2, readyForProcessing: 1, hired: 0 },
    { month: "Feb", nominated: 14, documentVerified: 9, submittedToClient: 6, interviewPassed: 3, readyForProcessing: 2, hired: 1 },
    { month: "Mar", nominated: 16, documentVerified: 11, submittedToClient: 7, interviewPassed: 4, readyForProcessing: 2, hired: 1 },
    { month: "Apr", nominated: 12, documentVerified: 8, submittedToClient: 5, interviewPassed: 3, readyForProcessing: 1, hired: 1 },
  ],
  "rec-4": [
    { month: "Jan", nominated: 20, documentVerified: 15, submittedToClient: 10, interviewPassed: 7, readyForProcessing: 4, hired: 3 },
    { month: "Feb", nominated: 24, documentVerified: 18, submittedToClient: 13, interviewPassed: 8, readyForProcessing: 5, hired: 3 },
    { month: "Mar", nominated: 28, documentVerified: 21, submittedToClient: 15, interviewPassed: 10, readyForProcessing: 6, hired: 4 },
    { month: "Apr", nominated: 22, documentVerified: 16, submittedToClient: 11, interviewPassed: 7, readyForProcessing: 4, hired: 2 },
  ],
};

const defaultWeekly = weeklyDataByRecruiter["rec-1"];
const defaultMonthly = monthlyDataByRecruiter["rec-1"];

export default function RecruiterPerformanceStagesChart({
  selectedRecruiter,
}: RecruiterPerformanceStagesChartProps) {
  const [period, setPeriod] = useState<Period>("weekly");

  const data =
    period === "weekly"
      ? weeklyDataByRecruiter[selectedRecruiter.id] ?? defaultWeekly
      : monthlyDataByRecruiter[selectedRecruiter.id] ?? defaultMonthly;

  const xKey = period === "weekly" ? "day" : "month";

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Recruiter {period === "weekly" ? "Weekly" : "Monthly"} Performance
          </h3>
          <p className="text-sm text-gray-500">
            Track recruiter candidate progress across recruitment stages
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden self-start">
          <button
            onClick={() => setPeriod("weekly")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              period === "weekly"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              period === "monthly"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#9ca3af" }}
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
    </div>
  );
}
