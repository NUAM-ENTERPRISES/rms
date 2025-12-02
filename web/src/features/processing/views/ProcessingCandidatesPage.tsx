import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Player } from "@lottiefiles/react-lottie-player";
import {
  useGetProcessingCandidatesQuery,
  ProcessingCandidatesQuery,
} from "../data/processing.endpoints";
import { PROCESSING_STEP_META_MAP } from "../constants/processingSteps";
import { ProcessingStatusBadge } from "../components/ProcessingStatusBadge";
import { ProcessingCandidateSummary } from "../types";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Search,
  Activity,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function ProcessingCandidatesPage() {
  const WORKSPACE_ANIMATION =
    "https://assets6.lottiefiles.com/packages/lf20_dmw3t0vg.json";
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProcessingCandidatesQuery>({
    page: 1,
    limit: 20,
  });
  type StatusPreset = "completed" | "overdue" | "rejected";
  const [statusPreset, setStatusPreset] = useState<StatusPreset | null>(null);

  const { data, isLoading, refetch } = useGetProcessingCandidatesQuery(filters);
  const candidates = data?.data.items ?? [];

  const aggregateProgress = useMemo(() => {
    if (!candidates.length) return 0;
    const total = candidates.reduce(
      (acc, candidate) => acc + candidate.progress,
      0
    );
    return Math.round(total / candidates.length);
  }, [candidates]);

  const pendingCount = useMemo(
    () =>
      candidates.filter(
        (c) =>
          c.currentStep?.status === "PENDING" ||
          c.currentStep?.status === "IN_PROGRESS"
      ).length,
    [candidates]
  );

  const completedCount = useMemo(
    () => candidates.filter((c) => c.progress === 100).length,
    [candidates]
  );

  const rejectedCount = useMemo(
    () => candidates.filter((c) => c.currentStep?.status === "REJECTED").length,
    [candidates]
  );

  const overdueCount = useMemo(
    () =>
      candidates.filter((c) => {
        const due = c.currentStep?.dueDate;
        if (!due) return false;
        const status = c.currentStep?.status;
        if (status === "DONE" || status === "NOT_APPLICABLE") return false;
        return new Date(due).getTime() < Date.now();
      }).length,
    [candidates]
  );

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handlePreset = (preset: StatusPreset) => {
    setStatusPreset((prev) => (prev === preset ? null : preset));
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleNavigate = (candidate: ProcessingCandidateSummary) => {
    navigate(`/processing/candidates/${candidate.candidateProjectMapId}`);
  };

  const filteredCandidates = useMemo(() => {
    if (!statusPreset) {
      return candidates;
    }
    switch (statusPreset) {
      case "completed":
        return candidates.filter((c) => c.progress === 100);
      case "rejected":
        return candidates.filter((c) => c.currentStep?.status === "REJECTED");
      case "overdue":
        return candidates.filter((c) => {
          const due = c.currentStep?.dueDate;
          if (!due) return false;
          const status = c.currentStep?.status;
          if (status === "DONE" || status === "NOT_APPLICABLE") return false;
          return new Date(due).getTime() < Date.now();
        });
    }
  }, [candidates, statusPreset]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-white/60 bg-white/95 p-5 shadow-lg shadow-slate-200/70 backdrop-blur-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-md">
              <Player
                autoplay
                loop
                keepLastFrame
                src={WORKSPACE_ANIMATION}
                style={{ height: 48, width: 48 }}
              />
            </div>
            <div className="-space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-500">
                Processing Executive Workspace
              </p>
              <h1 className="text-xl font-black text-slate-900">
                Keep every hired candidate moving
              </h1>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-500">
              Track medical, document, visa and travel follow-ups in a single
              compact view.
            </p>
            <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-6">
              <AnalyticsCard
                icon={Activity}
                label="Active"
                value={candidates.length.toString()}
                tone="emerald"
              />
              <AnalyticsCard
                icon={Clock3}
                label="Avg Progress"
                value={`${aggregateProgress}%`}
                tone="indigo"
              />
              <AnalyticsCard
                icon={Clock3}
                label="Pending"
                value={pendingCount.toString()}
                tone="amber"
              />
              <AnalyticsCard
                icon={CheckCircle2}
                label="Completed"
                value={completedCount.toString()}
                tone="slate"
                active={statusPreset === "completed"}
                onClick={() => handlePreset("completed")}
              />
              <AnalyticsCard
                icon={AlertTriangle}
                label="Overdue"
                value={overdueCount.toString()}
                tone="rose"
                active={statusPreset === "overdue"}
                onClick={() => handlePreset("overdue")}
              />
              <AnalyticsCard
                icon={XCircle}
                label="Rejected"
                value={rejectedCount.toString()}
                tone="slate"
                active={statusPreset === "rejected"}
                onClick={() => handlePreset("rejected")}
              />
            </div>
          </div>
        </header>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100/80 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl font-semibold text-slate-900">
              In Processing
            </CardTitle>
            <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              {statusPreset && (
                <Badge
                  variant="outline"
                  className="w-full justify-between bg-violet-50/70 text-violet-700 sm:w-auto"
                >
                  Showing {statusPreset}
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-wide"
                    onClick={() => setStatusPreset(null)}
                  >
                    Clear
                  </button>
                </Badge>
              )}
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search candidate or project"
                  className="pl-9"
                  defaultValue={filters.search ?? ""}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-3 text-slate-500">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-violet-500" />
                <p>Loading processing candidates…</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-3 text-slate-500">
                <p className="text-lg font-semibold text-slate-700">
                  {statusPreset
                    ? "No candidates match this filter"
                    : "No candidates in processing right now"}
                </p>
                <p className="text-sm">
                  {statusPreset
                    ? "Try clearing the filter to see everyone again."
                    : "Once interviews are passed, they will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCandidates.map((candidate) => {
                  const currentMeta = candidate.currentStep
                    ? PROCESSING_STEP_META_MAP[candidate.currentStep.stepKey]
                    : undefined;
                  const CurrentIcon = currentMeta?.icon;
                  return (
                    <button
                      key={candidate.candidateProjectMapId}
                      className="w-full text-left transition hover:bg-slate-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                      onClick={() => handleNavigate(candidate)}
                    >
                      <div className="grid gap-4 p-5 sm:grid-cols-[2fr,1fr,1fr]">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {candidate.candidate.firstName}{" "}
                            {candidate.candidate.lastName}
                          </p>
                          <p className="text-sm text-slate-500">
                            {candidate.project.title}
                          </p>
                          {candidate.candidate.email && (
                            <p className="text-xs text-slate-400">
                              {candidate.candidate.email}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase text-slate-400">
                            Current Step
                          </p>
                          {candidate.currentStep ? (
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "h-8 w-8 rounded-xl border",
                                  "border-transparent bg-gradient-to-br",
                                  currentMeta?.accent ??
                                    "from-slate-200 to-slate-100",
                                  "flex items-center justify-center"
                                )}
                              >
                                {CurrentIcon ? (
                                  <CurrentIcon className="h-4 w-4 text-slate-700" />
                                ) : null}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {currentMeta?.title}
                                </p>
                                <ProcessingStatusBadge
                                  status={candidate.currentStep.status}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Not started
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase text-slate-400">
                            Progress
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="relative h-2 flex-1 rounded-full bg-slate-100">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-violet-500"
                                style={{ width: `${candidate.progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {candidate.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type Tone = "slate" | "indigo" | "amber" | "emerald" | "rose";
const toneStyles: Record<Tone, { bg: string; text: string }> = {
  slate: { bg: "bg-slate-50", text: "text-slate-700" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700" },
  amber: { bg: "bg-amber-50", text: "text-amber-700" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
  rose: { bg: "bg-rose-50", text: "text-rose-700" },
};

function AnalyticsCard({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
  active,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: Tone;
  onClick?: () => void;
  active?: boolean;
}) {
  const palette = toneStyles[tone];
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white px-3 py-2 text-left shadow-sm transition backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
        palette.bg,
        onClick ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default",
        active ? "ring-2 ring-violet-400/70 shadow-md" : ""
      )}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="rounded-xl bg-white/80 p-2 shadow-sm">
        <Icon className={cn("h-4 w-4", palette.text)} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className={cn("text-xl font-bold", palette.text)}>{value}</p>
      </div>
    </button>
  );
}
