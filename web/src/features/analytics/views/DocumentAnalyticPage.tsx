"use client";

import React, { useMemo, useState, useEffect } from "react";
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

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedVerifier, setSelectedVerifier] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch documents from API
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Replace with your actual API endpoint
        const response = await fetch("/api/documents/professional");

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
        }

        const data: Document[] = await response.json();
        setDocuments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load documents");
        console.error("Documents fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

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
    }
  }, [verifiers, selectedVerifier]);

  // Filter documents by date range and selected verifier
  const docs = useMemo(() => {
    if (documents.length === 0 || !selectedVerifier) return [];

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
          Loading documentation analytics...
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  // No Data State
  if (documents.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
          No documentation data available
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      <main className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="mb-10 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                <FileSearch className="h-8 w-8 text-indigo-600" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Documentation Analysis
              </h1>
            </div>
            <p className="text-gray-500 mt-2">Advanced analytics for the Documentation Team</p>
          </div>
          <div className="flex gap-4">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button>
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {kpiItems.map((item, i) => (
            <KpiCard key={item.label} {...item} index={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
      </main>
    </div>
  );
}