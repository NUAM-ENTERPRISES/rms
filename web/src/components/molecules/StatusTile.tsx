import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusTileProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  bgGradient?: string;
  iconBg?: string;
  textColor?: string;
  active?: boolean;
  onClick?: () => void;
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
  scrollOnClick?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function StatusTile({
  label,
  value,
  subtitle,
  icon: Icon,
  bgGradient = "from-slate-100 to-slate-200",
  iconBg = "bg-slate-200/40",
  textColor = "text-slate-700",
  active,
  onClick,
  scrollTargetRef,
  scrollOnClick = false,
  className,
  ariaLabel,
}: StatusTileProps) {
  const handleActivate = () => {
    onClick?.();

    if (scrollOnClick && scrollTargetRef?.current) {
      window.requestAnimationFrame(() => {
        scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleActivate : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleActivate();
              }
            }
          : undefined
      }
      aria-label={ariaLabel}
      className={cn(
        "border-0 shadow-sm rounded-xl transition-all duration-200",
        onClick ? "cursor-pointer hover:shadow-md transform hover:-translate-y-0.5" : "",
        bgGradient ? `bg-gradient-to-br ${bgGradient}` : "",
        active ? "ring-2 ring-blue-500/30 shadow-md" : "",
        className
      )}
    >
      <CardContent className="pt-2 pb-2 px-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-600 mb-0.5 truncate uppercase tracking-wider">
              {label}
            </p>
            <h3 className={cn("text-lg font-bold", textColor)}>{value}</h3>
            {subtitle ? (
              <p className="text-[9px] text-slate-500 mt-0.5 truncate">{subtitle}</p>
            ) : null}
          </div>

          <div className={cn("p-0.5 rounded-full", iconBg)}>
            <Icon className={cn("h-3.5 w-3.5", textColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
