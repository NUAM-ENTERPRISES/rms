"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Briefcase,
  Users,
  Video,
  TrendingUp,
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

type Interview = {
  date: string; // e.g., "Jan 01"
  interviewer: string;
  mode: "video" | "in-person";
};

type StatusHistoryItem = {
  status: string;
  value: number;
  color: string;
};

export default function CEOInterviewAnalyticsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch interviews
        const interviewsRes = await fetch("/api/interviews/ceo-analytics");
        if (!interviewsRes.ok) throw new Error("Failed to fetch interviews");

        const interviewsData: Interview[] = await interviewsRes.json();
        setInterviews(interviewsData);

        // Fetch status history (pipeline outcomes)
        const statusRes = await fetch("/api/interviews/status-history");
        if (!statusRes.ok) throw new Error("Failed to fetch status history");

        const statusData: StatusHistoryItem[] = await statusRes.json();
        setStatusHistory(statusData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extract unique interviewers
  const interviewers = useMemo(() => {
    const unique = Array.from(new Set(interviews.map((i) => i.interviewer))).sort();
    return unique;
  }, [interviews]);

  // Auto-select first interviewer
  useEffect(() => {
    if (interviewers.length > 0 && !selectedInterviewer) {
      setSelectedInterviewer(interviewers[0]);
    }
  }, [interviewers, selectedInterviewer]);

  // Filter interviews for selected interviewer
  const filteredInterviews = useMemo(() => {
    if (!selectedInterviewer) return [];
    return interviews.filter((i) => i.interviewer === selectedInterviewer);
  }, [interviews, selectedInterviewer]);

  const total = filteredInterviews.length;
  const videoCount = filteredInterviews.filter((i) => i.mode === "video").length;
  const videoPct = total > 0 ? Math.round((videoCount / total) * 100) : 0;

  // Cumulative interview trend (for Area & Line charts)
  const interviewTrend = useMemo(() => {
    if (filteredInterviews.length === 0) return [];

    const sorted = [...filteredInterviews].sort((a, b) => a.date.localeCompare(b.date));
    const cumulative = [];
    let count = 0;
    let lastDate = "";

    for (const interview of sorted) {
      count++;
      if (interview.date !== lastDate) {
        cumulative.push({ date: interview.date, cumulative: count });
        lastDate = interview.date;
      }
    }
    return cumulative;
  }, [filteredInterviews]);

  const interviewerPerf = selectedInterviewer ? [{ name: selectedInterviewer, value: total }] : [];

  const modeData = [
    { name: "Video", value: videoPct, fill: "#6366f1" },
    { name: "In-Person", value: 100 - videoPct, fill: "#e2e8f0" },
  ];

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
          Loading interview analytics...
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  // No Data State
  if (interviews.length === 0 || interviewers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
          No interview data available
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header + Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Interview Analytics
            </h1>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
              Individual interviewer performance dashboard
            </p>
          </div>

          <div className="w-full sm:w-80">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Interviewer
            </label>
            <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an interviewer" />
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Interviews", value: total, icon: Briefcase, color: "indigo" },
            { label: "Interviewer", value: selectedInterviewer || "N/A", icon: Users, color: "purple" },
            { label: "Video Interviews", value: `${videoPct}%`, icon: Video, color: "blue" },
            { label: "Hiring Momentum", value: "Strong", icon: TrendingUp, color: "green", trend: "↑ 35% YoY" },
          ].map((item, index) => (
            <KpiCard key={index} label={item.label} value={item.value} icon={item.icon} color={item.color} index={index} />
          ))}
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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