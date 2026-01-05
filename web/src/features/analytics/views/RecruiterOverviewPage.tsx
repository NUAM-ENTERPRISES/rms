import React, { useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users as UsersRound,
} from "lucide-react";

// Import all dashboard components from the same folder

import { KpiCard } from "@/features/analytics/components/KpiCard";
import { PipelineBarChart } from "@/features/analytics/components/PipelineBarChart";
import { StatusDistributionPieChart } from "@/features/analytics/components/StatusDistributionPieChart";
import { TimeToStatusChart } from "@/features/analytics/components/TimeToStatusChart";
import { PerformanceTrendChart } from "@/features/analytics/components/PerformanceTrendChart";

// Keep your types and mock data (you can move these to separate files later)
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

// Mock Data (keep or move to /data/recruiters.ts)
const recruitersData: RecruiterStats[] = [
  {
    id: "r1",
    name: "Alice Johnson",
    email: "alice@example.com",
    assigned: 150,
    screening: 120,
    interview: 100,
    selected: 75,
    joined: 60,
    untouched: 10,
    avgScreeningDays: 3,
    avgTimeToFirstTouch: 2.5,
    avgDaysToInterested: 3.2,
    avgDaysToNotInterested: 4.1,
    avgDaysToNotEligible: 5.0,
    avgDaysToOtherEnquiry: 6.3,
    avgDaysToFuture: 8.1,
    avgDaysToOnHold: 7.5,
    avgDaysToRNR: 4.8,
    avgDaysToQualified: 12.4,
    avgDaysToWorking: 15.2,
  },
  {
    id: "r2",
    name: "Bob Smith",
    email: "bob@example.com",
    assigned: 100,
    screening: 80,
    interview: 60,
    selected: 45,
    joined: 35,
    untouched: 5,
    avgScreeningDays: 5,
    avgTimeToFirstTouch: 4.2,
    avgDaysToInterested: 5.1,
    avgDaysToNotInterested: 6.3,
    avgDaysToNotEligible: 7.2,
    avgDaysToOtherEnquiry: 8.5,
    avgDaysToFuture: 10.1,
    avgDaysToOnHold: 9.8,
    avgDaysToRNR: 6.9,
    avgDaysToQualified: 18.3,
    avgDaysToWorking: 22.1,
  },
  {
    id: "r3",
    name: "Carla Gomez",
    email: "carla@example.com",
    assigned: 200,
    screening: 150,
    interview: 120,
    selected: 100,
    joined: 90,
    untouched: 15,
    avgScreeningDays: 2,
    avgTimeToFirstTouch: 1.8,
    avgDaysToInterested: 2.1,
    avgDaysToNotInterested: 2.8,
    avgDaysToNotEligible: 3.5,
    avgDaysToOtherEnquiry: 4.2,
    avgDaysToFuture: 5.9,
    avgDaysToOnHold: 5.3,
    avgDaysToRNR: 3.1,
    avgDaysToQualified: 9.8,
    avgDaysToWorking: 12.5,
  },
  {
    id: "r4",
    name: "David Lee",
    email: "david@example.com",
    assigned: 75,
    screening: 50,
    interview: 40,
    selected: 30,
    joined: 25,
    untouched: 3,
    avgScreeningDays: 6,
    avgTimeToFirstTouch: 5.1,
    avgDaysToInterested: 6.0,
    avgDaysToNotInterested: 7.2,
    avgDaysToNotEligible: 8.1,
    avgDaysToOtherEnquiry: 9.4,
    avgDaysToFuture: 11.2,
    avgDaysToOnHold: 10.8,
    avgDaysToRNR: 7.9,
    avgDaysToQualified: 20.1,
    avgDaysToWorking: 24.3,
  },
  {
    id: "r5",
    name: "Eva Martinez",
    email: "eva@example.com",
    assigned: 130,
    screening: 110,
    interview: 90,
    selected: 80,
    joined: 70,
    untouched: 8,
    avgScreeningDays: 4,
    avgTimeToFirstTouch: 3.3,
    avgDaysToInterested: 4.0,
    avgDaysToNotInterested: 5.1,
    avgDaysToNotEligible: 6.0,
    avgDaysToOtherEnquiry: 7.3,
    avgDaysToFuture: 9.0,
    avgDaysToOnHold: 8.5,
    avgDaysToRNR: 5.8,
    avgDaysToQualified: 14.7,
    avgDaysToWorking: 18.2,
  },
  {
    id: "r6",
    name: "Frank Wilson",
    email: "frank@example.com",
    assigned: 90,
    screening: 70,
    interview: 50,
    selected: 40,
    joined: 35,
    untouched: 6,
    avgScreeningDays: 7,
    avgTimeToFirstTouch: 6.4,
    avgDaysToInterested: 7.2,
    avgDaysToNotInterested: 8.5,
    avgDaysToNotEligible: 9.3,
    avgDaysToOtherEnquiry: 10.8,
    avgDaysToFuture: 12.6,
    avgDaysToOnHold: 12.1,
    avgDaysToRNR: 9.0,
    avgDaysToQualified: 23.5,
    avgDaysToWorking: 28.1,
  },
  {
    id: "r7",
    name: "Grace Kim",
    email: "grace@example.com",
    assigned: 110,
    screening: 90,
    interview: 75,
    selected: 65,
    joined: 55,
    untouched: 7,
    avgScreeningDays: 3,
    avgTimeToFirstTouch: 2.7,
    avgDaysToInterested: 3.4,
    avgDaysToNotInterested: 4.3,
    avgDaysToNotEligible: 5.2,
    avgDaysToOtherEnquiry: 6.5,
    avgDaysToFuture: 8.3,
    avgDaysToOnHold: 7.8,
    avgDaysToRNR: 5.0,
    avgDaysToQualified: 13.1,
    avgDaysToWorking: 16.0,
  },
  {
    id: "r8",
    name: "Henry Adams",
    email: "henry@example.com",
    assigned: 140,
    screening: 120,
    interview: 110,
    selected: 95,
    joined: 85,
    untouched: 9,
    avgScreeningDays: 4,
    avgTimeToFirstTouch: 3.9,
    avgDaysToInterested: 4.6,
    avgDaysToNotInterested: 5.7,
    avgDaysToNotEligible: 6.6,
    avgDaysToOtherEnquiry: 7.9,
    avgDaysToFuture: 9.7,
    avgDaysToOnHold: 9.2,
    avgDaysToRNR: 6.4,
    avgDaysToQualified: 15.8,
    avgDaysToWorking: 19.5,
  },
  {
    id: "r9",
    name: "Isabel Clark",
    email: "isabel@example.com",
    assigned: 80,
    screening: 65,
    interview: 50,
    selected: 40,
    joined: 35,
    untouched: 4,
    avgScreeningDays: 5,
    avgTimeToFirstTouch: 4.6,
    avgDaysToInterested: 5.4,
    avgDaysToNotInterested: 6.6,
    avgDaysToNotEligible: 7.5,
    avgDaysToOtherEnquiry: 8.8,
    avgDaysToFuture: 10.6,
    avgDaysToOnHold: 10.1,
    avgDaysToRNR: 7.3,
    avgDaysToQualified: 19.2,
    avgDaysToWorking: 23.0,
  },
  {
    id: "r10",
    name: "Jack Turner",
    email: "jack@example.com",
    assigned: 95,
    screening: 85,
    interview: 70,
    selected: 60,
    joined: 50,
    untouched: 5,
    avgScreeningDays: 3,
    avgTimeToFirstTouch: 2.9,
    avgDaysToInterested: 3.7,
    avgDaysToNotInterested: 4.8,
    avgDaysToNotEligible: 5.7,
    avgDaysToOtherEnquiry: 7.0,
    avgDaysToFuture: 8.8,
    avgDaysToOnHold: 8.3,
    avgDaysToRNR: 5.5,
    avgDaysToQualified: 13.9,
    avgDaysToWorking: 17.1,
  },
];

