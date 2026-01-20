"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function DailyTrendChart({
  data,
  verifiers,
  selectedVerifier,
  setSelectedVerifier,
}: any) {
  return (
    <Card className="shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Daily Verification Trend
          </CardTitle>
          <CardDescription>
            Verified, Pending & Rejected over time
          </CardDescription>
        </div>

      <Select value={selectedVerifier} onValueChange={setSelectedVerifier}>
  <SelectTrigger className="w-[180px] h-9 text-sm">
    <SelectValue placeholder="Select Verifier" />
  </SelectTrigger>
  <SelectContent>
    {verifiers.map((v: string) => (
      <SelectItem key={v} value={v}>
        {v}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="4 4" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area dataKey="verified" stackId="1" fill="#22c55e" stroke="#22c55e" />
            <Area dataKey="pending" stackId="1" fill="#f59e0b" stroke="#f59e0b" />
            <Area dataKey="rejected" stackId="1" fill="#ef4444" stroke="#ef4444" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
