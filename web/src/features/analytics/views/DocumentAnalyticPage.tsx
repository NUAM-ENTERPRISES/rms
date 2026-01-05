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

export default function ProfessionalDocumentationDashboard() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date("2025-12-31"), 30),
    to: new Date("2025-12-31"),
  });

  // ✅ Verifier only (no "all")
  const [selectedVerifier, setSelectedVerifier] = useState<string>("");

  // ---------------- MOCK DATA ----------------
  const generateDocuments = () => {
    const candidates = [
      "Johnson Lee",
      "Hannah Smith",
      "Michael Brown",
      "Emma Davis",
      "Raj Patel",
      "Sofia Garcia",
      "Liam Wilson",
      "Olivia Martinez",
      "Aarav Sharma",
      "Mia Anderson",
    ];

    const verifiers = [
      "Alex Thompson",
      "Sarah Chen",
      "Mike Rivera",
      "Emma Wilson",
      "John Davis",
    ];

    const docTypes = [
      "ID Proof",
      "Address Proof",
      "Edu Certificate",
      "Salary Slip",
      "Bank Statement",
    ];

    const rejectionReasons = [
      "Blurry Image",
      "Expired Document",
      "Wrong Format",
      "Incomplete Information",
      "Name Mismatch",
      "Illegible Text",
    ];

    return Array.from({ length: 450 }, (_, i) => {
      const daysAgo = Math.floor(Math.random() * 120);
      const rand = Math.random();

      let status: "verified" | "pending" | "rejected" = "verified";
      let rejectionReason = null;
      let verifiedBy = null;

      if (rand < 0.2) status = "pending";
      else if (rand < 0.38) {
        status = "rejected";
        rejectionReason =
          rejectionReasons[Math.floor(Math.random() * rejectionReasons.length)];
      } else {
        verifiedBy = verifiers[Math.floor(Math.random() * verifiers.length)];
      }

      return {
        id: `doc-${i}`,
        candidateName:
          candidates[Math.floor(Math.random() * candidates.length)],
        status,
        docType: docTypes[Math.floor(Math.random() * docTypes.length)],
        rejectionReason,
        verifiedBy,
        createdAt: format(
          subDays(new Date("2025-12-31"), daysAgo),
          "yyyy-MM-dd"
        ),
      };
    });
  };

  const rawDocuments = useMemo(() => generateDocuments(), []);

  // ---------------- VERIFIERS ----------------
  const verifiers = useMemo(() => {
    return Array.from(
      new Set(rawDocuments.map((d) => d.verifiedBy).filter(Boolean))
    ).sort();
  }, [rawDocuments]);

  // ✅ Auto-select first verifier
  useEffect(() => {
    if (verifiers.length && !selectedVerifier) {
      setSelectedVerifier(verifiers[0]);
    }
  }, [verifiers, selectedVerifier]);

  // ---------------- FILTERED DOCS ----------------
  const docs = useMemo(() => {
    return rawDocuments.filter((d) => {
      const date = parseISO(d.createdAt);
      return (
        date >= dateRange.from &&
        date <= dateRange.to &&
        d.verifiedBy === selectedVerifier
      );
    });
  }, [rawDocuments, dateRange, selectedVerifier]);

  // ---------------- STATS ----------------
  const stats = useMemo(() => {
    const s = { verified: 0, pending: 0, rejected: 0 };
    docs.forEach((d) => s[d.status]++);
    return s;
  }, [docs]);

  const total = docs.length;
  const verifiedPct = total ? Math.round((stats.verified / total) * 100) : 0;

  // ---------------- DAILY TREND ----------------
  const dailyTrend = useMemo(() => {
    const map = new Map();
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

  // ---------------- DOCUMENT TYPE PIE ----------------
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    docs.forEach((d) => {
      counts[d.docType] = (counts[d.docType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [docs]);

  // ---------------- CANDIDATE STATUS ----------------
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
      .sort(
        (a, b) =>
          b.verified + b.pending + b.rejected -
          (a.verified + a.pending + a.rejected)
      )
      .slice(0, 10);
  }, [docs]);

  // ---------------- TEAM PERFORMANCE ----------------
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
