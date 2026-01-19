"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Award, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type RecruiterStats = {
  id: string;
  name: string;
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
  avgTimeToFirstTouch: number;
};

type PerformanceScorecardProps = {
  recruiter: RecruiterStats;
  allRecruiters: RecruiterStats[];
};

export const PerformanceScorecard: React.FC<PerformanceScorecardProps> = ({
  recruiter,
  allRecruiters,
}) => {
  const metrics = useMemo(() => {
    // Check if recruiter has any data
    const hasData = recruiter.assigned > 0;

    const conversionRate =
      hasData ? (recruiter.joined / recruiter.assigned) * 100 : 0;
    
    // Pipeline Health: Percentage of assigned candidates actively progressing through pipeline
    // (in screening, interview, or selected stages)
    // This measures pipeline momentum - how many candidates are moving forward vs stuck
    const pipelineHealth =
      hasData
        ? ((recruiter.screening + recruiter.interview + recruiter.selected) /
            recruiter.assigned) *
          100
        : 0;
    
    const untouchedRate =
      hasData ? (recruiter.untouched / recruiter.assigned) * 100 : 0;

    // Calculate overall performance score (0-100)
    // Only calculate if there's actual data, otherwise return 0
    const performanceScore = hasData
      ? conversionRate * 0.4 + pipelineHealth * 0.3 + (100 - untouchedRate) * 0.3
      : 0;

    // Calculate team averages
    const avgConversion =
      allRecruiters.length > 0
        ? allRecruiters.reduce(
            (sum, r) =>
              sum + (r.assigned > 0 ? (r.joined / r.assigned) * 100 : 0),
            0
          ) / allRecruiters.length
        : 0;

    const avgPipelineHealth =
      allRecruiters.length > 0
        ? allRecruiters.reduce(
            (sum, r) =>
              sum +
              (r.assigned > 0
                ? ((r.screening + r.interview + r.selected) / r.assigned) * 100
                : 0),
            0
          ) / allRecruiters.length
        : 0;

    const avgUntouched =
      allRecruiters.length > 0
        ? allRecruiters.reduce(
            (sum, r) =>
              sum + (r.assigned > 0 ? (r.untouched / r.assigned) * 100 : 0),
            0
          ) / allRecruiters.length
        : 0;

    // Calculate rank
    const sortedByScore = [...allRecruiters]
      .map((r) => {
        const conv = r.assigned > 0 ? (r.joined / r.assigned) * 100 : 0;
        const health =
          r.assigned > 0
            ? ((r.screening + r.interview + r.selected) / r.assigned) * 100
            : 0;
        const untouched =
          r.assigned > 0 ? (r.untouched / r.assigned) * 100 : 0;
        return {
          id: r.id,
          score: conv * 0.4 + health * 0.3 + (100 - untouched) * 0.3,
        };
      })
      .sort((a, b) => b.score - a.score);

    const rank =
      sortedByScore.findIndex((r) => r.id === recruiter.id) + 1;

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (conversionRate > avgConversion * 1.1) {
      strengths.push("High conversion rate");
    } else if (conversionRate < avgConversion * 0.9) {
      improvements.push("Improve conversion rate");
    }

    if (pipelineHealth > avgPipelineHealth * 1.1) {
      strengths.push("Strong pipeline health");
    } else if (pipelineHealth < avgPipelineHealth * 0.9) {
      improvements.push("Improve pipeline momentum");
    }

    if (untouchedRate < avgUntouched * 0.9) {
      strengths.push("Low untouched profiles");
    } else if (untouchedRate > avgUntouched * 1.1) {
      improvements.push("Reduce untouched profiles");
    }

    if (recruiter.avgTimeToFirstTouch > 0 && recruiter.avgTimeToFirstTouch < 3) {
      strengths.push("Fast first touch response");
    } else if (recruiter.avgTimeToFirstTouch > 5) {
      improvements.push("Improve first touch response time");
    }

    return {
      performanceScore: Math.round(performanceScore),
      conversionRate: Math.round(conversionRate),
      pipelineHealth: Math.round(pipelineHealth),
      untouchedRate: Math.round(untouchedRate),
      rank,
      totalRecruiters: allRecruiters.length,
      strengths: strengths.length > 0 ? strengths : [""],
      improvements: improvements.length > 0 ? improvements : [""],
      vsAverage: {
        conversion: conversionRate - avgConversion,
        pipeline: pipelineHealth - avgPipelineHealth,
        untouched: untouchedRate - avgUntouched,
      },
    };
  }, [recruiter, allRecruiters]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600 bg-green-50";
    if (score >= 50) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "Excellent";
    if (score >= 50) return "Good";
    return "Needs Improvement";
  };

  return (
    <Card className="shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Award className="h-5 w-5 text-indigo-600" />
          Performance Scorecard
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Comprehensive performance analysis for {recruiter.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Overall Performance Score
          </div>
          {recruiter.assigned === 0 ? (
            <>
              <div className="text-3xl font-bold text-gray-400 mb-2">
                No Data
              </div>
              <div className="text-sm text-gray-500">
                No project assignments found for this period
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "text-5xl font-bold mb-2",
                  getScoreColor(metrics.performanceScore)
                )}
              >
                {metrics.performanceScore}/100
              </div>
              <div className="text-lg font-semibold text-gray-700">
                {getScoreLabel(metrics.performanceScore)}
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Ranked #{metrics.rank} out of {metrics.totalRecruiters} recruiters
              </div>
            </>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Conversion Rate
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.conversionRate}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Joined / Assigned
            </div>
            {metrics.vsAverage.conversion !== 0 && recruiter.assigned > 0 && (
              <div
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  metrics.vsAverage.conversion > 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {metrics.vsAverage.conversion > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(Math.round(metrics.vsAverage.conversion))}% vs average
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Pipeline Health
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.pipelineHealth}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Active pipeline momentum
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              % of assigned candidates progressing through pipeline
            </div>
            <div className="text-xs text-gray-400 mt-0.5 italic">
              (Screening + Interview + Selected stages)
            </div>
            {metrics.vsAverage.pipeline !== 0 && recruiter.assigned > 0 && (
              <div
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  metrics.vsAverage.pipeline > 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {metrics.vsAverage.pipeline > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(Math.round(metrics.vsAverage.pipeline))}% vs average
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Untouched Rate
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.untouchedRate}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Not yet progressed
            </div>
            {metrics.vsAverage.untouched !== 0 && recruiter.assigned > 0 && (
              <div
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  metrics.vsAverage.untouched < 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {metrics.vsAverage.untouched < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {Math.abs(Math.round(metrics.vsAverage.untouched))}% vs average
              </div>
            )}
          </div>
        </div>

        {/* Strengths & Improvements - Only show if there's data */}
        {recruiter.assigned > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Strengths</h3>
              </div>
              <ul className="space-y-2">
                {metrics.strengths.filter(s => s !== "").length > 0 ? (
                  metrics.strengths.filter(s => s !== "").map((strength, index) => (
                    <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{strength}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-green-700 italic">No significant strengths identified</li>
                )}
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">
                  Areas for Improvement
                </h3>
              </div>
              <ul className="space-y-2">
                {metrics.improvements.filter(i => i !== "").length > 0 ? (
                  metrics.improvements.filter(i => i !== "").map((improvement, index) => (
                    <li
                      key={index}
                      className="text-sm text-amber-800 flex items-start gap-2"
                    >
                      <span className="text-amber-600 mt-0.5">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-amber-700 italic">Performance is on track</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

