import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoleTypeBadgeProps {
  isSystem: boolean;
  className?: string;
}

export function RoleTypeBadge({ isSystem, className }: RoleTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-lg px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        isSystem
          ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        className,
      )}
    >
      {isSystem ? "System" : "Custom"}
    </Badge>
  );
}
