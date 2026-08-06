import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { getMiniTileAccent } from "@/lib/tile-accent-styles";

export type WorkflowSubStatusTileStyle = {
  key: string;
  icon: ElementType;
  accent: string;
};

export type WorkflowSubStatusTileStat = {
  label?: string;
  count?: number;
  subStatusName?: string;
};

export function WorkflowSubStatusMiniTiles({
  tileStyles,
  statsByKey,
  gridClassName,
  selectedSubStatus,
  onSubStatusSelect,
}: {
  tileStyles: readonly WorkflowSubStatusTileStyle[];
  statsByKey: Record<string, WorkflowSubStatusTileStat>;
  gridClassName: string;
  selectedSubStatus?: string;
  /** When omitted, tiles are display-only (not clickable). */
  onSubStatusSelect?: (subStatusName: string) => void;
}) {
  const interactive = typeof onSubStatusSelect === "function";

  return (
    <div className={cn("grid auto-rows-fr gap-2 shrink-0", gridClassName)}>
      {tileStyles.map((tileStyle) => {
        const tileStat = statsByKey[tileStyle.key];
        const Icon = tileStyle.icon;
        const mini = getMiniTileAccent(tileStyle.accent);
        const subStatusName = tileStat?.subStatusName;
        const isActive =
          interactive && !!subStatusName && selectedSubStatus === subStatusName;
        const canSelect = interactive && !!subStatusName;
        const sharedClassName = cn(
          "flex h-full w-full min-h-[4.5rem] flex-col items-center justify-center p-2.5 rounded-xl ring-1 transition-all",
          mini.bg,
          mini.ring,
          isActive && "ring-2 shadow-sm scale-[1.02]",
          canSelect
            ? "hover:shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            : "cursor-default",
        );
        const content = (
          <>
            <Icon className={cn("h-4 w-4 mb-1", mini.color)} />
            <span
              className={cn(
                "text-lg font-extrabold tabular-nums leading-none",
                mini.color,
              )}
            >
              {tileStat?.count ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1 leading-none text-center line-clamp-2">
              {tileStat?.label ?? tileStyle.key}
            </span>
          </>
        );

        if (!interactive) {
          return (
            <div
              key={tileStyle.key}
              className={sharedClassName}
              aria-label={`${tileStat?.label ?? tileStyle.key}: ${tileStat?.count ?? 0}`}
            >
              {content}
            </div>
          );
        }

        return (
          <button
            key={tileStyle.key}
            type="button"
            disabled={!subStatusName}
            onClick={() => {
              if (subStatusName) {
                onSubStatusSelect(subStatusName);
              }
            }}
            className={sharedClassName}
            aria-label={`${tileStat?.label ?? tileStyle.key}: ${tileStat?.count ?? 0}`}
            aria-pressed={isActive}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
