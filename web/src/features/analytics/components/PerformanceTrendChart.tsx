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
  year: number;
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
    // Format month labels with year for display
    const formattedData = performanceData.map((item) => ({
      ...item,
      monthLabel: `${item.month} ${item.year}`,
    }));

    // Filter data based on time range
    let filtered: typeof formattedData;
    if (timeFilter === "1y") {
      filtered = formattedData.slice(-12);
    } else if (timeFilter === "2y") {
      filtered = formattedData.slice(-24);
    } else if (timeFilter === "3y") {
      filtered = formattedData.slice(-36);
    } else {
      // "all" - return all data
      filtered = formattedData;
    }

    // For long time ranges (>3 years), use shorter labels
    const useShortLabels = filtered.length > 36;
    return filtered.map((item) => ({
      ...item,
      monthLabel: useShortLabels
        ? `${item.month.substring(0, 3)} '${item.year.toString().slice(-2)}`
        : `${item.month} ${item.year}`,
    }));
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
              dataKey="monthLabel"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: trendData.length > 60 ? 9 : 11 }}
              interval={
                trendData.length > 60 
                  ? Math.floor(trendData.length / 12) // Show ~12 labels for 10+ years
                  : trendData.length > 36 
                    ? 2 // Show every 2nd month for 3+ years
                    : trendData.length > 12 
                      ? 1 // Show every month for 1-2 years
                      : 0 // Show all months for <1 year
              }
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