"use client";

import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

type CandidateStatusData = {
  candidate: string;
  verified: number;
  pending: number;
  rejected: number;
};

type CandidateStatusChartProps = {
  data: CandidateStatusData[];
};

export const CandidateStatusChart: React.FC<CandidateStatusChartProps> = ({ data }) => {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          Candidate Document Status
        </CardTitle>
        <CardDescription>Verified / Pending / Rejected per candidate (Top 10)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e0e0e0" />
            <XAxis
              dataKey="candidate"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="verified" stackId="a" fill="#22c55e" name="Verified" />
            <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
            <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
