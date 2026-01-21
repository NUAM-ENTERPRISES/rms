"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, AlertTriangle, CheckCircle, PhoneOff, Clock, MessageCircle, XCircle, Pause,
  ArrowUp, ArrowDown
 } from "lucide-react";
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
  candidatesWorking: number;
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
        ? (recruiter.candidatesWorking / recruiter.totalCandidates) * 100
        : 0;

    // Calculate engagement rate (interested + qualified + working)
    const engagementRate =
      recruiter.totalCandidates > 0
        ? ((recruiter.candidatesInterested +
            recruiter.candidatesQualified +
            recruiter.candidatesWorking) /
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
                ? (r.candidatesWorking / r.totalCandidates) * 100
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
      label: "Working",
      value: recruiter.candidatesWorking,
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
  <Card className="overflow-hidden border border-slate-200/70 bg-white/90 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl">
  {/* Premium Header Section – smaller */}
  <CardHeader className="border-b border-slate-100 bg-slate-50/60 p-6 sm:p-7">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="relative group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200/60 transition-transform hover:scale-105">
          <Users className="h-6 w-6 text-white" />
          <div className="absolute -inset-0.5 rounded-xl bg-indigo-600 opacity-20 blur-sm group-hover:opacity-35 transition-opacity" />
        </div>
        <div>
          <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            Candidate-Level Analytics
          </CardTitle>
          <p className="text-sm text-slate-600 mt-0.5 leading-snug">
            Overall engagement and relationship health for{' '}
            <span className="text-indigo-600 underline decoration-indigo-200/70 underline-offset-3">
              {recruiter.name}
            </span>
          </p>
        </div>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-6 sm:p-7 space-y-8">
    {/* Key Metrics Dashboard – reduced padding & text */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {[
        { 
          label: "Total Candidates", 
          value: recruiter.totalCandidates, 
          diff: metrics.vsAverage.totalCandidates, 
          isPercent: false,
          isInverse: false 
        },
        { 
          label: "Conversion Rate", 
          value: `${metrics.candidateConversionRate}%`, 
          diff: metrics.vsAverage.conversion, 
          isPercent: true,
          isInverse: false 
        },
        { 
          label: "Engagement", 
          value: `${metrics.engagementRate}%`, 
          diff: metrics.vsAverage.engagement, 
          isPercent: true,
          isInverse: false 
        },
        { 
          label: "RNR Rate", 
          value: `${metrics.rnrRate}%`, 
          diff: metrics.vsAverage.rnr, 
          isPercent: true,
          isInverse: true 
        },
      ].map((item, idx) => {
        const isPositive = item.isInverse ? item.diff < 0 : item.diff > 0;
        
        return (
          <div 
            key={idx} 
            className="group relative flex flex-col p-5 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow hover:border-indigo-100/70"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
              {item.label}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {item.value}
            </div>
            
            {item.diff !== 0 && (
              <div className={cn(
                "mt-2.5 inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors",
                isPositive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-100/80" 
                  : "bg-rose-50 text-rose-700 border-rose-100 group-hover:bg-rose-100/80"
              )}>
                {item.diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span>
                  {Math.abs(Math.round(item.diff))}{item.isPercent ? "%" : ""} vs avg
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Pipeline Status Breakdown – smaller */}
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
          Pipeline Distribution
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-100 via-slate-200 to-transparent" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusItems.map((item, index) => (
          <div
            key={index}
            className={cn(
              "group relative flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
              item.bgColor,
              item.borderColor,
              "shadow-sm hover:shadow-md"
            )}
          >
            {/* Animated Icon Container – smaller */}
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow transition-transform group-hover:rotate-3 group-hover:scale-105">
              <item.icon className={cn("h-5.5 w-5.5", item.color)} />
            </div>
            
            <div className={cn("text-2xl font-extrabold tracking-tight mb-1", item.color)}>
              {item.value}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 opacity-90 text-center leading-tight">
              {item.label}
            </div>
            
            {/* Subtle decorative ring – kept but smaller effect */}
            <div className={cn(
              "absolute inset-0 rounded-2xl border-2 border-white/30 pointer-events-none opacity-0 group-hover:opacity-70 transition-opacity"
            )} />
          </div>
        ))}
      </div>
    </div>
  </CardContent>
</Card>
);
};

