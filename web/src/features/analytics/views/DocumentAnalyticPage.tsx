"use client";

import { useMemo, useState, useEffect } from "react";
import { format, subDays, parseISO, startOfDay, addDays } from "date-fns";
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ShieldCheck,
  Download,
  FileSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/features/analytics/components/DateRangePicker";
import { KpiCard } from "@/features/analytics/components/KpiCard";
import { DailyTrendChart } from "@/features/analytics/components/DailyTrendChart";
import { DocumentTypePie } from "@/features/analytics/components/DocumentTypePie";
import { CandidateStatusChart } from "@/features/analytics/components/CandidateStatusChart";
import { TeamPerformanceChart } from "@/features/analytics/components/TeamPerformanceChart";
import { useGetProfessionalAnalyticsQuery } from "@/features/documents/api";

type Document = {
  id: string;
  candidateName: string;
  status: "verified" | "pending" | "rejected";
  docType: string;
  rejectionReason: string | null;
  verifiedBy: string | null;
  createdAt: string; // ISO date string "YYYY-MM-DD"
};

export default function ProfessionalDocumentationDashboard() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [selectedVerifier, setSelectedVerifier] = useState<string>("");

  // Fetch documents from API using RTK Query
  const {
    data: analyticsData,
    isLoading: loading,
    error: queryError,
  } = useGetProfessionalAnalyticsQuery();

  const documents: Document[] = analyticsData?.data || [];
  const error = queryError
    ? "message" in queryError
      ? queryError.message
      : "Failed to load documents"
    : null;

  // Extract unique verifiers (only those who actually verified something)
  const verifiers = useMemo(() => {
    const unique = Array.from(
      new Set(documents.map((d) => d.verifiedBy).filter(Boolean))
    ) as string[];
    return unique.sort();
  }, [documents]);

  // Auto-select first verifier when verifiers load
  useEffect(() => {
    if (verifiers.length > 0 && !selectedVerifier) {
      setSelectedVerifier(verifiers[0]);
    } else if (verifiers.length === 0 && selectedVerifier) {
      // Clear selection if no verifiers available
      setSelectedVerifier("");
    }
  }, [verifiers, selectedVerifier]);

  // Filter documents by date range and selected verifier
  const docs = useMemo(() => {
    if (documents.length === 0) return [];
    
    // If no verifier selected, show all documents in date range
    if (!selectedVerifier) {
      return documents.filter((d) => {
        const docDate = startOfDay(parseISO(d.createdAt));
        const fromDate = startOfDay(dateRange.from);
        const toDate = startOfDay(dateRange.to);

        return docDate >= fromDate && docDate <= toDate;
      });
    }

    return documents.filter((d) => {
      if (!d.verifiedBy || d.verifiedBy !== selectedVerifier) return false;

      const docDate = startOfDay(parseISO(d.createdAt));
      const fromDate = startOfDay(dateRange.from);
      const toDate = startOfDay(dateRange.to);

      return docDate >= fromDate && docDate <= toDate;
    });
  }, [documents, dateRange, selectedVerifier]);

  // Stats
  const stats = useMemo(() => {
    const s = { verified: 0, pending: 0, rejected: 0 };
    docs.forEach((d) => s[d.status]++);
    return s;
  }, [docs]);

  const total = docs.length;
  const verifiedPct = total > 0 ? Math.round((stats.verified / total) * 100) : 0;

  // Daily Trend Data
  const dailyTrend = useMemo(() => {
    const map = new Map<string, any>();
    let day = startOfDay(dateRange.from);

    while (day <= dateRange.to) {
      const key = format(day, "MMM d");
      map.set(key, { date: key, verified: 0, pending: 0, rejected: 0 });
      day = addDays(day, 1);
    }

    docs.forEach((d) => {
      const key = format(parseISO(d.createdAt), "MMM d");
      const entry = map.get(key);
      if (entry) entry[d.status]++;
    });

    return Array.from(map.values());
  }, [docs, dateRange]);

  // Document Type Distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    docs.forEach((d) => {
      counts[d.docType] = (counts[d.docType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [docs]);

  // Top Candidates by Document Count
  const candidateStatus = useMemo(() => {
    const map: Record<string, any> = {};
    docs.forEach((d) => {
      if (!map[d.candidateName]) {
        map[d.candidateName] = { verified: 0, pending: 0, rejected: 0 };
      }
      map[d.candidateName][d.status]++;
    });

    return Object.entries(map)
      .map(([candidate, data]) => ({ candidate, ...data }))
      .sort((a, b) => b.verified + b.pending + b.rejected - (a.verified + a.pending + a.rejected))
      .slice(0, 10);
  }, [docs]);

  // Team Performance (Verifier Performance)
  const teamPerformance = useMemo(() => {
    const perf: Record<string, { verified: number }> = {};
    docs.forEach((d) => {
      if (d.verifiedBy && d.status === "verified") {
        if (!perf[d.verifiedBy]) perf[d.verifiedBy] = { verified: 0 };
        perf[d.verifiedBy].verified++;
      }
    });

    return Object.entries(perf)
      .map(([name, data]) => ({ name, verified: data.verified }))
      .sort((a, b) => b.verified - a.verified);
  }, [docs]);

  const kpiItems = [
    { label: "Compliance Rate", value: `${verifiedPct}%`, icon: ShieldCheck, color: "indigo" },
    { label: "Pending Documents", value: stats.pending, icon: Clock, color: "amber" },
    { label: "Rejected Documents", value: stats.rejected, icon: XCircle, color: "red" },
    { label: "Verified Documents", value: stats.verified, icon: CheckCircle2, color: "green" },
    { label: "Total Processed", value: total, icon: FileText, color: "purple" },
  ];

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto w-full space-y-6 py-2">
          <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
            <div className="p-5">
              <div className="text-center py-12">
                <div className="text-lg font-medium text-slate-600">
                  Loading documentation analytics...
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <FileSearch className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Analytics Dashboard
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Documentation Analysis
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Advanced analytics for the Documentation Team
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <DateRangePicker date={dateRange} setDate={setDateRange} />
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Export Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {hasError && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
            <div className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading data: {error}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {kpiItems.map((item, i) => (
                <KpiCard key={item.label} {...item} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyTrendChart
            data={dailyTrend}
            verifiers={verifiers}
            selectedVerifier={selectedVerifier}
            setSelectedVerifier={setSelectedVerifier}
          />
          <DocumentTypePie data={typeDistribution} />
          <CandidateStatusChart data={candidateStatus} />
          <TeamPerformanceChart data={teamPerformance} />
        </div>
      </div>
    </div>
  );
}