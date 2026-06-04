import type { ElementType } from "react";
import { cn } from "@/lib/utils";

export type WorkflowSubStatusTileStyle = {
  key: string;
  icon: ElementType;
  color: string;
  bg: string;
  ring: string;
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
  onSubStatusSelect: (subStatusName: string) => void;
}) {
  return (
    <div className={cn("grid gap-2 shrink-0", gridClassName)}>
      {tileStyles.map((tileStyle) => {
        const tileStat = statsByKey[tileStyle.key];
        const Icon = tileStyle.icon;
        const subStatusName = tileStat?.subStatusName;
        const isActive =
          !!subStatusName && selectedSubStatus === subStatusName;
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
            className={cn(
              "flex flex-col items-center p-2.5 rounded-xl ring-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              tileStyle.bg,
              tileStyle.ring,
              isActive && "ring-2 shadow-sm scale-[1.02]",
              subStatusName
                ? "hover:shadow-sm cursor-pointer"
                : "cursor-default opacity-70",
            )}
            aria-label={`${tileStat?.label ?? tileStyle.key}: ${tileStat?.count ?? 0}`}
            aria-pressed={isActive}
          >
            <Icon className={cn("h-4 w-4 mb-1", tileStyle.color)} />
            <span
              className={cn(
                "text-lg font-extrabold tabular-nums leading-none",
                tileStyle.color,
              )}
            >
              {tileStat?.count ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1 leading-none text-center line-clamp-2">
              {tileStat?.label ?? tileStyle.key}
            </span>
          </button>
        );
      })}
    </div>
  );
}
