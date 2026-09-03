import { Sparkles, CircleCheck, TriangleAlert, CirclePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CatalogMappingResult } from "../data/dto";

interface CatalogMappingCardProps {
  title: string;
  mapping: CatalogMappingResult;
  /** Extra choices beyond the shortlist, e.g. the full qualification catalog. */
  extraOptions?: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
  onProposeNewValue?: (value: string) => void;
  disabled?: boolean;
}

const DECISION_META: Record<
  CatalogMappingResult["decision"],
  { label: string; icon: typeof CircleCheck; tone: string }
> = {
  exact: {
    label: "Matched",
    icon: CircleCheck,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  alias: {
    label: "Known alias",
    icon: CircleCheck,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  ai_match: {
    label: "AI suggestion",
    icon: Sparkles,
    tone: "bg-primary/10 text-primary",
  },
  ai_new_value: {
    label: "Not in catalog",
    icon: CirclePlus,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  needs_review: {
    label: "Needs review",
    icon: TriangleAlert,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  empty: {
    label: "Blank",
    icon: TriangleAlert,
    tone: "bg-muted text-muted-foreground",
  },
};

/**
 * Shows how one spreadsheet value resolved against a catalog and lets the
 * reviewer override it.
 *
 * The AI's reasoning and confidence are always visible, because a suggestion
 * the reviewer cannot interrogate is a suggestion they cannot trust.
 */
export function CatalogMappingCard({
  title,
  mapping,
  extraOptions,
  onChange,
  onProposeNewValue,
  disabled,
}: CatalogMappingCardProps) {
  const meta = DECISION_META[mapping.decision] ?? DECISION_META.needs_review;
  const Icon = meta.icon;

  const options = [
    ...mapping.options.map((option) => ({
      id: option.id,
      label: option.label || option.name,
    })),
    ...(extraOptions ?? []).filter(
      (extra) => !mapping.options.some((option) => option.id === extra.id),
    ),
  ];

  const selectId = `catalog-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const showsConfidence =
    mapping.decision === "ai_match" || mapping.decision === "needs_review";

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Label htmlFor={selectId} className="text-xs text-muted-foreground">
            {title}
          </Label>
          <p className="truncate text-sm font-medium text-foreground">
            {mapping.raw || "—"}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn("shrink-0 gap-1 border-0", meta.tone)}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {meta.label}
        </Badge>
      </div>

      <div className="mt-2">
        <Select
          value={mapping.matchedId ?? ""}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger id={selectId} className="h-9">
            <SelectValue placeholder="Choose a catalog value" />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <SelectItem value="__none" disabled>
                No close matches
              </SelectItem>
            ) : (
              options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {mapping.reason ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {mapping.reason}
          {showsConfidence && mapping.confidence > 0
            ? ` (${Math.round(mapping.confidence * 100)}% confident)`
            : null}
        </p>
      ) : null}

      {mapping.proposedNewValue && onProposeNewValue ? (
        <button
          type="button"
          onClick={() => onProposeNewValue(mapping.proposedNewValue!)}
          disabled={disabled}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          <CirclePlus className="h-3 w-3" aria-hidden="true" />
          Add &ldquo;{mapping.proposedNewValue}&rdquo; to the catalog
        </button>
      ) : null}
    </div>
  );
}
