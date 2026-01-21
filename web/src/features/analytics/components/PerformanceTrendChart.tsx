"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Activity } from "lucide-react";

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
    // 1. Format labels exactly like your existing logic
    const formattedData = performanceData.map((item) => ({
      ...item,
      monthLabel: `${item.month} ${item.year}`,
    }));

    // 2. Apply your existing time filtering logic
    let filtered: typeof formattedData;
    if (timeFilter === "1y") {
      filtered = formattedData.slice(-12);
    } else if (timeFilter === "2y") {
      filtered = formattedData.slice(-24);
    } else if (timeFilter === "3y") {
      filtered = formattedData.slice(-36);
    } else {
      filtered = formattedData;
    }

    // 3. Apply your short-label logic for long ranges
    const useShortLabels = filtered.length > 36;
    return filtered.map((item) => ({
      ...item,
      monthLabel: useShortLabels
        ? `${item.month.substring(0, 3)} '${item.year.toString().slice(-2)}`
        : `${item.month} ${item.year}`,
    }));
  }, [performanceData, timeFilter]);

  return (
    <Card className="overflow-hidden border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-2xl rounded-[2.5rem]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/30 p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">
                Performance Evolution
              </CardTitle>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Historical Trends for <span className="text-indigo-600">{recruiterName}</span>
              </p>
            </div>
          </div>

          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-48 rounded-2xl border-slate-200 bg-white font-bold text-slate-700 shadow-sm transition-all hover:border-indigo-400">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="1y">Last 1 Year</SelectItem>
              <SelectItem value="2y">Last 2 Years</SelectItem>
              <SelectItem value="3y">Last 3 Years</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        {/* Custom Legend for clearer understanding */}
        <div className="flex flex-wrap gap-6 mb-8 justify-center lg:justify-start">
          {[
            { label: "Assigned", color: "#6366f1", type: "solid" },
            { label: "Screening", color: "#10b981", type: "dashed" },
            { label: "Interview", color: "#f59e0b", type: "dashed" },
            { label: "Selected", color: "#8b5cf6", type: "solid" },
            { label: "Joined", color: "#06b6d4", type: "bold" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div 
                className="h-1 w-4 rounded-full" 
                style={{ 
                  backgroundColor: item.color, 
                  border: item.type === "dashed" ? "1px dashed white" : "none",
                  opacity: item.type === "dashed" ? 0.6 : 1
                }} 
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="w-full h-[450px]">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorJoined" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                
                <XAxis 
                  dataKey="monthLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  interval={trendData.length > 36 ? 2 : trendData.length > 12 ? 1 : 0}
                  dy={10}
                />
                
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                
                <Tooltip 
                  cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[180px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-b pb-2">{label}</p>
                          <div className="space-y-2">
                            {payload.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[11px] font-bold text-slate-600">{entry.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Area type="monotone" dataKey="assigned" name="Assigned" stroke="#6366f1" strokeWidth={2} fill="url(#colorAssigned)" isAnimationActive={true} />
                <Area type="monotone" dataKey="screening" name="Screening" stroke="#10b981" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="interview" name="Interview" stroke="#f59e0b" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="selected" name="Selected" stroke="#8b5cf6" strokeWidth={2} fill="transparent" />
                <Area type="monotone" dataKey="joined" name="Joined" stroke="#06b6d4" strokeWidth={4} fill="url(#colorJoined)" dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
              <Activity className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm font-medium italic">No performance data available for this recruiter</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};