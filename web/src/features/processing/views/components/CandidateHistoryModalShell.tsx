import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CandidateHistoryModalShellProps {
  triggerLabel: string;
  triggerIcon: LucideIcon;
  triggerHoverClass?: string;
  triggerBadgeClass?: string;
  title: string;
  headerIcon: LucideIcon;
  headerIconGradient: string;
  total?: number;
  page: number;
  limit: number;
  itemCount: number;
  totalPages?: number;
  isLoading: boolean;
  error?: unknown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPageChange: (page: number) => void;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
  countBadge?: number;
}

export function CandidateHistoryModalShell({
  triggerLabel,
  triggerIcon: TriggerIcon,
  triggerHoverClass = "hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300",
  triggerBadgeClass = "bg-violet-100 text-violet-700",
  title,
  headerIcon: HeaderIcon,
  headerIconGradient,
  total = 0,
  page,
  limit,
  itemCount,
  totalPages,
  isLoading,
  error,
  open,
  onOpenChange,
  onPageChange,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  children,
  countBadge,
}: CandidateHistoryModalShellProps) {
  const displayCount = countBadge ?? total;
  const pages = totalPages || Math.max(1, Math.ceil(total / limit));

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (val) onPageChange(1);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-11 w-full gap-2 rounded-xl border-slate-200 font-bold transition-all",
            triggerHoverClass,
          )}
        >
          <TriggerIcon className="h-4 w-4" />
          {triggerLabel}
          {displayCount > 0 ? (
            <Badge className={cn("ml-auto border-0 text-xs", triggerBadgeClass)}>
              {displayCount}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex !h-[88vh] !max-h-[88vh] !w-[95vw] !max-w-[95vw] flex-col overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-black">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br",
                headerIconGradient,
              )}
            >
              <HeaderIcon className="h-5 w-5 text-white" />
            </div>
            {title}
            <Badge className="ml-2 border-0 bg-slate-100 font-bold text-slate-600">
              {total ? `${total} events` : "—"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="text-sm text-rose-600">Failed to load history.</div>
            </div>
          ) : itemCount > 0 ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <EmptyIcon className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-500">{emptyTitle}</p>
              <p className="mt-1 text-sm">{emptyDescription}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <div className="text-xs text-muted-foreground">
            Showing {(page - 1) * limit + (itemCount ? 1 : 0)} -{" "}
            {(page - 1) * limit + itemCount} of {total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Prev
            </Button>
            <div className="text-sm">
              {page} / {pages}
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
