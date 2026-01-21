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
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

const COLOR_MAP = {
  blue: "stroke-blue-500 fill-blue-50 text-blue-600 bg-blue-50 border-blue-100",
  green: "stroke-emerald-500 fill-emerald-50 text-emerald-600 bg-emerald-50 border-emerald-100",
  red: "stroke-rose-500 fill-rose-50 text-rose-600 bg-rose-50 border-rose-100",
  orange: "stroke-orange-500 fill-orange-50 text-orange-600 bg-orange-50 border-orange-100",
  purple: "stroke-purple-500 fill-purple-50 text-purple-600 bg-purple-50 border-purple-100",
  indigo: "stroke-indigo-500 fill-indigo-50 text-indigo-600 bg-indigo-50 border-indigo-100",
  amber: "stroke-amber-500 fill-amber-50 text-amber-600 bg-amber-50 border-amber-100",
  pink: "stroke-pink-500 fill-pink-50 text-pink-600 bg-pink-50 border-pink-100",
  violet: "stroke-violet-500 fill-violet-50 text-violet-600 bg-violet-50 border-violet-100",
  cyan: "stroke-cyan-500 fill-cyan-50 text-cyan-600 bg-cyan-50 border-cyan-100",
} as const;

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

export const TimeToStatusChart: React.FC<TimeToStatusChartProps> = ({
  recruiter,
  formatDuration,
}) => {
  const chartData: TimeToStatusData[] = breakdownItems.map(item => ({
    status: item.label,
    ProcessingTime: recruiter[item.valueKey as keyof typeof recruiter] as number,
  }));

  return (
    <Card className="overflow-hidden border border-slate-200/70 bg-white/90 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60 p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200/60">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-extrabold text-slate-900 tracking-tight">
                Processing Velocity
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Response speed for <span className="text-indigo-600 font-medium">{recruiter.name}</span>
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit px-3 py-1 rounded-full bg-white border-slate-200 text-slate-600 text-xs font-semibold">
            Avg First Touch: {formatDuration(recruiter.avgTimeToFirstTouch)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {/* Chart Area – reduced height & padding */}
        <div className="w-full h-[280px] mb-8 p-3 rounded-2xl bg-slate-50/60 border border-slate-100/70 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 16 }}>
              <defs>
                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="status" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }}
                dy={8}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }}
                tickFormatter={(v) => `${Math.round(v)}d`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                          {payload[0].payload.status}
                        </p>
                        <p className="text-lg font-bold text-indigo-600">
                          {formatDuration(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="ProcessingTime"
                stroke="#4f46e5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTime)"
                dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Grid – smaller cards */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Velocity Breakdown
            </h3>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {breakdownItems.map((item) => {
              const colorClasses = COLOR_MAP[item.color];
              const value = recruiter[item.valueKey as keyof typeof recruiter] as number;

              return (
                <div
                  key={item.label}
                  className={cn(
                    "group flex flex-col p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-1",
                    colorClasses
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1.5 transition-all group-hover:opacity-40 group-hover:translate-x-0" />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-70 mb-1">
                      {item.label}
                    </span>
                    <span className="text-lg font-extrabold tracking-tight leading-none">
                      {formatDuration(value)}
                    </span>
                    <div className="mt-2.5 h-1 w-full bg-white/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-current opacity-45" 
                        style={{ width: `${Math.min(100, (value / 30) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};