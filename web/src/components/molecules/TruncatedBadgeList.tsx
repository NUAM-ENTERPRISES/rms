import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { cn } from "@/lib/utils";

export interface TruncatedBadgeListItem {
  key: string;
  label: string;
}

export interface TruncatedBadgeListProps {
  items: TruncatedBadgeListItem[];
  /** Number of badges shown before collapsing the rest. Defaults to 3. */
  maxVisible?: number;
  emptyLabel?: string;
  /** Tooltip heading, e.g. "All documents". Total count is appended automatically. */
  tooltipLabel?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  badgeClassName?: string;
  moreBadgeClassName?: string;
  className?: string;
}

export function TruncatedBadgeList({
  items,
  maxVisible = 3,
  emptyLabel = "—",
  tooltipLabel = "All items",
  badgeVariant = "secondary",
  badgeClassName,
  moreBadgeClassName,
  className,
}: TruncatedBadgeListProps) {
  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  const visibleItems = items.slice(0, maxVisible);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visibleItems.map((item) => (
        <Badge
          key={item.key}
          variant={badgeVariant}
          className={cn(
            "h-auto max-w-full truncate px-2 py-0.5 text-[10px] font-normal leading-snug",
            badgeClassName,
          )}
        >
          {item.label}
        </Badge>
      ))}

      {hiddenCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              tabIndex={0}
              className={cn(
                "cursor-help border-dashed px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/60",
                moreBadgeClassName,
              )}
              aria-label={`${hiddenCount} more items. Hover to view all ${items.length}.`}
            >
              +{hiddenCount} more
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="start"
            sideOffset={6}
            className="max-w-xs border border-border bg-popover p-0 text-popover-foreground shadow-lg"
          >
            <div className="border-b border-border/60 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">
                {tooltipLabel} ({items.length})
              </p>
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto px-3 py-2">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="text-xs leading-snug text-muted-foreground"
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export interface DocumentTypeTruncatedBadgesProps {
  docTypes: string[];
  maxVisible?: number;
  emptyLabel?: string;
  tooltipLabel?: string;
  badgeVariant?: TruncatedBadgeListProps["badgeVariant"];
  badgeClassName?: string;
  moreBadgeClassName?: string;
  className?: string;
}

export function DocumentTypeTruncatedBadges({
  docTypes,
  maxVisible = 3,
  emptyLabel = "—",
  tooltipLabel = "All documents",
  badgeVariant = "secondary",
  badgeClassName,
  moreBadgeClassName,
  className,
}: DocumentTypeTruncatedBadgesProps) {
  const items = docTypes.map((docType, index) => ({
    key: `${docType}-${index}`,
    label: getDocumentTypeConfig(docType)?.displayName ?? docType,
  }));

  return (
    <TruncatedBadgeList
      items={items}
      maxVisible={maxVisible}
      emptyLabel={emptyLabel}
      tooltipLabel={tooltipLabel}
      badgeVariant={badgeVariant}
      badgeClassName={cn(
        "whitespace-normal",
        badgeClassName,
      )}
      moreBadgeClassName={moreBadgeClassName}
      className={className}
    />
  );
}
