import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  hiringTrendDaily,
  hiringTrendMonthly,
  hiringTrendYearly,
  type HiringTrendEntry,
} from "../data/mockData";

type Filter = "Daily" | "Monthly" | "Yearly";

const datasets: Record<Filter, HiringTrendEntry[]> = {
  Daily: hiringTrendDaily,
  Monthly: hiringTrendMonthly,
  Yearly: hiringTrendYearly,
};

export default function HiringTrendChart() {
  const [filter, setFilter] = useState<Filter>("Monthly");
  const data = datasets[filter];

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-slate-700 uppercase tracking-wide">
          Candidates Placed Over Time
        </CardTitle>
        <div className="flex gap-1">
          {(["Daily", "Monthly", "Yearly"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="text-xs h-7 px-3"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              cursor={{ fill: "rgba(99,102,241,0.08)" }}
            />
            <Bar
              dataKey="hired"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
              name="Hired"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
