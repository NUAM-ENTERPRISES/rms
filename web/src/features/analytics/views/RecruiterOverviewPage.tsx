import { useMemo, useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
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
        <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
          <div className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600 shadow-lg shadow-indigo-500/30">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Analytics Dashboard
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Recruiter Analysis
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Real-time insights into hiring pipeline
                  </p>
                </div>
              </div>

              {/* Year Selector - Applies to all data */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:border-gray-700 min-w-[100px]"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Banner */}
            {hasError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-3">
                <div className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading data: {error}
                </div>
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
          <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
            <div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <h3 className="text-lg font-semibold text-gray-700 px-4">
                    Individual Recruiter Analysis
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>

                {/* Recruiter Selector - Only affects this section */}
                <div className="flex flex-col gap-1.5 sm:min-w-[200px]">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Select Recruiter
                  </label>
                  <select
                    value={selectedRecruiterId}
                    onChange={(e) => setSelectedRecruiterId(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  >
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* KPI Cards - Show selected recruiter metrics */}
              {selectedRecruiter && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                      { label: "Total Recruiters", value: metrics.recruiters, icon: Users, color: "indigo" },
                      { label: "Candidates Assigned", value: metrics.assigned, icon: UserCheck, color: "blue" },
                      { label: "Candidates Joined", value: metrics.joined, icon: CheckCircle, color: "green" },
                      { label: "Untouched Profiles", value: metrics.untouched, icon: AlertTriangle, color: "red" },
                      { label: "Conversion Rate", value: `${metrics.conversion}%`, icon: TrendingUp, color: "purple" },
                    ].map((item, index) => (
                      <KpiCard
                        key={index}
                        label={item.label}
                        value={item.value}
                        icon={item.icon}
                        color={item.color}
                        index={index}
                      />
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
