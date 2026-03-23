import React, { useMemo } from "react";
import { useGetRecruiterPerformanceQuery } from "@/features/admin/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import {
  UserCircle2,
  TrendingUp,
  Users,
  FileCheck2,
  ListChecks,
  Award,
  Plane,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface RecruiterPerformanceChartWrapperProps {
  recruiterId?: string;
  recruiterName?: string;
}

// ── Metric config ──────────────────────────────────────────────────
const METRICS = [
  { key: "registered",       label: "Registered",        color: "#3b82f6", icon: Users,      bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   bar: "bg-blue-500" },
  { key: "documentVerified", label: "Doc Verified",       color: "#10b981", icon: FileCheck2,  bg: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-700",bar: "bg-emerald-500" },
  { key: "shortlisted",      label: "Shortlisted",        color: "#f59e0b", icon: ListChecks,  bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700",  bar: "bg-amber-500" },
  { key: "interviewPassed",  label: "Interview Passed",   color: "#8b5cf6", icon: Award,       bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700", bar: "bg-violet-500" },
  { key: "deployed",         label: "Deployed",           color: "#ec4899", icon: Plane,       bg: "bg-pink-50",    border: "border-pink-200",   text: "text-pink-700",   bar: "bg-pink-500" },
] as const;

// ── Custom bar tooltip ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 min-w-[220px]">
        <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-semibold text-gray-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// ── Component ──────────────────────────────────────────────────────
export const RecruiterPerformanceChartWrapper: React.FC<RecruiterPerformanceChartWrapperProps> = ({
  recruiterId,
  recruiterName,
}) => {
  const currentYear = new Date().getFullYear();
  const [timeFilter, setTimeFilter] = React.useState<"year" | "month" | "today" | "custom">("year");
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = React.useState<{ from?: string; to?: string }>({});

  const queryArgs: any = {
    recruiterId: recruiterId!,
    year: currentYear,
    filterBy: timeFilter,
  };
  if (timeFilter === "month") queryArgs.month = selectedMonth;
  if (timeFilter === "custom") {
    if (customRange.from) queryArgs.fromDate = customRange.from;
    if (customRange.to) queryArgs.toDate = customRange.to;
  }

  const { data, isLoading, error } = useGetRecruiterPerformanceQuery(
    queryArgs,
    { skip: !recruiterId || recruiterId === "all" },
  );

  // ── Derived data ───────────────────────────────────────────────
  const { chartData, totals, funnelData } = useMemo(() => {
    if (!data?.data) return { chartData: [], totals: {} as Record<string, number>, funnelData: [] };

    const rows = data.data.map((item: any) => ({
      ...item,
      monthLabel: `${item.month.substring(0, 3)} '${item.year.toString().slice(-2)}`,
    }));

    const t: Record<string, number> = {};
    for (const m of METRICS) {
      t[m.key] = rows.reduce((s: number, r: any) => s + (r[m.key] || 0), 0);
    }

    // Funnel data for the horizontal progress section
    const maxVal = Math.max(...Object.values(t), 1);
    const funnel = METRICS.map((m) => ({
      ...m,
      value: t[m.key],
      pct: Math.round((t[m.key] / maxVal) * 100),
    }));

    return { chartData: rows, totals: t, funnelData: funnel };
  }, [data]);

  // ── Empty / loading / error states ─────────────────────────────
  if (!recruiterId || recruiterId === "all") {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50/30 overflow-hidden">
        <CardContent className="h-[280px] flex flex-col items-center justify-center text-slate-400 space-y-4">
          <div className="p-5 bg-white rounded-2xl shadow-sm">
            <UserCircle2 className="h-14 w-14 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-500">Performance Trend</p>
            <p className="text-sm text-slate-400 mt-1">Select a recruiter to view their performance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/90 overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg" />
            <div className="h-10 w-36 bg-slate-200 animate-pulse rounded-lg" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-[260px] w-full bg-slate-100 animate-pulse rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="border-0 shadow-lg bg-red-50/50 overflow-hidden">
        <CardContent className="h-[280px] flex items-center justify-center text-red-500">
          <p className="font-medium">Failed to load performance data.</p>
        </CardContent>
      </Card>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="border-0 shadow-lg bg-white/90 overflow-hidden">
        {/* ── Header + filters ────────────────────────────────── */}
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Performance Overview
                </CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {recruiterName || "Recruiter"} &bull; {timeFilter === "year" ? currentYear : timeFilter === "month" ? `Month ${selectedMonth}, ${currentYear}` : timeFilter === "today" ? "Today" : "Custom Range"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
                <SelectTrigger className="w-36 h-9 bg-gray-50 border-gray-200 rounded-lg text-sm">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {timeFilter === "month" && (
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-20 h-9 px-2 border border-gray-200 rounded-lg text-sm"
                />
              )}

              {timeFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customRange.from || ""}
                    onChange={(e) => setCustomRange((p) => ({ ...p, from: e.target.value }))}
                    className="h-9 px-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    value={customRange.to || ""}
                    onChange={(e) => setCustomRange((p) => ({ ...p, to: e.target.value }))}
                    className="h-9 px-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-5">
          {/* ── Pipeline funnel cards ─────────────────────────── */}
          <div className="grid grid-cols-5 gap-2">
            {funnelData.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`relative rounded-xl border ${m.border} ${m.bg} p-3 flex flex-col items-center gap-1.5 overflow-hidden`}
                >
                  {/* progress bar background */}
                  <div
                    className={`absolute bottom-0 left-0 h-1 ${m.bar} rounded-full transition-all`}
                    style={{ width: `${m.pct}%` }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${m.text}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${m.text}`}>{m.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{m.value}</p>
                  {i < funnelData.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 z-10 hidden sm:block" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* ── Conversion badges ────────────────────────────── */}
          {totals["registered"] > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs font-medium text-emerald-700 border-emerald-200 bg-emerald-50">
                Doc Verified: {Math.round((totals["documentVerified"] / totals["registered"]) * 100)}%
              </Badge>
              <Badge variant="outline" className="text-xs font-medium text-amber-700 border-amber-200 bg-amber-50">
                Shortlisted: {Math.round((totals["shortlisted"] / totals["registered"]) * 100)}%
              </Badge>
              <Badge variant="outline" className="text-xs font-medium text-violet-700 border-violet-200 bg-violet-50">
                Interview Passed: {Math.round((totals["interviewPassed"] / totals["registered"]) * 100)}%
              </Badge>
              <Badge variant="outline" className="text-xs font-medium text-pink-700 border-pink-200 bg-pink-50">
                Deployed: {Math.round((totals["deployed"] / totals["registered"]) * 100)}%
              </Badge>
            </div>
          )}

          {/* ── Grouped Bar Chart ────────────────────────────── */}
          <div className="bg-gray-50/50 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  iconType="square"
                  iconSize={10}
                  formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>}
                />
                {METRICS.map((m) => (
                  <Bar key={m.key} dataKey={m.key} name={m.label} fill={m.color} radius={[3, 3, 0, 0]} maxBarSize={18} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
