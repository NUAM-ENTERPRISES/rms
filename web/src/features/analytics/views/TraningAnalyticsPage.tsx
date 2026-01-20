"use client";

import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

import {
  Briefcase,
  Video,
  TrendingUp,
  Target,
  Award,
  CheckCircle2,
  Clock,
  PieChart as PieChartIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

// ==================== COLOR CONFIG ====================
const COLOR_CONFIG = {
  indigo: { gradientFrom: "from-indigo-50", gradientTo: "to-indigo-100/50", text: "text-indigo-600", iconBg: "bg-indigo-200/40", iconText: "text-indigo-600", darkText: "dark:text-indigo-400" },
  emerald: { gradientFrom: "from-emerald-50", gradientTo: "to-emerald-100/50", text: "text-emerald-600", iconBg: "bg-emerald-200/40", iconText: "text-emerald-600", darkText: "dark:text-emerald-400" },
  amber: { gradientFrom: "from-amber-50", gradientTo: "to-amber-100/50", text: "text-amber-600", iconBg: "bg-amber-200/40", iconText: "text-amber-600", darkText: "dark:text-amber-400" },
  teal: { gradientFrom: "from-teal-50", gradientTo: "to-teal-100/50", text: "text-teal-600", iconBg: "bg-teal-200/40", iconText: "text-teal-600", darkText: "dark:text-teal-400" },
  purple: { gradientFrom: "from-purple-50", gradientTo: "to-purple-100/50", text: "text-purple-600", iconBg: "bg-purple-200/40", iconText: "text-purple-600", darkText: "dark:text-purple-400" },
} as const;

type ColorKey = keyof typeof COLOR_CONFIG;

// ==================== KPI CARD ====================
type KpiCardProps = {
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: ColorKey;
  index: number;
  trend?: string;
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, color, index, trend }) => {
  const colors = COLOR_CONFIG[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className={`border-0 shadow-lg overflow-hidden bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} backdrop-blur-sm hover:shadow-2xl transition-all duration-300`}>
        <CardContent className="pt-7 pb-6 px-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
              <h3 className={`text-4xl font-extrabold ${colors.text} ${colors.darkText}`}>{value}</h3>
              {trend && <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-2">{trend}</p>}
            </div>
            <div className={`p-4 rounded-2xl ${colors.iconBg}`}>
              <Icon className={`h-8 w-8 ${colors.iconText} ${colors.darkText}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ---------------- MOCK PER-CANDIDATE DATA ---------------- */
const candidateData = {
  "Alex Chen": {
    assignments: 6,
    completed: 6,
    daysToComplete: 18,
    videoPct: 100,
    trend: [
      { month: "Jul", assigned: 1, completed: 1 },
      { month: "Aug", assigned: 1, completed: 1 },
      { month: "Sep", assigned: 1, completed: 1 },
      { month: "Oct", assigned: 1, completed: 1 },
      { month: "Nov", assigned: 1, completed: 1 },
      { month: "Dec", assigned: 1, completed: 1 },
    ],
    outcome: "Ready for Role",
    skills: {
      "Technical Proficiency": 95,
      "Communication": 90,
      "Problem Solving": 88,
      "Team Collaboration": 96,
    },
  },
  "Maria Garcia": {
    assignments: 5,
    completed: 4,
    daysToComplete: 24,
    videoPct: 80,
    trend: [
      { month: "Jul", assigned: 0, completed: 0 },
      { month: "Aug", assigned: 1, completed: 1 },
      { month: "Sep", assigned: 1, completed: 1 },
      { month: "Oct", assigned: 1, completed: 1 },
      { month: "Nov", assigned: 1, completed: 0 },
      { month: "Dec", assigned: 1, completed: 1 },
    ],
    outcome: "Ready for Role",
    skills: {
      "Technical Proficiency": 90,
      "Communication": 85,
      "Problem Solving": 82,
      "Team Collaboration": 92,
    },
  },
  "James Liu": {
    assignments: 4,
    completed: 3,
    daysToComplete: 32,
    videoPct: 75,
    trend: [
      { month: "Jul", assigned: 0, completed: 0 },
      { month: "Aug", assigned: 0, completed: 0 },
      { month: "Sep", assigned: 1, completed: 1 },
      { month: "Oct", assigned: 1, completed: 1 },
      { month: "Nov", assigned: 1, completed: 0 },
      { month: "Dec", assigned: 1, completed: 1 },
    ],
    outcome: "Needs More Training",
    skills: {
      "Technical Proficiency": 85,
      "Communication": 80,
      "Problem Solving": 78,
      "Team Collaboration": 88,
    },
  },
  "Sofia Patel": {
    assignments: 3,
    completed: 3,
    daysToComplete: 15,
    videoPct: 100,
    trend: [
      { month: "Jul", assigned: 0, completed: 0 },
      { month: "Aug", assigned: 0, completed: 0 },
      { month: "Sep", assigned: 0, completed: 0 },
      { month: "Oct", assigned: 1, completed: 1 },
      { month: "Nov", assigned: 1, completed: 1 },
      { month: "Dec", assigned: 1, completed: 1 },
    ],
    outcome: "Ready for Role",
    skills: {
      "Technical Proficiency": 93,
      "Communication": 92,
      "Problem Solving": 90,
      "Team Collaboration": 95,
    },
  },
};

/* ---------------- MAIN PAGE ---------------- */
export default function TrainingAnalyticsPage() {
  const candidates = useMemo(() => Object.keys(candidateData).sort(), []);

  const [selectedCandidate, setSelectedCandidate] = useState<string>(candidates[0]);

  const data = candidateData[selectedCandidate];

  const completionRate = Math.round((data.completed / data.assignments) * 100);

  const trainingTrend = data.trend;

  const skillImprovement = Object.entries(data.skills).map(([skill, improvement]) => ({
    skill,
    improvement,
  }));

  const trainingModeData = [
    { name: "Video", value: data.videoPct, fill: "#14b8a6" },
    { name: "In-Person", value: 100 - data.videoPct, fill: "#e2e8f0" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* Header + Candidate Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <PieChartIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Screening Analytics
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                Individual candidate training performance and skill development
              </p>
            </div>
          </div>

          <div className="w-full sm:w-80">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Candidate
            </label>
            <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs - Rating removed, Time to Complete added */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Trainings", value: data.assignments, icon: Briefcase, color: "indigo" },
            { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle2, color: "emerald" },
            { label: "Time to Complete", value: `${data.daysToComplete} days`, icon: Clock, color: "amber" },
            { label: "Video Training", value: `${data.videoPct}%`, icon: Video, color: "teal" },
          ].map((item, index) => (
            <KpiCard key={index} {...item} index={index} />
          ))}
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Training Progress Over Time */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Training Progress Over Time
                <span className="text-sm font-normal text-gray-500 ml-2">({selectedCandidate})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trainingTrend}>
                  <defs>
                    <linearGradient id="trainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} fill="url(#trainGrad)" name="Completed" />
                  <Area type="monotone" dataKey="assigned" stroke="#6366f1" strokeWidth={2} fillOpacity={0.2} fill="#6366f1" name="Assigned" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Training Outcome */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Training Outcome</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[320px]">
              <div className="text-center">
                <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.outcome}
                </p>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                  {selectedCandidate}'s final readiness assessment
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Skill Improvement */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-teal-600" />
                Skill Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={skillImprovement}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                  <XAxis dataKey="skill" tick={{ fontSize: 11, angle: -20, textAnchor: "end" }} height={70} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="improvement" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Training Mode */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">
                Training Delivery Mode
                <span className="block text-sm font-normal text-gray-500 mt-1">
                  {selectedCandidate}'s preference
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <ResponsiveContainer width="100%" height={280}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="50%" outerRadius="90%" data={trainingModeData}>
                  <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "#f1f5f9" }} />
                  <text x="50%" y="45%" textAnchor="middle" className="text-5xl font-bold fill-teal-600 dark:fill-teal-400">
                    {data.videoPct}%
                  </text>
                  <text x="50%" y="55%" textAnchor="middle" className="text-sm fill-gray-600 dark:fill-gray-400">
                    Video Training
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Summary - Updated with new metric */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <p className="text-2xl font-bold text-purple-600">{selectedCandidate}</p>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                  {data.outcome === "Ready for Role" ? "Ready to hire" : "Needs improvement"}
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sessions</span>
                  <span className="font-semibold">{data.assignments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-emerald-600">{data.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time to Complete</span>
                  <span className="font-semibold text-amber-600">{data.daysToComplete} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}