"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */
type TimeToStatusData = {
  status: string;
  ProcessingTime: number;
};

type TimeToStatusChartProps = {
  recruiter: {
    name: string;
    avgTimeToFirstTouch: number;
    avgDaysToInterested: number;
    avgDaysToNotInterested: number;
    avgDaysToNotEligible: number;
    avgDaysToOtherEnquiry: number;
    avgDaysToFuture: number;
    avgDaysToOnHold: number;
    avgDaysToRNR: number;
    avgDaysToQualified: number;
    avgDaysToWorking: number;
  };
  formatDuration: (days: number) => string;
};

/* ------------------------------------------------------------------ */
/* Tailwind-safe color map */
/* ------------------------------------------------------------------ */
const COLOR_MAP = {
  blue: { bg: "bg-blue-600", text: "text-blue-600" },
  green: { bg: "bg-green-600", text: "text-green-600" },
  red: { bg: "bg-red-600", text: "text-red-600" },
  orange: { bg: "bg-orange-600", text: "text-orange-600" },
  purple: { bg: "bg-purple-600", text: "text-purple-600" },
  indigo: { bg: "bg-indigo-600", text: "text-indigo-600" },
  amber: { bg: "bg-amber-600", text: "text-amber-600" },
  pink: { bg: "bg-pink-600", text: "text-pink-600" },
  violet: { bg: "bg-violet-600", text: "text-violet-600" },
  cyan: { bg: "bg-cyan-600", text: "text-cyan-600" },
} as const;

/* ------------------------------------------------------------------ */
/* Breakdown config */
/* ------------------------------------------------------------------ */
const breakdownItems = [
  { label: "First Touch", valueKey: "avgTimeToFirstTouch", color: "blue" },
  { label: "Interested", valueKey: "avgDaysToInterested", color: "green" },
  { label: "Not Interested", valueKey: "avgDaysToNotInterested", color: "red" },
  { label: "Not Eligible", valueKey: "avgDaysToNotEligible", color: "orange" },
  { label: "Other Enquiry", valueKey: "avgDaysToOtherEnquiry", color: "purple" },
  { label: "Future", valueKey: "avgDaysToFuture", color: "indigo" },
  { label: "On Hold", valueKey: "avgDaysToOnHold", color: "amber" },
  { label: "RNR", valueKey: "avgDaysToRNR", color: "pink" },
  { label: "Qualified", valueKey: "avgDaysToQualified", color: "violet" },
  { label: "Working", valueKey: "avgDaysToWorking", color: "cyan" },
] as const;

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */
export const TimeToStatusChart: React.FC<TimeToStatusChartProps> = ({
  recruiter,
  formatDuration,
}) => {
  const chartData: TimeToStatusData[] = [
    { status: "First Touch", ProcessingTime: recruiter.avgTimeToFirstTouch },
    { status: "Interested", ProcessingTime: recruiter.avgDaysToInterested },
    { status: "Not Interested", ProcessingTime: recruiter.avgDaysToNotInterested },
    { status: "Not Eligible", ProcessingTime: recruiter.avgDaysToNotEligible },
    { status: "Other Enquiry", ProcessingTime: recruiter.avgDaysToOtherEnquiry },
    { status: "Future", ProcessingTime: recruiter.avgDaysToFuture },
    { status: "On Hold", ProcessingTime: recruiter.avgDaysToOnHold },
    { status: "RNR", ProcessingTime: recruiter.avgDaysToRNR },
    { status: "Qualified", ProcessingTime: recruiter.avgDaysToQualified },
    { status: "Working", ProcessingTime: recruiter.avgDaysToWorking },
  ];

  return (
    <Card className="max-w-6xl mx-auto shadow-xl border-0 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time from Untouched → Status
        </CardTitle>
        <p className="text-xs sm:text-sm mt-1 text-gray-500">
          Avg. time for <span className="font-bold text-1xl text-black">{recruiter.name}</span>
        </p>
      </CardHeader>

      <CardContent className="pt-4 pb-6">
        {/* Chart */}
        <div className="w-full h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="status"
                angle={-30}
                textAnchor="end"
                interval={0}
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${Math.round(v)}d`}
              />
              <Tooltip
                formatter={(value: number) => formatDuration(value)}
              />
              <Line
                type="monotone"
                dataKey="ProcessingTime"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown */}
      {/* Detailed Breakdown */}
<div className="mt-5 border-t pt-3">
  <h3 className="text-sm sm:text-base font-semibold text-center mb-3 text-gray-700 dark:text-gray-300">
    Detailed Breakdown
  </h3>

  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
    {breakdownItems.map((item) => {
      const color = COLOR_MAP[item.color];

      return (
        <div
          key={item.label}
          className="flex flex-col items-center p-2 rounded-md bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow"
        >
          <Badge
            className={`mb-1 px-2 py-0.5 text-[10px] font-medium ${color.bg}`}
          >
            {item.label}
          </Badge>

          <p className={`text-base font-semibold leading-tight ${color.text}`}>
            {formatDuration(recruiter[item.valueKey])}
          </p>

          <p className="text-[10px] text-gray-500 mt-0.5">avg time</p>
        </div>
      );
    })}
  </div>
</div>

      </CardContent>
    </Card>
  );
};
