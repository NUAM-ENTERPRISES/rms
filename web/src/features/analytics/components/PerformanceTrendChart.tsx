// src/components/recruiter-dashboard/PerformanceTrendChart.tsx
import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MonthlyPerformance = {
  month: string;
  assigned: number;
  screening: number;
  interview: number;
  selected: number;
  joined: number;
};

type PerformanceTrendChartProps = {
  recruiterId: string;
  recruiterName: string;
  performanceData: MonthlyPerformance[];
};

export const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({
  recruiterId,
  recruiterName,
  performanceData,
}) => {
  const [timeFilter, setTimeFilter] = useState<"1y" | "2y" | "3y" | "all">("1y");

  const trendData = useMemo(() => {
    if (timeFilter === "1y") return performanceData.slice(-12);
    if (timeFilter === "2y") return performanceData.slice(-24);
    if (timeFilter === "3y") return performanceData.slice(-36);
    return performanceData; // "all"
  }, [performanceData, timeFilter]);

  return (
    <Card className="max-w-7xl mx-auto shadow-xl border-0">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl sm:text-2xl">
            Performance Trend Over Time
            <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
              — {recruiterName}
            </span>
          </CardTitle>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1y">Last 1 Year</SelectItem>
              <SelectItem value="2y">Last 2 Years</SelectItem>
              <SelectItem value="3y">Last 3 Years</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={trendData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11 }}
              interval={trendData.length > 24 ? 2 : trendData.length > 12 ? 1 : 0}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="assigned"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Assigned"
            />
            <Line
              type="monotone"
              dataKey="screening"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="In Screening"
            />
            <Line
              type="monotone"
              dataKey="interview"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="In Interview"
            />
            <Line
              type="monotone"
              dataKey="selected"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Selected"
            />
            <Line
              type="monotone"
              dataKey="joined"
              stroke="#06b6d4"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Joined"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};