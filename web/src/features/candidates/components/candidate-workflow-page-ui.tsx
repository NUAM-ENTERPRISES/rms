import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { ElementType } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileCheck,
  FileText,
  Fingerprint,
  Heart,
  LayoutGrid,
  Mail,
  Plane,
  Stamp,
  Stethoscope,
  Ticket,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageViewer } from "@/components/molecules/ImageViewer";

export const TILE_ACCENT_STYLES: Record<
  string,
  { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }
> = {
  blue: {
    card: "from-blue-50 via-white to-blue-50/30 border-blue-100",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    value: "text-blue-700",
    ring: "ring-blue-500/40",
    dot: "bg-blue-500",
  },
  indigo: {
    card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100",
    icon: "text-indigo-600",
    iconBg: "bg-indigo-100",
    value: "text-indigo-700",
    ring: "ring-indigo-500/40",
    dot: "bg-indigo-500",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    value: "text-amber-700",
    ring: "ring-amber-500/40",
    dot: "bg-amber-500",
  },
  orange: {
    card: "from-orange-50 via-white to-orange-50/30 border-orange-100",
    icon: "text-orange-600",
    iconBg: "bg-orange-100",
    value: "text-orange-700",
    ring: "ring-orange-500/40",
    dot: "bg-orange-500",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    value: "text-emerald-700",
    ring: "ring-emerald-500/40",
    dot: "bg-emerald-500",
  },
  red: {
    card: "from-red-50 via-white to-red-50/30 border-red-100",
    icon: "text-red-600",
    iconBg: "bg-red-100",
    value: "text-red-700",
    ring: "ring-red-500/40",
    dot: "bg-red-500",
  },
  purple: {
    card: "from-purple-50 via-white to-purple-50/30 border-purple-100",
    icon: "text-purple-600",
    iconBg: "bg-purple-100",
    value: "text-purple-700",
    ring: "ring-purple-500/40",
    dot: "bg-purple-500",
  },
};

export const TILE_ACCENTS = ["blue", "indigo", "amber", "orange", "emerald", "red", "purple"] as const;

export type WorkflowFilterTile = {
  id: string;
  label: string;
  count: number;
  accent: (typeof TILE_ACCENTS)[number];
  icon: ElementType;
};

type WorkflowTheme = "documents" | "screening" | "interview" | "processing";

const THEME_CONFIG: Record<
  WorkflowTheme,
  {
    border: string;
    gradient: string;
    muted: string;
    chip: string;
    statLabel: string;
  }
> = {
  documents: {
    border: "border-amber-200/50",
    gradient: "from-amber-600 via-amber-500 to-orange-600",
    muted: "text-amber-100",
    chip: "text-amber-50",
    statLabel: "text-amber-100",
  },
  screening: {
    border: "border-cyan-200/50",
    gradient: "from-cyan-600 via-teal-500 to-emerald-600",
    muted: "text-cyan-100",
    chip: "text-cyan-50",
    statLabel: "text-cyan-100",
  },
  interview: {
    border: "border-purple-200/50",
    gradient: "from-purple-600 via-violet-500 to-indigo-600",
    muted: "text-purple-100",
    chip: "text-purple-50",
    statLabel: "text-purple-100",
  },
  processing: {
    border: "border-orange-200/50",
    gradient: "from-orange-600 via-orange-500 to-amber-600",
    muted: "text-orange-100",
    chip: "text-orange-50",
    statLabel: "text-orange-100",
  },
};

type CandidateHeaderInfo = {
  firstName: string;
  lastName: string;
  email?: string | null;
  profileImage?: string | null;
};

type WorkflowPageHeaderProps = {
  theme: WorkflowTheme;
  candidateId: string;
  candidate: CandidateHeaderInfo;
  breadcrumbSegment: string;
  workflowBadge: string;
  description: string;
  stageLabel: string;
  badgeIcon: ElementType;
  avatarBadgeIcon: ElementType;
  totalAll: number;
  filteredCount: number;
  activeFilterLabel: string;
  onBack: () => void;
};

