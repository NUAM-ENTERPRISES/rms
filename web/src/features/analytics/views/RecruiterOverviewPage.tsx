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
  assigned: number;
  screening: number;
  interview: number;
  selected: number;
  joined: number;
  untouched: number;
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

  const metrics = useMemo(() => {
    if (recruiters.length === 0) {
      return {
        recruiters: 0,
        assigned: 0,
        joined: 0,
        untouched: 0,
        conversion: 0,
      };
    }

    const assigned = recruiters.reduce((sum, r) => sum + r.assigned, 0);
    const joined = recruiters.reduce((sum, r) => sum + r.joined, 0);
    const untouched = recruiters.reduce((sum, r) => sum + r.untouched, 0);

    return {
      recruiters: recruiters.length,
      assigned,
      joined,
      untouched,
      conversion: assigned > 0 ? Math.round((joined / assigned) * 100) : 0,
    };
  }, [recruiters]);

  const pieData = useMemo(
    () => [
      { name: "Assigned", value: metrics.assigned },
      { name: "In Screening", value: recruiters.reduce((s, r) => s + r.screening, 0) },
      { name: "In Interview", value: recruiters.reduce((s, r) => s + r.interview, 0) },
      { name: "Selected", value: recruiters.reduce((s, r) => s + r.selected, 0) },
      { name: "Joined", value: metrics.joined },
    ],
    [metrics, recruiters]
  );

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

              {/* Year and Recruiter selectors */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                {/* Year Selector */}
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

                {/* Recruiter Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Recruiter
                  </label>
                  <select
                    value={selectedRecruiterId}
                    onChange={(e) => setSelectedRecruiterId(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:border-gray-700 min-w-[150px] sm:min-w-[180px]"
                  >
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
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

        {/* KPI Cards */}
        <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: "Active Recruiters", value: metrics.recruiters, icon: Users, color: "indigo" },
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
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recruiters.length > 0 && (
            <PipelineBarChart
              recruiters={recruiters}
              selectedRecruiterId={selectedRecruiterId}
              onRecruiterChange={setSelectedRecruiterId}
            />
          )}
          <StatusDistributionPieChart pieData={pieData} />
        </div>

        {/* Time to Status Chart */}
        {selectedRecruiter && (
          <TimeToStatusChart recruiter={selectedRecruiter} formatDuration={formatDuration} />
        )}

        {/* Performance Trend Over Time */}
        {selectedRecruiter && (
          <PerformanceTrendChart
            recruiterId={selectedRecruiterId}
            recruiterName={selectedRecruiter.name}
            performanceData={performanceData}
          />
        )}
      </div>
    </div>
  );
};

export default RecruiterOverviewPage;
