import { cn } from "@/lib/utils";

export const optionalControlClassName =
  "border-dashed border-border bg-muted/40";

export function OptionalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-secondary px-1.5 py-px text-[10px] font-medium leading-4 text-muted-foreground",
        className,
      )}
    >
      Optional
    </span>
  );
}
