import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  FileText,
  Mic,
  Plane,
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  Target,
  TrendingUp,
  Activity,
} from "lucide-react";
import type { CandidateActivitySnapshot as ActivityStats } from "../api";

export type SnapshotTab = "projects" | "documents" | "overview" | "history";

type SnapshotAccent = "blue" | "amber" | "purple" | "emerald" | "orange" | "slate";

type SnapshotItem = {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tab?: SnapshotTab;
  accent: SnapshotAccent;
  navigateHint?: string;
};

interface CandidateActivitySnapshotProps {
  stats: ActivityStats;
  isLoading?: boolean;
  isFetching?: boolean;
  onNavigate?: (tab: SnapshotTab) => void;
  className?: string;
  /** Grid layout for metrics tab; sidebar matches overview quick-stats card */
  variant?: "grid" | "sidebar";
  layout?: "compact" | "wide";
}

const accentStyles: Record<
  SnapshotAccent,
  {
    card: string;
    icon: string;
    iconBg: string;
    value: string;
    ring: string;
    gradient: string;
    rowBg: string;
    rowHoverBg: string;
  }
> = {
  blue: {
    card: "from-blue-50 via-white to-blue-50/30 border-blue-100",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    value: "text-blue-700",
    ring: "ring-blue-400/50",
    gradient: "from-blue-500 to-blue-600",
    rowBg: "bg-blue-50",
    rowHoverBg: "hover:bg-blue-100",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    value: "text-amber-700",
    ring: "ring-amber-400/50",
    gradient: "from-amber-500 to-orange-600",
    rowBg: "bg-amber-50",
    rowHoverBg: "hover:bg-amber-100",
  },
  purple: {
    card: "from-purple-50 via-white to-purple-50/30 border-purple-100",
    icon: "text-purple-600",
    iconBg: "bg-purple-100",
    value: "text-purple-700",
    ring: "ring-purple-400/50",
    gradient: "from-purple-500 to-indigo-600",
    rowBg: "bg-purple-50",
    rowHoverBg: "hover:bg-purple-100",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    value: "text-emerald-700",
    ring: "ring-emerald-400/50",
    gradient: "from-emerald-500 to-green-600",
    rowBg: "bg-emerald-50",
    rowHoverBg: "hover:bg-emerald-100",
  },
  orange: {
    card: "from-orange-50 via-white to-orange-50/30 border-orange-100",
    icon: "text-orange-600",
    iconBg: "bg-orange-100",
    value: "text-orange-700",
    ring: "ring-orange-400/50",
    gradient: "from-orange-500 to-amber-600",
    rowBg: "bg-orange-50",
    rowHoverBg: "hover:bg-orange-100",
  },
  slate: {
    card: "from-slate-50 via-white to-slate-50/30 border-slate-200",
    icon: "text-slate-600",
    iconBg: "bg-slate-100",
    value: "text-slate-700",
    ring: "ring-slate-400/50",
    gradient: "from-gray-500 to-slate-600",
    rowBg: "bg-gray-100",
    rowHoverBg: "hover:bg-gray-200",
  },
};

function buildSnapshotItems(stats: ActivityStats): SnapshotItem[] {
  return [
    {
      label: "Projects",
      value: stats.projectsAssigned,
      subtitle: "Assigned to projects",
      icon: Briefcase,
      tab: "projects",
      accent: "slate",
      navigateHint: "View projects",
    },
    {
      label: "Documentation",
      value: stats.inDocumentation,
      subtitle: "Nominated & verifying",
      icon: FileText,
      tab: "projects",
      accent: "amber",
      navigateHint: "View projects",
    },
    {
      label: "Interview",
      value: stats.inInterview,
      subtitle: "Screening & interviews",
      icon: Mic,
      tab: "projects",
      accent: "blue",
      navigateHint: "View projects",
    },
    {
      label: "Processing",
      value: stats.processingOrDeployed,
      subtitle: "Processing & deployed",
      icon: Plane,
      tab: "projects",
      accent: "emerald",
      navigateHint: "View projects",
    },
    {
      label: "Verified Docs",
      value: stats.verifiedDocuments,
      subtitle: `${stats.pendingDocuments} pending review`,
      icon: ShieldCheck,
      tab: "documents",
      accent: "purple",
      navigateHint: "View documents",
    },
  ];
}

function StatCard({
  item,
  isLoading,
  onNavigate,
}: {
  item: SnapshotItem;
  isLoading?: boolean;
  onNavigate?: (tab: SnapshotTab) => void;
}) {
  const Icon = item.icon;
  const s = accentStyles[item.accent];
  const clickable = Boolean(item.tab && onNavigate);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable && item.tab ? () => onNavigate?.(item.tab!) : undefined}
      className={cn(
        "group relative w-full rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition-all duration-200 focus:outline-none",
        s.card,
        clickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-400/50"
          : "cursor-default"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {item.label}
          </p>
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" aria-label="Loading" />
          ) : (
            <p className={cn("text-3xl font-bold tabular-nums leading-none", s.value)}>
              {item.value}
            </p>
          )}
          {item.subtitle ? (
            <p className="text-xs text-slate-500 line-clamp-2">{item.subtitle}</p>
          ) : null}
        </div>
        <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
          <Icon className={cn("h-5 w-5", s.icon)} aria-hidden />
        </div>
      </div>
      {clickable && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-600">
          <span>{item.navigateHint ?? "Click to open"}</span>
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </div>
      )}
    </button>
  );
}

