"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Trophy, Users, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

type TeamPerformanceData = {
  name: string;
  verified: number;
};

type TeamPerformanceChartProps = {
  data: TeamPerformanceData[];
};

export const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({
  data,
}) => {
  // Sort by verified count descending + add rank
  const sortedData = [...data]
    .sort((a, b) => b.verified - a.verified)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      // normalized percentage for bar length & color intensity
      percentage: data.length > 0 ? Math.round((item.verified / Math.max(...data.map(d => d.verified))) * 100) : 0,
    }));

  const maxVerified = Math.max(...data.map(d => d.verified), 1);

  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Team Performance
          </CardTitle>
          <CardDescription>No verification data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-slate-200 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-100 p-2">
              <Trophy className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Team Verification Leaders
              </CardTitle>
              <CardDescription className="text-xs">
                Top performers by documents verified
              </CardDescription>
            </div>
          </div>
          <div className="text-xs font-medium text-slate-500">
            Total verified: {data.reduce((sum, d) => sum + d.verified, 0)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        <ResponsiveContainer width="100%" height={Math.max(280, sortedData.length * 45)}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.6} />

            <YAxis
              dataKey="name"
              type="category"
              width={140}
              tick={{ fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 16)}...` : value}
            />

            <XAxis
              type="number"
              domain={[0, maxVerified * 1.1]}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
            />

            <Tooltip
              cursor={{ fill: "rgba(79, 70, 229, 0.08)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
                      <div className="font-semibold flex items-center gap-2 mb-1">
                        {item.rank === 1 ? (
                          <Medal className="h-4 w-4 text-yellow-500" />
                        ) : item.rank === 2 ? (
                          <Medal className="h-4 w-4 text-slate-400" />
                        ) : item.rank === 3 ? (
                          <Medal className="h-4 w-4 text-amber-700" />
                        ) : null}
                        {item.name}
                      </div>
                      <div className="text-indigo-600 font-bold">
                        {item.verified} documents verified
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Rank #{item.rank} • {item.percentage}% of top performer
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Bar
              dataKey="verified"
              radius={[6, 6, 6, 6]}
              minPointSize={20}
              barSize={28}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${index})`}
                  className={cn(
                    "transition-all duration-300",
                    entry.rank === 1 && "opacity-100 hover:opacity-90"
                  )}
                />
              ))}
              <LabelList
                dataKey="verified"
                position="right"
                offset={12}
                fontSize={12}
                formatter={(value: number) => `${value}`}
              />
            </Bar>

            {/* Define gradients for each bar */}
            <defs>
              {sortedData.map((_, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`gradient-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.65} />
                </linearGradient>
              ))}
            </defs>
          </BarChart>
        </ResponsiveContainer>

        {/* Small top performer highlight */}
        {sortedData.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-600">
            <span className="font-medium text-indigo-700">
              {sortedData[0].name}
            </span>{" "}
            leads with{" "}
            <span className="font-bold">{sortedData[0].verified}</span> verifications
          </div>
        )}
      </CardContent>
    </Card>
  );
};