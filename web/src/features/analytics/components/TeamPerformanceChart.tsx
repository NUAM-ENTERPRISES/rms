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
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users } from "lucide-react";

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
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          Team Performance
        </CardTitle>
        <CardDescription>Documents verified per team member</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="4 4" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar
              dataKey="verified"
              fill="#22c55e"
              radius={[8, 8, 0, 0]}
              name="Verified Documents"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
