import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Candidate } from "../api";
import { resolveCandidateProfileCompletion } from "../profileCompletion";

type Props = {
  candidate: Candidate;
  /** Optional; used when `profileCompletion` is absent on the candidate (local fallback). */
  documents?: Array<{ docType?: string }>;
  variant: "circular" | "compact";
  className?: string;
  /** e.g. switch to Overview tab on the detail page */
  onNavigateToOverview?: () => void;
};

function ringGeom(variant: "circular" | "compact") {
  // compact is used inside dense tables — slightly larger to avoid being cramped
  const r = variant === "compact" ? 19 : 20;
  const px = variant === "compact" ? 52 : 56;
  const vb = variant === "compact" ? 52 : 56;
  return { r, c: 2 * Math.PI * r, px, vb };
}

function buildAriaLabel(percent: number, missingCount: number): string {
  if (missingCount === 0) {
    return `Profile complete, ${percent} percent`;
  }
  return `Profile ${percent} percent complete, ${missingCount} item${
    missingCount === 1 ? "" : "s"
  } missing`;
}

export function CandidateProfileCompletion({
  candidate,
  documents,
  variant,
  className,
  onNavigateToOverview,
}: Props) {
  const completion = resolveCandidateProfileCompletion(
    candidate,
    documents
  );
  const { percent, missing } = completion;
  const { r, c, px, vb } = ringGeom(variant);
  const offset = c - (percent / 100) * c;
  const aria = buildAriaLabel(percent, missing.length);
  const hasMissing = missing.length > 0;

  const missingPreview = missing.slice(0, 8);
  const more = missing.length - missingPreview.length;

  const content = (
    <div
      className={cn(
        "flex items-center gap-2",
        variant === "circular" && "flex-col sm:flex-row sm:items-center",
        className
      )}
    >
      {variant === "circular" && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center sm:text-left">
          Profile completion
        </p>
      )}
      <div
        className="relative shrink-0"
        style={{ width: px, height: px }}
      >
        <svg
          className="-rotate-90"
          width={px}
          height={px}
          viewBox={`0 0 ${vb} ${vb}`}
          role="img"
          aria-hidden
        >
          <circle
            cx={vb / 2}
            cy={vb / 2}
            r={r}
            className="fill-none stroke-border"
            strokeWidth={variant === "compact" ? 5 : 4}
          />
          <circle
            cx={vb / 2}
            cy={vb / 2}
            r={r}
            className={cn(
              "fill-none transition-[stroke-dashoffset] duration-500",
              hasMissing ? "stroke-rose-500" : "stroke-emerald-500"
            )}
            strokeWidth={variant === "compact" ? 5 : 4}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
            hasMissing ? "text-rose-600" : "text-emerald-600",
            variant === "compact" ? "text-xs" : "text-xs"
          )}
        >
          {percent}%
        </span>
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-xl border border-transparent p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            variant === "compact" && "p-0.5 hover:bg-muted/40"
          )}
          aria-label={aria}
          onClick={(e) => {
            if (!onNavigateToOverview) return;
            e.preventDefault();
            e.stopPropagation();
            onNavigateToOverview();
          }}
        >
          {variant === "compact" ? (
            <div className="flex items-center justify-center">{content}</div>
          ) : (
            content
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        className="max-w-xs border-border bg-popover text-popover-foreground"
      >
        <p className="mb-1 text-xs font-semibold">
          {percent}% — {completion.completedCount}/{completion.requiredCount}{" "}
          required items
        </p>
        {missing.length === 0 ? (
          <p className="text-xs text-muted-foreground">All required items are present.</p>
        ) : (
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {missingPreview.map((m) => (
              <li key={`${m.kind}-${m.key}`}>{m.label}</li>
            ))}
            {more > 0 ? (
              <li className="list-none pl-0 text-[11px]">+{more} more</li>
            ) : null}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function CandidateProfileCompletionCell({
  candidate,
}: {
  candidate: Candidate;
}) {
  return (
    <div className="flex justify-center">
      <CandidateProfileCompletion
        candidate={candidate}
        variant="compact"
      />
    </div>
  );
}
