import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CountryRestrictionsPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

interface CountryRestrictionsPaginationProps {
  pagination: CountryRestrictionsPaginationMeta;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

export function CountryRestrictionsPagination({
  pagination,
  onPageChange,
  isLoading = false,
  className,
  compact = false,
}: CountryRestrictionsPaginationProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const start =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border/60 pt-3",
        className,
      )}
    >
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        Showing{" "}
        <span className="font-semibold text-foreground">
          {start}–{end}
        </span>{" "}
        of <span className="font-semibold text-foreground">{pagination.total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "sm"}
          className={compact ? "h-7 w-7" : "h-8 px-2"}
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          disabled={isLoading || pagination.page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
        <span
          className={cn(
            "min-w-[3.5rem] text-center font-semibold text-foreground",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          {pagination.page}{" "}
          <span className="font-normal text-muted-foreground">
            / {pagination.totalPages}
          </span>
        </span>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "sm"}
          className={compact ? "h-7 w-7" : "h-8 px-2"}
          onClick={() =>
            onPageChange(Math.min(pagination.totalPages, pagination.page + 1))
          }
          disabled={isLoading || pagination.page >= pagination.totalPages}
          aria-label="Next page"
        >
          <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </div>
    </div>
  );
}