// Monthly performance mock data generation
const mockPerformanceData: Record<string, MonthlyPerformance[]> = {};
const months: string[] = [];
const startDate = new Date("2023-01-01");
for (let i = 0; i < 36; i++) {
  const date = new Date(startDate);
  date.setMonth(startDate.getMonth() + i);
  months.push(date.toLocaleDateString("en-US", { year: "numeric", month: "short" }));
}

recruitersData.forEach((recruiter) => {
  const baseAssigned = Math.round(recruiter.assigned / 12);
  const data: MonthlyPerformance[] = [];
  for (let i = 0; i < months.length; i++) {
    const trendFactor = 1 + (i / 36) * 0.4;
    const seasonal = 0.8 + 0.4 * Math.sin((i / 12) * Math.PI);
    const assigned = Math.round(baseAssigned * trendFactor * seasonal + Math.random() * 8);
    const screening = Math.round(assigned * 0.8 + Math.random() * 5);
    const interview = Math.round(screening * 0.8 + Math.random() * 4);
    const selected = Math.round(interview * 0.75 + Math.random() * 3);
    const joined = Math.round(selected * 0.8 + Math.random() * 2);
    data.push({ month: months[i], assigned, screening, interview, selected, joined });
  }
  mockPerformanceData[recruiter.id] = data;
});

// Make it available globally for PerformanceTrendChart
// @ts-ignore - for internal use
globalThis.mockPerformanceData = mockPerformanceData;

const RecruiterOverviewPage: React.FC = () => {
  const recruiters = recruitersData;
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>(recruiters[0].id);

  const selectedRecruiter = useMemo(
    () => recruiters.find((r) => r.id === selectedRecruiterId)!,
    [selectedRecruiterId]
  );

  const metrics = useMemo(() => {
    const assigned = recruiters.reduce((s, r) => s + r.assigned, 0);
    const joined = recruiters.reduce((s, r) => s + r.joined, 0);
    const untouched = recruiters.reduce((s, r) => s + r.untouched, 0);
    return {
      recruiters: recruiters.length,
      assigned,
      joined,
      untouched,
      conversion: assigned > 0 ? Math.round((joined / assigned) * 100) : 0,
    };
  }, []);

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

  const kpiItems = [
    { label: "Active Recruiters", value: metrics.recruiters, icon: Users, color: "indigo" },
    { label: "Candidates Assigned", value: metrics.assigned, icon: UserCheck, color: "blue" },
    { label: "Candidates Joined", value: metrics.joined, icon: CheckCircle, color: "green" },
    { label: "Untouched Profiles", value: metrics.untouched, icon: AlertTriangle, color: "red" },
    { label: "Conversion Rate", value: `${metrics.conversion}%`, icon: TrendingUp, color: "purple" },
  ];

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
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiItems.map((item, index) => (
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
      <TimeToStatusChart recruiter={selectedRecruiter} formatDuration={formatDuration} />

      {/* Performance Trend Over Time */}
<PerformanceTrendChart
  recruiterId={selectedRecruiterId}
  recruiterName={selectedRecruiter.name}
  performanceData={mockPerformanceData[selectedRecruiterId] || []}
/>    
</div>
  );
};

export default RecruiterOverviewPage;