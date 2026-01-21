import { useMemo, useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

import { KpiCard } from "@/features/analytics/components/KpiCard";
import { PipelineBarChart } from "@/features/analytics/components/PipelineBarChart";
import { StatusDistributionPieChart } from "@/features/analytics/components/StatusDistributionPieChart";
import { TimeToStatusChart } from "@/features/analytics/components/TimeToStatusChart";
import { PerformanceTrendChart } from "@/features/analytics/components/PerformanceTrendChart";
import { RecruiterPerformanceTable } from "@/features/analytics/components/RecruiterPerformanceTable";
import { PerformanceScorecard } from "@/features/analytics/components/PerformanceScorecard";
import { CandidateMetrics } from "@/features/analytics/components/CandidateMetrics";
import { WorkloadDistributionChart } from "@/features/analytics/components/WorkloadDistributionChart";
import {
  useGetRecruiterStatsQuery,
  useGetRecruiterPerformanceQuery,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";
const formatDuration = (days: number) => {
  if (!days || days <= 0) return "0d 0h 0m";

  const totalMinutes = Math.round(days * 24 * 60);
  const d = Math.floor(totalMinutes / (24 * 60));
  const h = Math.floor((totalMinutes % (24 * 60)) / 60);
  const m = totalMinutes % 60;

  return `${d}d ${h}h ${m}m`;
};

type RecruiterStats = {
  id: string;
  name: string;
  email: string;
  // Project-level metrics
  assigned: number;
  screening: number;
  interview: number;
  selected: number;
  joined: number;
  untouched: number;
  // Candidate-level metrics
  totalCandidates: number;
  candidatesUntouched: number;
  candidatesInterested: number;
  candidatesNotInterested: number;
  candidatesRNR: number;
  candidatesQualified: number;
  candidatesWorking: number;
  candidatesOnHold: number;
  candidatesOtherEnquiry: number;
  candidatesFuture: number;
  candidatesNotEligible: number;
  // Average time metrics
  avgScreeningDays: number;
  avgTimeToFirstTouch: number;
  avgDaysToInterested: number;
  avgDaysToNotInterested: number;
  avgDaysToNotEligible: number;
  avgDaysToOtherEnquiry: number;
  avgDaysToFuture: number;
  avgDaysToOnHold: number;
  avgDaysToRNR: number;
  avgDaysToQualified: number;
  avgDaysToWorking: number;
};

type MonthlyPerformance = {
  month: string;
  year: number;
  assigned: number;
  screening: number;
  interview: number;
  selected: number;
  joined: number;
};

const RecruiterOverviewPage: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>("");

  // Fetch recruiter stats using RTK Query
  const {
    data: recruitersResponse,
    isLoading: recruitersLoading,
    error: recruitersError,
  } = useGetRecruiterStatsQuery({ year: selectedYear });

  const recruiters: RecruiterStats[] = recruitersResponse?.data || [];

  // Fetch performance data using RTK Query
  const {
    data: performanceResponse,
    isLoading: performanceLoading,
  } = useGetRecruiterPerformanceQuery(
    {
      recruiterId: selectedRecruiterId,
      year: selectedYear,
    },
    { skip: !selectedRecruiterId }
  );

  const performanceData: MonthlyPerformance[] = performanceResponse?.data || [];

  const loading = recruitersLoading || performanceLoading;
  const error = recruitersError
    ? "message" in recruitersError
      ? recruitersError.message
      : "Failed to load recruiter data"
    : null;

  // Auto-select first recruiter when data loads
  useEffect(() => {
    if (recruiters.length > 0) {
      if (!selectedRecruiterId || !recruiters.find((r) => r.id === selectedRecruiterId)) {
        setSelectedRecruiterId(recruiters[0].id);
      }
    } else {
      setSelectedRecruiterId("");
    }
  }, [recruiters, selectedRecruiterId]);

  // Find the selected recruiter object
  const selectedRecruiter = useMemo(() => {
    return recruiters.find((r) => r.id === selectedRecruiterId) || null;
  }, [selectedRecruiterId, recruiters]);

  // Metrics for selected recruiter (not all recruiters)
  const metrics = useMemo(() => {
    if (!selectedRecruiter) {
      return {
        recruiters: recruiters.length,
        assigned: 0,
        joined: 0,
        untouched: 0,
        conversion: 0,
      };
    }

    return {
      recruiters: recruiters.length,
      assigned: selectedRecruiter.assigned,
      joined: selectedRecruiter.joined,
      untouched: selectedRecruiter.untouched,
      conversion: selectedRecruiter.assigned > 0 
        ? Math.round((selectedRecruiter.joined / selectedRecruiter.assigned) * 100) 
        : 0,
    };
  }, [selectedRecruiter, recruiters.length]);

  // Pie data for selected recruiter only
  const pieData = useMemo(() => {
    if (!selectedRecruiter) {
      return [
        { name: "Assigned", value: 0 },
        { name: "In Screening", value: 0 },
        { name: "In Interview", value: 0 },
        { name: "Selected", value: 0 },
        { name: "Joined", value: 0 },
      ];
    }

    return [
      { name: "Assigned", value: selectedRecruiter.assigned },
      { name: "In Screening", value: selectedRecruiter.screening },
      { name: "In Interview", value: selectedRecruiter.interview },
      { name: "Selected", value: selectedRecruiter.selected },
      { name: "Joined", value: selectedRecruiter.joined },
    ];
  }, [selectedRecruiter]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto w-full space-y-6 py-2">
          <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
            <div className="p-5">
              <div className="text-center py-12">
                <div className="text-lg font-medium text-slate-600">
                  Loading recruiter analytics...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State - Show error banner but still render components
  const hasError = !!error;

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6 py-2">
        {/* Header */}
  <div className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(79,70,229,0.07)]">
  
  {/* Subtle Accent Glow */}
  <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

  <div className="p-4 sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

      {/* Branding & Title */}
      <div className="flex items-start gap-3">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-25 blur transition duration-1000 group-hover:opacity-50" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 shadow-xl">
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-700/10">
              Live
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Analytics Dashboard
            </p>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Recruiter Analysis
          </h2>

          <p className="text-xs font-medium text-slate-500/80">
            Real-time insights into hiring pipeline performance
          </p>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="flex items-center gap-3">
        <div className="group flex flex-col items-end gap-0.5">
          <span className="mr-1 text-[10px] font-bold uppercase text-slate-400">
            Fiscal Period
          </span>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="min-w-[110px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                <option key={year} value={year}>
                  {year} Report
                </option>
              ))}
            </select>

            {/* Custom Arrow Icon */}
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Error Banner */}
    {hasError && (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3 text-red-800 animate-in fade-in slide-in-from-top-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-4 w-4 text-red-600" />
        </div>
        <p className="text-xs font-semibold">
          Error loading data: {error}
        </p>
      </div>
    )}
  </div>
