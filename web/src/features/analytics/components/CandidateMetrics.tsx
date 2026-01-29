"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, AlertTriangle, CheckCircle, PhoneOff, Clock, MessageCircle, XCircle, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

type RecruiterStats = {
  id: string;
  name: string;
  totalCandidates: number;
  candidatesUntouched: number;
  candidatesInterested: number;
  candidatesNotInterested: number;
  candidatesRNR: number;
  candidatesQualified: number;
  candidatesDeployed: number;
  candidatesOnHold: number;
  candidatesOtherEnquiry: number;
  candidatesFuture: number;
  candidatesNotEligible: number;
};

type CandidateMetricsProps = {
  recruiter: RecruiterStats;
  allRecruiters: RecruiterStats[];
};

export const CandidateMetrics: React.FC<CandidateMetricsProps> = ({
  recruiter,
  allRecruiters,
}) => {
  const metrics = useMemo(() => {
    // Calculate candidate-level conversion rate
    const candidateConversionRate =
      recruiter.totalCandidates > 0
        ? (recruiter.candidatesDeployed / recruiter.totalCandidates) * 100
        : 0;

    // Calculate engagement rate (interested + qualified + deployed)
    const engagementRate =
      recruiter.totalCandidates > 0
        ? ((recruiter.candidatesInterested +
            recruiter.candidatesQualified +
            recruiter.candidatesDeployed) /
            recruiter.totalCandidates) *
          100
        : 0;

    // Calculate RNR rate (needs attention)
    const rnrRate =
      recruiter.totalCandidates > 0
        ? (recruiter.candidatesRNR / recruiter.totalCandidates) * 100
        : 0;

    // Calculate untouched rate
    const untouchedRate =
      recruiter.totalCandidates > 0
        ? (recruiter.candidatesUntouched / recruiter.totalCandidates) * 100
        : 0;

    // Calculate team averages
    const avgTotalCandidates =
      allRecruiters.length > 0
        ? allRecruiters.reduce((sum, r) => sum + r.totalCandidates, 0) /
          allRecruiters.length
        : 0;

    const avgConversionRate =
      allRecruiters.length > 0
        ? allRecruiters.reduce(
            (sum, r) =>
              sum +
              (r.totalCandidates > 0
                ? ((r.candidatesDeployed ?? r.candidatesWorking) / r.totalCandidates) * 100
                : 0),
            0
          ) / allRecruiters.length
        : 0;

    const avgEngagementRate =
      allRecruiters.length > 0
        ? allRecruiters.reduce(
            (sum, r) =>
              sum +
              (r.totalCandidates > 0
                ? ((r.candidatesInterested +
                    r.candidatesQualified +
                    r.candidatesWorking) /
                    r.totalCandidates) *
                  100
                : 0),
            0
          ) / allRecruiters.length
        : 0;

    const avgRNRRate =
      allRecruiters.length > 0
        ? allRecruiters.reduce(
            (sum, r) =>
              sum +
              (r.totalCandidates > 0
                ? (r.candidatesRNR / r.totalCandidates) * 100
                : 0),
            0
          ) / allRecruiters.length
        : 0;

    return {
      candidateConversionRate: Math.round(candidateConversionRate),
      engagementRate: Math.round(engagementRate),
      rnrRate: Math.round(rnrRate),
      untouchedRate: Math.round(untouchedRate),
      vsAverage: {
        totalCandidates: recruiter.totalCandidates - avgTotalCandidates,
        conversion: candidateConversionRate - avgConversionRate,
        engagement: engagementRate - avgEngagementRate,
        rnr: rnrRate - avgRNRRate,
      },
    };
  }, [recruiter, allRecruiters]);

  const statusItems = [
    {
      label: "Untouched",
      value: recruiter.candidatesUntouched,
      icon: Users,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
    {
      label: "Interested",
      value: recruiter.candidatesInterested,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      label: "Qualified",
      value: recruiter.candidatesQualified,
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "Deployed",
      value: recruiter.candidatesDeployed,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },

    {
      label: "RNR",
      value: recruiter.candidatesRNR,
      icon: PhoneOff,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      label: "Not Interested",
      value: recruiter.candidatesNotInterested,
      icon: XCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      label: "Not Eligible",
      value: recruiter.candidatesNotEligible,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      label: "On Hold",
      value: recruiter.candidatesOnHold,
      icon: Pause,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      label: "Other Enquiry",
      value: recruiter.candidatesOtherEnquiry,
      icon: MessageCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      label: "Future",
      value: recruiter.candidatesFuture,
      icon: Clock,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
  ];

  return (
    <Card className="shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          Candidate-Level Analytics
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Overall candidate engagement and relationship metrics for {recruiter.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Total Candidates
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {recruiter.totalCandidates}
            </div>
            {metrics.vsAverage.totalCandidates !== 0 && (
              <div
                className={cn(
                  "text-xs mt-1",
                  metrics.vsAverage.totalCandidates > 0
                    ? "text-green-600"
                    : "text-gray-600"
                )}
              >
                {metrics.vsAverage.totalCandidates > 0 ? "+" : ""}
                {Math.round(metrics.vsAverage.totalCandidates)} vs average
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Candidate Conversion
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.candidateConversionRate}%
            </div>
            {metrics.vsAverage.conversion !== 0 && (
              <div
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  metrics.vsAverage.conversion > 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {metrics.vsAverage.conversion > 0 ? "+" : ""}
                {Math.abs(Math.round(metrics.vsAverage.conversion))}% vs average
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Engagement Rate
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.engagementRate}%
            </div>
            {metrics.vsAverage.engagement !== 0 && (
              <div
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  metrics.vsAverage.engagement > 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {metrics.vsAverage.engagement > 0 ? "+" : ""}
                {Math.abs(Math.round(metrics.vsAverage.engagement))}% vs average
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs font-medium text-gray-500 mb-1">
              RNR Rate
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.rnrRate}%
            </div>
            {metrics.vsAverage.rnr !== 0 && (
              <div
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  metrics.vsAverage.rnr < 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {metrics.vsAverage.rnr < 0 ? "" : "+"}
                {Math.abs(Math.round(metrics.vsAverage.rnr))}% vs average
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Candidate Status Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statusItems.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border flex flex-col items-center",
                  item.bgColor,
                  item.borderColor
                )}
              >
                <item.icon className={cn("h-5 w-5 mb-2", item.color)} />
                <div className={cn("text-lg font-bold mb-1", item.color)}>
                  {item.value}
                </div>
                <div className="text-xs font-medium text-gray-600 text-center">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

