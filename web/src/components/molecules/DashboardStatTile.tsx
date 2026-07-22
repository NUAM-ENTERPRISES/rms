import type { ElementType, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTileAccent } from "@/lib/tile-accent-styles";

export type DashboardStatTileProps = {
  accent: string;
  label: string;
  value: string | number;
  subtitle?: string;
  icon: ElementType;
  active?: boolean;
  interactive?: boolean;
  footerText?: string;
  onClick?: () => void;
  className?: string;
  as?: "button" | "div";
  size?: "default" | "compact";
  valueAddon?: ReactNode;
  children?: ReactNode;
};

export function DashboardStatTile({
  accent,
  label,
  value,
  subtitle,
  icon: Icon,
  active = false,
  interactive = false,
  footerText,
  onClick,
  className,
  as,
  size = "default",
  valueAddon,
  children,
}: DashboardStatTileProps) {
  const s = getTileAccent(accent);
  const isButton = as === "button" || (as === undefined && interactive);
  const showFooter = footerText !== undefined;
  const isCompact = size === "compact";

  const content = (
    <>
      {active && (
        <span
          className={cn(
            "absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse",
            s.dot,
          )}
        />
      )}
      <div className="flex min-h-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              "font-semibold uppercase tracking-wider",
              isCompact
                ? "text-[10px] line-clamp-1 min-h-[0.875rem]"
                : "text-xs line-clamp-2 min-h-[2rem]",
              s.label,
            )}
          >
            {label}
          </p>
          <div className={cn("flex items-end gap-2", !valueAddon && "block")}>
            <p
              className={cn(
                "font-bold tabular-nums leading-none",
                isCompact ? "text-2xl" : "text-3xl",
                s.value,
              )}
            >
              {value}
            </p>
            {valueAddon}
          </div>
          {subtitle !== undefined && (
            <p
              className={cn(
                "text-xs line-clamp-2",
                isCompact ? "min-h-[2rem]" : "min-h-[2.5rem]",
                s.subtitle,
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "shrink-0 rounded-xl shadow-sm",
            isCompact ? "p-2" : "p-2.5",
            s.iconBg,
          )}
        >
          <Icon className={cn(isCompact ? "h-4 w-4" : "h-5 w-5", s.icon)} />
        </div>
      </div>
      {children}
      {showFooter && (
        <div
          className={cn(
            "mt-auto flex items-center gap-1 font-medium transition-colors",
            isCompact ? "pt-2 text-[10px]" : "pt-3 text-xs",
            s.footer,
          )}
        >
          <span>{footerText}</span>
          <ArrowUpRight className={cn(isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} />
        </div>
      )}
    </>
  );

  const tileClassName = cn(
    "group relative flex h-full w-full flex-col text-left rounded-2xl border bg-gradient-to-br shadow-sm",
    isCompact ? "p-4" : "p-5",
    s.card,
    interactive &&
      (active
        ? `ring-2 shadow-md ${s.ring}`
        : "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 focus:outline-none"),
    className,
  );

  if (isButton) {
    return (
      <button type="button" onClick={onClick} className={tileClassName}>
        {content}
      </button>
    );
  }

  return <div className={tileClassName}>{content}</div>;
}