export function WorkflowPageHeader({
  theme,
  candidateId,
  candidate,
  breadcrumbSegment,
  workflowBadge,
  description,
  stageLabel,
  badgeIcon: BadgeIcon,
  avatarBadgeIcon: AvatarBadgeIcon,
  totalAll,
  filteredCount,
  activeFilterLabel,
  onBack,
}: WorkflowPageHeaderProps) {
  const styles = THEME_CONFIG[theme];

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br text-white shadow-lg",
        styles.border,
        styles.gradient,
      )}
    >
      <div
        className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-white/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_50%)]"
        aria-hidden
      />

      <div className="relative p-5 md:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-xl hover:bg-white/15 text-white border border-white/25 shrink-0 h-9 w-9"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-xs md:text-sm min-w-0", styles.muted)}>
              <Link to="/candidates" className="hover:text-white transition-colors shrink-0">
                Candidates
              </Link>
              <span className="text-white/40 shrink-0">/</span>
              <Link
                to={`/candidates/${candidateId}`}
                className="hover:text-white transition-colors truncate max-w-[120px] md:max-w-[200px]"
              >
                {candidate.firstName} {candidate.lastName}
              </Link>
              <span className="text-white/40 shrink-0">/</span>
              <span className="text-white font-medium shrink-0">{breadcrumbSegment}</span>
            </nav>
          </div>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="shrink-0 h-8 rounded-lg bg-white/15 text-white border border-white/25 hover:bg-white/25 shadow-none"
          >
            <Link to={`/candidates/${candidateId}`}>
              <User className="h-3.5 w-3.5 mr-1.5" />
              View profile
            </Link>
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="rounded-2xl p-0.5 bg-gradient-to-br from-white/50 to-white/10 shadow-lg">
                <ImageViewer
                  src={candidate.profileImage}
                  title={`${candidate.firstName} ${candidate.lastName}`}
                  className="h-[4.5rem] w-[4.5rem] md:h-20 md:w-20 rounded-[0.875rem] border-2 border-white/40"
                  enableHoverPreview={true}
                />
              </div>
              <div
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                title="Active candidate"
              >
                <AvatarBadgeIcon className="h-3 w-3 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
                  {candidate.firstName} {candidate.lastName}
                </h1>
                <Badge className="bg-white/20 text-white border-white/30 font-semibold px-3 py-1 rounded-full text-[11px] w-fit backdrop-blur-sm">
                  <BadgeIcon className="h-3 w-3 mr-1" />
                  {workflowBadge}
                </Badge>
              </div>
              <p className={cn("text-sm mt-1", styles.muted)}>{description}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {candidate.email && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs",
                      styles.chip,
                    )}
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[220px] md:max-w-none">{candidate.email}</span>
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs",
                    styles.chip,
                  )}
                >
                  <Calendar className="h-3 w-3 shrink-0" />
                  {format(new Date(), "dd MMM yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 lg:min-w-[280px] lg:max-w-sm shrink-0 w-full lg:w-auto">
            <div className="rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-2.5">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", styles.statLabel)}>
                Total projects
              </p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">{totalAll}</p>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-2.5">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider truncate", styles.statLabel)}>
                Showing
              </p>
              <p className="text-lg font-bold tabular-nums mt-0.5 leading-tight">{filteredCount}</p>
              <p className={cn("text-[10px] truncate mt-0.5 opacity-80", styles.statLabel)}>{activeFilterLabel}</p>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-2.5 col-span-2 sm:col-span-1">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", styles.statLabel)}>Stage</p>
              <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {stageLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

type WorkflowFilterTilesProps = {
  sectionLabel: string;
  tiles: WorkflowFilterTile[];
  selectedId: string;
  onSelect: (id: string) => void;
  gridClassName?: string;
};

export function WorkflowFilterTiles({
  sectionLabel,
  tiles,
  selectedId,
  onSelect,
  gridClassName = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2",
}: WorkflowFilterTilesProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1">{sectionLabel}</p>
      <div className={gridClassName}>
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const accent = TILE_ACCENT_STYLES[tile.accent] ?? TILE_ACCENT_STYLES.blue;
          const isActive = selectedId === tile.id;

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              aria-pressed={isActive}
              aria-label={`${tile.label}: ${tile.count} projects`}
              className={cn(
                "group relative flex items-center gap-2.5 text-left rounded-xl border bg-gradient-to-br min-h-[4.25rem] px-3 py-3 shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                accent.card,
                isActive ? `ring-2 shadow-sm ${accent.ring}` : "hover:shadow-md",
              )}
            >
              {isActive && (
                <span className={cn("absolute top-2 right-2 h-1.5 w-1.5 rounded-full animate-pulse", accent.dot)} />
              )}
              <div className={cn("shrink-0 self-center rounded-lg p-2", accent.iconBg)}>
                <Icon className={cn("h-3.5 w-3.5", accent.icon)} />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-1 py-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 leading-snug line-clamp-2">
                  {tile.label}
                </p>
                <p className={cn("text-lg font-bold tabular-nums leading-none", accent.value)}>{tile.count}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function buildAllStatusTiles(
  subStatuses: Array<{ id: string; label?: string; name?: string }>,
  countById: Record<string, number>,
  totalAll: number,
  getIcon: (name?: string) => ElementType,
  allLabel = "All Statuses",
): WorkflowFilterTile[] {
  const fromConfig = subStatuses.map((ss, index) => ({
    id: ss.id,
    label: ss.label || ss.name || "Unknown",
    count: countById[ss.id] ?? 0,
    accent: TILE_ACCENTS[index % TILE_ACCENTS.length],
    icon: getIcon(ss.name),
  }));

  return [
    {
      id: "all",
      label: allLabel,
      count: totalAll,
      accent: "blue",
      icon: LayoutGrid,
    },
    ...fromConfig,
  ];
}

export const PROCESSING_STEP_TILES: Array<{
  id: string;
  label: string;
  accent: (typeof TILE_ACCENTS)[number];
  icon: ElementType;
}> = [
  { id: "all", label: "All Steps", accent: "blue", icon: LayoutGrid },
  { id: "offer_letter", label: "Offer Letter", accent: "indigo", icon: FileText },
  { id: "documents_received", label: "Docs Received", accent: "amber", icon: FileCheck },
  { id: "hrd", label: "HRD", accent: "purple", icon: Stamp },
  { id: "data_flow", label: "Data Flow", accent: "blue", icon: FileText },
  { id: "eligibility", label: "Eligibility", accent: "emerald", icon: FileCheck },
  { id: "prometric", label: "Licensing Exam", accent: "orange", icon: Stethoscope },
  { id: "council_registration", label: "Council Reg.", accent: "indigo", icon: Stamp },
  { id: "document_attestation", label: "Attestation", accent: "amber", icon: FileCheck },
  { id: "medical", label: "Medical", accent: "red", icon: Heart },
  { id: "biometrics", label: "Biometrics", accent: "purple", icon: Fingerprint },
  { id: "visa", label: "Visa", accent: "blue", icon: Stamp },
  { id: "emigration", label: "Emigration", accent: "orange", icon: Plane },
  { id: "ticket", label: "Ticket", accent: "emerald", icon: Ticket },
];

export function buildProcessingStepFilterTiles(
  countByStep: Record<string, number>,
  totalAll: number,
): WorkflowFilterTile[] {
  return PROCESSING_STEP_TILES.map((step) => ({
    id: step.id,
    label: step.label,
    count: step.id === "all" ? totalAll : countByStep[step.id] ?? 0,
    accent: step.accent,
    icon: step.icon,
  }));
}
