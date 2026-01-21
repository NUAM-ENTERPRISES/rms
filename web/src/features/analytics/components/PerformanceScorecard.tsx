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
<Card className="overflow-hidden border border-slate-200/70 bg-white/90 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl">
  {/* Premium Header – compacted */}
  <CardHeader className="border-b border-slate-100 bg-slate-50/60 p-6 sm:p-7">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="relative group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200/60 transition-transform hover:scale-105">
          <Award className="h-6 w-6 text-white" />
          <div className="absolute -inset-0.5 rounded-xl bg-indigo-600 opacity-20 blur-sm group-hover:opacity-35 transition-opacity" />
        </div>
        <div>
          <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            Performance Scorecard
          </CardTitle>
          <p className="text-sm text-slate-600 mt-0.5">
            Comprehensive performance analysis for{' '}
            <span className="text-indigo-600 underline decoration-indigo-200/70 underline-offset-3">
              {recruiter.name}
            </span>
          </p>
        </div>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-6 sm:p-7 space-y-8">
    {/* Overall Score Centerpiece – smaller */}
    <div className="relative overflow-hidden text-center p-7 rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white shadow-sm">
      {/* Subtle background decorative shapes – reduced size & blur */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 bg-purple-500/5 rounded-full blur-2xl" />

      <div className="relative z-10">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-500 mb-3">
          Recruiter Efficiency Index
        </p>
        
        {recruiter.assigned === 0 ? (
          <div className="py-5">
            <div className="text-3xl font-extrabold text-slate-300 mb-2">
              No Data Found
            </div>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              No project assignments found for this evaluation period
            </p>
          </div>
        ) : (
          <>
            <div className={cn(
              "text-6xl font-extrabold tracking-tighter mb-2 drop-shadow",
              getScoreColor(metrics.performanceScore)
            )}>
              {metrics.performanceScore}<span className="text-xl opacity-60">/100</span>
            </div>
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-white border border-slate-100 shadow-sm text-base font-extrabold text-slate-700 mb-3">
              {getScoreLabel(metrics.performanceScore)}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 text-[10px] font-bold">#{metrics.rank}</span>
              Ranked out of {metrics.totalRecruiters} team members
            </div>
          </>
        )}
      </div>
    </div>

    {/* Key Metrics Dashboard – tighter */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[
        { label: "Conversion Rate", value: `${metrics.conversionRate}%`, sub: "Joined / Assigned", diff: metrics.vsAverage.conversion, type: "default" },
        { label: "Pipeline Health", value: `${metrics.pipelineHealth}%`, sub: "Active Momentum", diff: metrics.vsAverage.pipeline, type: "default" },
        { label: "Untouched Rate", value: `${metrics.untouchedRate}%`, sub: "Inactivity Level", diff: metrics.vsAverage.untouched, type: "untouched" },
      ].map((item, idx) => {
        const isGood = item.type === "untouched" ? item.diff < 0 : item.diff > 0;
        
        return (
          <div 
            key={idx} 
            className="group p-5 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow hover:border-indigo-100/70"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">{item.label}</div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">{item.value}</div>
            <div className="text-[10px] font-semibold text-slate-500 mb-3">{item.sub}</div>
            
            {item.diff !== 0 && recruiter.assigned > 0 && (
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors",
                isGood 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-100/80" 
                  : "bg-rose-50 text-rose-700 border-rose-100 group-hover:bg-rose-100/80"
              )}>
                {item.diff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(Math.round(item.diff))}% vs avg
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Strengths & Improvements – more compact */}
    {recruiter.assigned > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths Card */}
        <div className="relative group p-5 rounded-2xl border border-emerald-100/80 bg-emerald-50/25 transition-all hover:bg-emerald-50/40">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-emerald-100 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">Core Strengths</h3>
          </div>
          <ul className="space-y-2.5">
            {metrics.strengths.filter(s => s !== "").length > 0 ? (
              metrics.strengths.filter(s => s !== "").map((strength, index) => (
                <li key={index} className="text-sm font-medium text-emerald-800 flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200/70 text-emerald-700 text-[10px]">✓</span>
                  <span>{strength}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-emerald-600/80 italic">No significant strengths identified</li>
            )}
          </ul>
        </div>

        {/* Improvements Card */}
        <div className="relative group p-5 rounded-2xl border border-amber-100/80 bg-amber-50/25 transition-all hover:bg-amber-50/40">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-amber-100 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">Focus Areas</h3>
          </div>
          <ul className="space-y-2.5">
            {metrics.improvements.filter(i => i !== "").length > 0 ? (
              metrics.improvements.filter(i => i !== "").map((improvement, index) => (
                <li key={index} className="text-sm font-medium text-amber-800 flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-700 text-[10px]">!</span>
                  <span>{improvement}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-amber-600/80 italic">Performance fully optimized</li>
            )}
          </ul>
        </div>
      </div>
    )}
  </CardContent>
</Card>
);
};

