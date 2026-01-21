"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CheckCircle2,
  Filter,
  Award,
  AlertTriangle,
  Users,
  BarChart3,
  Download,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ────────────────────────────────────────────────
// Replace these with real data (from API / context / props)
// ────────────────────────────────────────────────
const interviews = [];     // ← put your Interview[] here
const screenings = [];     // ← put your Screening[] here

// ────────────────────────────────────────────────
// Colors
// ────────────────────────────────────────────────
const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#94a3b8", "#6366f1", "#8b5cf6"];

export default function InterviewAnalytics() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("all");

  const years = useMemo(() => {
    const allYears = [...interviews, ...screenings].map((item) =>
      new Date(item.scheduledTime).getFullYear()
    );
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  }, []);

  const months = [
    { value: "all", label: "All Months" },
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const coordinators = useMemo(() => {
    return Array.from(new Set(screenings.map((s) => s.coordinator))).sort();
  }, []);

  const coordinatorOptions = useMemo(() => {
    return [
      { value: "all", label: "All Coordinators" },
      ...coordinators.map((name) => ({ value: name, label: name })),
    ];
  }, [coordinators]);

  // Filtered data
  const filteredInterviews = useMemo(() => {
    return interviews.filter((i) => {
      const date = new Date(i.scheduledTime);
      return (
        date.getFullYear() === selectedYear &&
        (selectedMonth === "all" || date.getMonth() + 1 === selectedMonth)
      );
    });
  }, [selectedYear, selectedMonth]);

  const filteredScreenings = useMemo(() => {
    let data = screenings;
    if (selectedCoordinator !== "all") {
      data = data.filter((s) => s.coordinator === selectedCoordinator);
    }
    return data.filter((s) => {
      const date = new Date(s.scheduledTime);
      return (
        date.getFullYear() === selectedYear &&
        (selectedMonth === "all" || date.getMonth() + 1 === selectedMonth)
      );
    });
  }, [selectedCoordinator, selectedYear, selectedMonth]);

  // Calculations
  const attempted = filteredInterviews.length + filteredScreenings.length;
  const passedInterviews = filteredInterviews.filter((i) =>
    ["passed", "selected", "approved"].includes(i.outcome || "")
  ).length;
  const approvedScreenings = filteredScreenings.filter((s) => s.decision === "approved").length;
  const totalPassed = passedInterviews + approvedScreenings;
  const rejected =
    filteredInterviews.filter((i) => i.outcome === "rejected").length +
    filteredScreenings.filter((s) => s.decision === "rejected").length;
  const passRate = attempted > 0 ? Math.round((totalPassed / attempted) * 100) : 0;

  const outcomeDistribution = [
    { name: "Passed / Approved", value: totalPassed, fill: "#22c55e" },
    { name: "Rejected", value: rejected, fill: "#ef4444" },
    { name: "Needs Training", value: filteredScreenings.filter((s) => s.decision === "needs_training").length, fill: "#f59e0b" },
    { name: "Pending / Other", value: attempted - totalPassed - rejected, fill: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const monthlyStats = useMemo(() => {
    const map = new Map();
    [...filteredInterviews, ...filteredScreenings].forEach((item) => {
      const date = new Date(item.scheduledTime);
      const key = date.toLocaleString("default", { month: "short", year: "numeric" });
      if (!map.has(key)) map.set(key, { attempted: 0, passed: 0, rejected: 0 });
      const entry = map.get(key);
      entry.attempted++;
      const isPassed =
        ("outcome" in item && ["passed", "selected", "approved"].includes(item.outcome)) ||
        ("decision" in item && item.decision === "approved");
      const isRejected =
        ("outcome" in item && item.outcome === "rejected") ||
        ("decision" in item && item.decision === "rejected");
      if (isPassed) entry.passed++;
      if (isRejected) entry.rejected++;
    });
    return Array.from(map, ([month, values]) => ({
      month,
      attempted: values.attempted,
      passed: values.passed,
      rejected: values.rejected,
    })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [filteredInterviews, filteredScreenings]);

  const topCoordinators = useMemo(() => {
    const map = new Map();
    screenings.forEach((s) => {
      if (!map.has(s.coordinator)) map.set(s.coordinator, { approved: 0, total: 0 });
      const entry = map.get(s.coordinator);
      entry.total++;
      if (s.decision === "approved") entry.approved++;
    });
    return Array.from(map, ([name, { approved, total }]) => ({
      name,
      approved,
      total,
      rate: total > 0 ? Math.round((approved / total) * 100) : 0,
    }))
      .sort((a, b) => b.rate - a.rate || b.approved - a.approved)
      .slice(0, 5);
  }, []);

  const rejectionReasons = useMemo(() => {
    const map = new Map();
    [...filteredInterviews, ...filteredScreenings].forEach((item) => {
      const reason = item.rejectionReason;
      if (
        reason &&
        (("outcome" in item && item.outcome === "rejected") ||
          ("decision" in item && item.decision === "rejected"))
      ) {
        map.set(reason, (map.get(reason) || 0) + 1);
      }
    });
    return Array.from(map, ([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredInterviews, filteredScreenings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-6 px-4 md:px-6">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header - smaller */}
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-lg">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-20 blur" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-md">
                    <Award className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-600 ring-1 ring-indigo-700/10">
                      Live
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Intelligence System
                    </p>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Interview & Screening Analytics
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pipeline visibility for <span className="text-indigo-600">{selectedYear}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black uppercase text-slate-400">Report</span>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="h-9 w-28 rounded-xl text-sm">
                      <Calendar className="mr-1.5 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black uppercase text-slate-400">Timeframe</span>
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(v === "all" ? "all" : Number(v))}>
                    <SelectTrigger className="h-9 w-36 rounded-xl text-sm">
                      <Filter className="mr-1.5 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="sm" className="h-9 rounded-xl px-4 text-sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Coordinator Filter - smaller */}
        <Card className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-lg">
          <div className="absolute -left-10 -top-10 h-20 w-20 rounded-full bg-indigo-500/10 blur-xl" />
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Assignment Filter</p>
                  <h3 className="text-xl font-bold text-slate-900">Interview Coordinator</h3>
                  <p className="text-xs text-slate-500">Team performance filter</p>
                </div>
              </div>

              <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue placeholder="All Coordinators" />
                </SelectTrigger>
                <SelectContent>
                  {coordinatorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KPI + Monthly Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KPI tiles - more compact */}
          <Card className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-lg">
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />
            <CardHeader className="p-6 pb-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-md">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Summary</p>
                  <CardTitle className="text-xl">Key Metrics</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-2 gap-5">
              {[
                { 
                  title: "Attempted", 
                  value: attempted, 
                  icon: Users, 
                  gradient: "from-indigo-500 to-indigo-700",
                  border: "border-indigo-100" 
                },
                { 
                  title: "Passed", 
                  value: totalPassed, 
                  icon: CheckCircle2, 
                  gradient: "from-emerald-500 to-teal-600",
                  border: "border-emerald-100" 
                },
                { 
                  title: "Rejected", 
                  value: rejected, 
                  icon: AlertTriangle, 
                  gradient: "from-rose-500 to-red-700",
                  border: "border-rose-100" 
                },
                { 
                  title: "Pass Rate", 
                  value: `${passRate}%`, 
                  icon: TrendingUp, 
                  gradient: "from-amber-400 to-orange-600",
                  border: "border-amber-100" 
                },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "group relative overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all duration-300",
                    "rounded-[1.75rem] border bg-white/50 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:bg-white",
                    item.border
                  )}
                >
                  {/* Dynamic Gradient Icon Background */}
                  <div className={cn(
                    "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br text-white",
                    item.gradient
                  )}>
                    <item.icon className="h-6 w-6" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-3xl font-black tracking-tight text-slate-900">
                      {item.value}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {item.title}
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-2 -right-2 text-6xl font-black text-slate-900/[0.03] select-none italic">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Monthly Bar Chart - smaller height */}
          <Card className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-lg">
            <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-md">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Monthly</p>
                    <CardTitle className="text-xl">Performance</CardTitle>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-72 rounded-2xl bg-white/50 p-3 border border-white/60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="attempted" fill="#6366f1" radius={4} barSize={16} />
                    <Bar dataKey="passed" fill="#10b981" radius={4} barSize={16} />
                    <Bar dataKey="rejected" fill="#f43f5e" radius={4} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outcome + Rejection Reasons - smaller height */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outcome Pie */}
          <Card className="relative overflow-hidden rounded-3xl border border-purple-100/50 bg-gradient-to-br from-white via-purple-50/20 to-white backdrop-blur-xl shadow-lg">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-purple-300/10 blur-3xl" />
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-md">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Outcome Analysis</CardTitle>
                  <CardDescription className="text-xs">Status breakdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-80 rounded-2xl bg-gradient-to-b from-purple-50/30 to-white/50 p-4 border border-purple-100/30">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={outcomeDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                    >
                      {outcomeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Rejection Reasons */}
          <Card className="relative overflow-hidden rounded-3xl border border-rose-100/50 bg-gradient-to-br from-white via-rose-50/20 to-white backdrop-blur-xl shadow-lg">
            <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-rose-300/10 blur-3xl" />
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-red-600 shadow-md">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Rejection Insights</CardTitle>
                  <CardDescription className="text-xs">Main rejection reasons</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-80 rounded-2xl bg-gradient-to-b from-rose-50/30 to-white/50 p-4 border border-rose-100/30">
                <ResponsiveContainer>
                  <BarChart data={rejectionReasons} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="reason" tick={{ fontSize: 10 }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={24}>
                      <LabelList dataKey="count" position="right" offset={8} className="fill-rose-700 text-xs font-bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}