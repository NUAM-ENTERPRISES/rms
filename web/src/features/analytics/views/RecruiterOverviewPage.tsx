import React, { useMemo, useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users as UsersRound,
} from "lucide-react";

import { KpiCard } from "@/features/analytics/components/KpiCard";
import { PipelineBarChart } from "@/features/analytics/components/PipelineBarChart";
import { StatusDistributionPieChart } from "@/features/analytics/components/StatusDistributionPieChart";
import { TimeToStatusChart } from "@/features/analytics/components/TimeToStatusChart";
import { PerformanceTrendChart } from "@/features/analytics/components/PerformanceTrendChart";

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
  const [recruiters, setRecruiters] = useState<RecruiterStats[]>([]);
  const [performanceData, setPerformanceData] = useState<MonthlyPerformance[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recruiter stats when year changes
  useEffect(() => {
    const fetchRecruiters = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/recruiters/stats?year=${selectedYear}`);
        if (!response.ok) throw new Error("Failed to fetch recruiter stats");

        const data: RecruiterStats[] = await response.json();
        setRecruiters(data);

        // Auto-select first recruiter if none selected or selected not in new list
        if (data.length > 0) {
          if (!selectedRecruiterId || !data.find((r) => r.id === selectedRecruiterId)) {
            setSelectedRecruiterId(data[0].id);
          }
        } else {
          setSelectedRecruiterId("");
          setPerformanceData([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchRecruiters();
  }, [selectedYear]);

  // Fetch performance data when recruiter or year changes
  useEffect(() => {
    if (!selectedRecruiterId) {
      setPerformanceData([]);
      return;
    }

    const fetchPerformanceData = async () => {
      try {
        const response = await fetch(
          `/api/v1/recruiters/performance?year=${selectedYear}&recruiterId=${selectedRecruiterId}`
        );
        if (!response.ok) throw new Error("Failed to fetch performance data");

        const data: MonthlyPerformance[] = await response.json();
        setPerformanceData(data);
      } catch (err) {
        console.error("Performance data fetch error:", err);
        setPerformanceData([]);
      }
    };

    fetchPerformanceData();
  }, [selectedRecruiterId, selectedYear]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
          Loading recruiter analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  if (recruiters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
          No recruiter data available
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <UsersRound className="h-9 w-9 text-indigo-600" />
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Recruiter Analysis
          </h1>
        </div>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mt-2">
          Real-time insights into hiring pipeline health and team efficiency
        </p>

        {/* Year and Recruiter selectors */}
        <div className="flex items-center gap-6 mt-4">
          {/* Year Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Recruiter Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recruiter</label>
            <select
              value={selectedRecruiterId}
              onChange={(e) => setSelectedRecruiterId(e.target.value)}
              className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
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

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        <PipelineBarChart
          recruiters={recruiters}
          selectedRecruiterId={selectedRecruiterId}
          onRecruiterChange={setSelectedRecruiterId}
        />
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
  );
};

export default RecruiterOverviewPage;
