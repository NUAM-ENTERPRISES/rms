"use client";

import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Briefcase,
  Users,
  TrendingUp,
  UserCheck,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/features/analytics/components/KpiCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------------- MOCK DATA ---------------- */
const interviews = [
  { date: "Jan 01", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 02", interviewer: "Sarah Chen", mode: "video" },
  { date: "Jan 03", interviewer: "John Doe", mode: "in-person" },
  { date: "Jan 04", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 05", interviewer: "Emma Wilson", mode: "video" },
  { date: "Jan 06", interviewer: "Michael Brown", mode: "video" },
  { date: "Jan 07", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 08", interviewer: "Sarah Chen", mode: "video" },
  { date: "Jan 09", interviewer: "John Doe", mode: "video" },
  { date: "Jan 10", interviewer: "Alex Rivera", mode: "in-person" },
  { date: "Jan 11", interviewer: "Emma Wilson", mode: "video" },
  { date: "Jan 12", interviewer: "Michael Brown", mode: "video" },
  { date: "Jan 13", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 14", interviewer: "Olivia Martinez", mode: "video" },
  { date: "Jan 15", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 16", interviewer: "Sarah Chen", mode: "in-person" },
  { date: "Jan 17", interviewer: "John Doe", mode: "video" },
  { date: "Jan 18", interviewer: "Emma Wilson", mode: "video" },
  { date: "Jan 19", interviewer: "Michael Brown", mode: "video" },
  { date: "Jan 20", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 21", interviewer: "Olivia Martinez", mode: "video" },
  { date: "Jan 22", interviewer: "Sarah Chen", mode: "video" },
  { date: "Jan 23", interviewer: "John Doe", mode: "in-person" },
  { date: "Jan 24", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 25", interviewer: "Emma Wilson", mode: "video" },
  { date: "Jan 26", interviewer: "Michael Brown", mode: "video" },
  { date: "Jan 27", interviewer: "Alex Rivera", mode: "video" },
  { date: "Jan 28", interviewer: "Olivia Martinez", mode: "video" },
  { date: "Jan 29", interviewer: "Sarah Chen", mode: "video" },
  { date: "Jan 30", interviewer: "John Doe", mode: "video" },
  { date: "Jan 31", interviewer: "Alex Rivera", mode: "in-person" },
];

const statusHistory = [
  { status: "Scheduled", value: 45, color: "#94a3b8" },
  { status: "Completed", value: 38, color: "#6366f1" },
  { status: "Selected", value: 12, color: "#22c55e" },
  { status: "Rejected", value: 18, color: "#ef4444" },
];

/* ---------------- MAIN COMPONENT ---------------- */
export default function CEOInterviewAnalyticsPage() {
  const interviewers = useMemo(() => {
    return Array.from(new Set(interviews.map((i) => i.interviewer))).sort();
  }, []);

  const [selectedInterviewer, setSelectedInterviewer] = useState<string>(interviewers[0]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((i) => i.interviewer === selectedInterviewer);
  }, [selectedInterviewer]);

  const total = filteredInterviews.length;
  const videoCount = filteredInterviews.filter((i) => i.mode === "video").length;
  const videoPct = total > 0 ? Math.round((videoCount / total) * 100) : 0;

  const interviewTrend = useMemo(() => {
    const sorted = [...filteredInterviews].sort((a, b) => a.date.localeCompare(b.date));
    const cumulative = [];
    let count = 0;
    for (let i = 0; i < sorted.length; i++) {
      count++;
      if (i === 0 || sorted[i].date !== sorted[i - 1].date) {
        cumulative.push({ date: sorted[i].date, cumulative: count });
      }
    }
    return cumulative;
  }, [filteredInterviews]);

  const interviewerPerf = [{ name: selectedInterviewer, value: total }];

  const modeData = [
    { name: "Video", value: videoPct, fill: "#6366f1" },
    { name: "In-Person", value: 100 - videoPct, fill: "#e2e8f0" },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6 py-2">
        {/* Header */}
        <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
          <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 shadow-lg shadow-purple-500/30">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Analytics Dashboard
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Interview Analytics
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Individual interviewer performance dashboard
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-80">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Interviewer
                </label>
                <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewers.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Total Interviews", value: total, icon: Briefcase, color: "indigo", compact: true },
                { label: "Interviewer", value: selectedInterviewer, icon: Users, color: "purple", compact: true },
                { label: "Hiring Momentum", value: "Strong", icon: TrendingUp, color: "green", trend: "↑ 35% YoY", compact: true },
              ].map((item, index) => (
                <KpiCard key={index} label={item.label} value={item.value} icon={item.icon} color={item.color} index={index} compact={item.compact} />
              ))}
            </div>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Interview Volume Growth
                <span className="text-sm font-normal text-gray-500 ml-2">({selectedInterviewer})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={interviewTrend}>
                  <defs>
                    <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  <Area type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={3} fill="url(#growth)" dot={{ fill: "#6366f1", r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Pipeline Outcome Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusHistory}
                    dataKey="value"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={6}
                    labelLine={false}
                    label={({ status, value }) => `${status}: ${value}`}
                  >
                    {statusHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 text-sm mt-[50px]">
                {statusHistory.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600 dark:text-gray-400">{item.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Daily Velocity */}
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Daily Interview Velocity (Cumulative)
              <span className="text-sm font-normal text-gray-500 ml-2">({selectedInterviewer})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={interviewTrend}>
                <CartesianGrid strokeDasharray="5 5" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Line type="stepAfter" dataKey="cumulative" stroke="#10b981" strokeWidth={4} dot={{ fill: "#10b981", r: 6 }} activeDot={{ r: 9 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}