function SidebarRow({
  item,
  isLoading,
  onNavigate,
  fillHeight = false,
}: {
  item: SnapshotItem;
  isLoading?: boolean;
  onNavigate?: (tab: SnapshotTab) => void;
  fillHeight?: boolean;
}) {
  const Icon = item.icon;
  const s = accentStyles[item.accent];
  const clickable = Boolean(item.tab && onNavigate);

  const content = (
    <>
      <div className="relative flex items-center gap-3 min-w-0 flex-1">
        <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow-sm shrink-0", s.gradient)}>
          <Icon className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-800 tracking-wide">{item.label}</span>
          {item.subtitle ? (
            <p className="text-[11px] text-slate-500 truncate leading-tight">{item.subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="relative shrink-0 pl-2">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Loading" />
        ) : (
          <span
            className={cn(
              "text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent tabular-nums",
              s.gradient
            )}
          >
            {item.value}
          </span>
        )}
      </div>
    </>
  );

  const rowClassName = cn(
    "group relative flex w-full items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-slate-100 shadow-sm transition-all duration-200",
    s.rowBg,
    fillHeight && "flex-1 min-h-0",
    clickable
      ? cn(s.rowHoverBg, "hover:border-slate-200 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50")
      : "cursor-default"
  );

  if (clickable) {
    return (
      <button type="button" onClick={() => onNavigate?.(item.tab!)} className={rowClassName}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}

function SidebarSnapshot({
  stats,
  isLoading,
  isFetching,
  onNavigate,
  className,
}: CandidateActivitySnapshotProps) {
  const items = buildSnapshotItems(stats);

  return (
    <Card
      className={cn(
        "h-full flex flex-col border border-gray-300 rounded-lg shadow-lg bg-white bg-opacity-90 backdrop-blur-md transition-shadow hover:shadow-2xl overflow-hidden",
        className
      )}
    >
      <CardHeader className="border-b border-gray-300 px-6 py-4 shrink-0">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
          <Activity className="h-6 w-6 text-blue-600 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <span>Pipeline Activity</span>
            <p className="text-xs font-normal text-slate-500 mt-0.5">
              Live project & document stats
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {isFetching ? (
              <Loader2 className="h-3 w-3 animate-spin text-emerald-500" aria-hidden />
            ) : (
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden />
            )}
            <span className="text-xs font-medium text-slate-500">Live</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-3 min-h-0">
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {items.map((item) => (
            <SidebarRow
              key={item.label}
              item={item}
              isLoading={isLoading}
              onNavigate={onNavigate}
              fillHeight
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0 pt-3 border-t border-slate-200">
          <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-center border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Target className="h-3 w-3" aria-hidden />
              Profile
            </div>
            <p className="mt-0.5 text-lg font-bold text-slate-800 tabular-nums leading-none">
              {isLoading ? "—" : `${stats.profileCompletion}%`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("history")}
            className="rounded-lg bg-orange-50 px-3 py-2.5 text-center border border-orange-100 transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
              <TrendingUp className="h-3 w-3" aria-hidden />
              Status Log
            </div>
            <p className="mt-0.5 text-lg font-bold text-orange-700 tabular-nums leading-none">
              {isLoading ? "—" : stats.pipelineUpdates}
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateActivitySnapshot({
  stats,
  isLoading = false,
  isFetching = false,
  onNavigate,
  className,
  variant = "grid",
  layout = "compact",
}: CandidateActivitySnapshotProps) {
  if (variant === "sidebar") {
    return (
      <SidebarSnapshot
        stats={stats}
        isLoading={isLoading}
        isFetching={isFetching}
        onNavigate={onNavigate}
        className={className}
      />
    );
  }

  const items: SnapshotItem[] = [
    ...buildSnapshotItems(stats),
    {
      label: "Profile",
      value: `${stats.profileCompletion}%`,
      subtitle: "Completion score",
      icon: Target,
      tab: "overview",
      accent: "blue",
      navigateHint: "View profile",
    },
    {
      label: "Status Log",
      value: stats.pipelineUpdates,
      subtitle: "Pipeline transitions",
      icon: TrendingUp,
      tab: "history",
      accent: "orange",
      navigateHint: "View history",
    },
  ];

  const gridCols =
    layout === "wide"
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
            <Activity className="h-4 w-4 text-white" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Pipeline Activity</p>
            <p className="text-xs text-slate-500">Live project & document stats</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
          {isFetching ? (
            <Loader2 className="h-3 w-3 animate-spin text-blue-500" aria-hidden />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
          )}
          Live
        </div>
      </div>

      <div className={cn("grid gap-4", gridCols)}>
        {items.map((item) => (
          <StatCard
            key={item.label}
            item={item}
            isLoading={isLoading}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}