</div>


        {/* ============================================ */}
        {/* TEAM OVERVIEW SECTION - All Recruiters */}
        {/* ============================================ */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <h3 className="text-lg font-semibold text-gray-700 px-4">
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>

          {/* Recruiter Performance Comparison Table */}
          {recruiters.length > 0 && (
            <RecruiterPerformanceTable recruiters={recruiters} />
          )}

          {/* Workload Distribution (without histogram) */}
          {recruiters.length > 0 && (
            <WorkloadDistributionChart recruiters={recruiters} />
          )}
        </div>

        {/* ============================================ */}
        {/* INDIVIDUAL RECRUITER ANALYSIS SECTION */}
        {/* ============================================ */}
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all">
  <div className="p-6 sm:p-8">
    {/* Header & Selector Row */}
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200">
          <UserCheck className="h-7 w-7" />
          <div className="absolute -inset-1 rounded-2xl bg-indigo-600 opacity-20 blur-sm" />
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-800">
            Individual Recruiter Analysis
          </h3>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Performance deep-dive & metrics
          </p>
        </div>
        <div className="hidden xl:block h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent ml-6" />
      </div>

      {/* Enhanced Recruiter Selector */}
      <div className="flex flex-col gap-2 sm:min-w-[280px]">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 ml-1">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Active Recruiter Focus
        </label>
        <div className="relative group">
          <select
            value={selectedRecruiterId}
            onChange={(e) => setSelectedRecruiterId(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
          >
            <option value="" disabled>Select a profile...</option>
            {recruiters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-hover:text-indigo-500" />
          </div>
        </div>
      </div>
    </div>

    {/* KPI Cards Section */}
    {selectedRecruiter && (
      <div className="mt-10 pt-8 border-t border-slate-100/80 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            { label: "Team Size", value: metrics.recruiters, icon: Users, color: "indigo", theme: "bg-indigo-50 text-indigo-600" },
            { label: "Assigned", value: metrics.assigned, icon: UserCheck, color: "blue", theme: "bg-blue-50 text-blue-600" },
            { label: "Joined", value: metrics.joined, icon: CheckCircle, color: "green", theme: "bg-emerald-50 text-emerald-600" },
            { label: "Untouched", value: metrics.untouched, icon: AlertTriangle, color: "red", theme: "bg-rose-50 text-rose-600" },
            { label: "Conversion", value: `${metrics.conversion}%`, icon: TrendingUp, color: "purple", theme: "bg-purple-50 text-purple-600" },
          ].map((item, index) => (
            <div 
              key={index} 
              className="group relative flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-indigo-100"
            >
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3",
                item.theme
              )}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</h4>
              </div>
              
              {/* Subtle decorative element for each card */}
              <div className="absolute right-4 top-4 h-1 w-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>

          {/* Individual Recruiter Charts */}
          {selectedRecruiter ? (
            <>
              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PipelineBarChart
                  recruiters={recruiters}
                  selectedRecruiterId={selectedRecruiterId}
                />
                <StatusDistributionPieChart 
                  pieData={pieData} 
                  recruiterName={selectedRecruiter.name}
                />
              </div>

              {/* Candidate-Level Analytics */}
              <CandidateMetrics
                recruiter={selectedRecruiter}
                allRecruiters={recruiters}
              />

              {/* Performance Scorecard (Project-Level) */}
              <PerformanceScorecard
                recruiter={selectedRecruiter}
                allRecruiters={recruiters}
              />

              {/* Time to Status Chart */}
              <TimeToStatusChart recruiter={selectedRecruiter} formatDuration={formatDuration} />

              {/* Performance Trend Over Time */}
              <PerformanceTrendChart
                recruiterId={selectedRecruiterId}
                recruiterName={selectedRecruiter.name}
                performanceData={performanceData}
              />
            </>
          ) : (
            <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50 p-12">
              <div className="text-center text-gray-500">
                <p className="text-sm font-medium">Please select a recruiter to view individual analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterOverviewPage;
