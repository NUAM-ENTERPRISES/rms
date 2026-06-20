import { useEffect, useRef, useState } from "react";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Layers,
  Briefcase,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useGetCandidateProjectStatusChangeRequestHistoryQuery,
  type StatusChangeRequestHistoryItem,
} from "@/features/candidates/api";
import {
  getStatusChangeRequestAccent,
  getStatusChangeRequestDisplay,
} from "@/features/candidates/utils/statusChangeRequestDisplay";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "border-amber-300/80 bg-amber-50 text-amber-800 shadow-sm",
    icon: Clock,
    ring: "ring-amber-100/80",
  },
  approved: {
    label: "Approved",
    className: "border-emerald-300/80 bg-emerald-50 text-emerald-800 shadow-sm",
    icon: CheckCircle2,
    ring: "ring-emerald-100/80",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-300/80 bg-red-50 text-red-800 shadow-sm",
    icon: XCircle,
    ring: "ring-red-100/80",
  },
} as const;

interface StatusChangeRequestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProjectMapId: string;
  candidateName: string;
  projectTitle: string;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

interface HistoryPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}

function HistoryPagination({
  page,
  totalPages,
  total,
  limit,
  isFetching,
  onPageChange,
}: HistoryPaginationProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);
  const visiblePages = getVisiblePageNumbers(page, totalPages);

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-medium text-slate-500">
        {total === 0 ? (
          "No requests to display"
        ) : (
          <>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">{total}</span>{" "}
            requests
          </>
        )}
      </p>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 border-slate-200 bg-white/90 px-2.5 text-xs shadow-sm hover:bg-indigo-50"
          disabled={page <= 1 || isFetching || totalPages <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Prev
        </Button>

        <div
          className="flex items-center gap-1"
          role="navigation"
          aria-label="Request history pages"
        >
          {visiblePages.map((pageNumber) => {
            const isActive = pageNumber === page;

            return (
              <Button
                key={pageNumber}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 min-w-8 px-2 text-xs shadow-sm",
                  isActive
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border-slate-200 bg-white/90 hover:bg-indigo-50",
                )}
                disabled={isFetching}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 border-slate-200 bg-white/90 px-2.5 text-xs shadow-sm hover:bg-indigo-50"
          disabled={page >= totalPages || isFetching || totalPages <= 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function HistoryRequestCard({ request }: { request: StatusChangeRequestHistoryItem }) {
  const statusKey = request.status as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const display = getStatusChangeRequestDisplay(request);
  const accent = getStatusChangeRequestAccent(
    request.requestType,
    request.requestedStatus,
  );
  const CategoryIcon =
    display.category === "processing" ? Briefcase : Layers;

  return (
    <article
      className={cn(
        "rounded-xl border border-l-[3px] px-3 py-2.5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md",
        accent.card,
        accent.leftAccent,
        config.ring,
        "ring-1 ring-inset ring-white/60",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm",
            accent.iconWrap,
          )}
        >
          <CategoryIcon className="h-3.5 w-3.5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("h-5 px-1.5 text-[10px] shadow-sm", accent.category)}
                >
                  {display.category === "processing" ? "Processing" : "Pipeline"}
                </Badge>
                <h3 className="text-sm font-semibold leading-tight text-slate-900">
                  {display.headline}
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                Submitted {formatDate(request.createdAt)}
                {" · "}
                {request.requester?.name ?? "Unknown"}
                {request.reviewedAt ? (
                  <>
                    {" · "}
                    Reviewed {formatDate(request.reviewedAt)}
                    {request.reviewer?.name ? ` by ${request.reviewer.name}` : ""}
                  </>
                ) : (
                  " · Awaiting review"
                )}
              </p>
            </div>

            <Badge
              variant="outline"
              className={cn("h-6 shrink-0 gap-1 px-2 text-[11px]", config.className)}
            >
              <StatusIcon className="h-3 w-3" aria-hidden />
              {config.label}
            </Badge>
          </div>

          {display.processingTransition && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 shadow-inner",
                accent.noteSurface,
              )}
            >
              <span className="text-[11px] font-medium text-slate-600">
                {display.processingTransition.actionPhrase}
              </span>
              <Badge
                variant="outline"
                className="h-5 border-white/80 bg-white/70 px-1.5 text-[10px] font-medium text-slate-700"
              >
                {display.processingTransition.fromLabel}
              </Badge>
              <ArrowRight
                className="h-3 w-3 shrink-0 text-slate-400"
                aria-hidden
              />
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-[10px] font-semibold shadow-sm",
                  accent.targetBadge,
                )}
              >
                {display.processingTransition.toLabel}
              </Badge>
              {display.stepLabel ? (
                <Badge
                  variant="outline"
                  className="h-5 border-white/80 bg-white/70 px-1.5 text-[10px] text-slate-700"
                >
                  {display.stepLabel}
                </Badge>
              ) : null}
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            <div
              className={cn(
                "rounded-lg border px-2.5 py-2 shadow-inner",
                accent.noteSurface,
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Reason
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-800">
                {request.reason?.trim() ? request.reason : "No reason provided."}
              </p>
            </div>

            {request.reviewNotes?.trim() ? (
              <div className="rounded-lg border border-indigo-100/70 bg-indigo-50/35 px-2.5 py-2 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700/80">
                  Reviewer notes
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-800">
                  {request.reviewNotes}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function StatusChangeRequestHistoryModal({
  isOpen,
  onClose,
  candidateProjectMapId,
  candidateName,
  projectTitle,
}: StatusChangeRequestHistoryModalProps) {
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const limit = 5;

  useEffect(() => {
    if (isOpen) {
      setPage(1);
    }
  }, [isOpen, candidateProjectMapId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const { data, isLoading, isFetching } =
    useGetCandidateProjectStatusChangeRequestHistoryQuery(
      { candidateProjectMapId, page, limit },
      { skip: !isOpen || !candidateProjectMapId },
    );

  const requests = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;
  const showPagination = !isLoading && meta !== undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(480px,72vh)] max-h-[72vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-slate-200/90 bg-slate-100 p-0 shadow-2xl sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-0 border-b border-indigo-100/80 bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50/70 px-5 pb-3 pt-5">
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md ring-2 ring-white/80">
              <History className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-slate-900">
                Request History
              </DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600">
                Pipeline and processing requests for{" "}
                <span className="font-semibold text-slate-900">{candidateName}</span>{" "}
                on{" "}
                <span className="font-semibold text-slate-900">{projectTitle}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-100 via-slate-50/90 to-indigo-50/30 px-5 py-3",
            isFetching && !isLoading && "opacity-70",
          )}
        >
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 shadow-sm"
                >
                  <div className="mb-2 h-3 w-1/3 rounded bg-slate-200/80" />
                  <div className="h-2.5 w-2/3 rounded bg-slate-200/60" />
                </div>
              ))
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300/70 bg-white/50 py-10 shadow-inner">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-indigo-100 text-indigo-400 shadow-sm">
                  <Inbox className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-slate-800">No requests yet</p>
                <p className="max-w-md text-center text-xs text-slate-500">
                  Withdrawn, On Hold, and processing status change requests will
                  appear here once submitted.
                </p>
              </div>
            ) : (
              requests.map((request) => (
                <HistoryRequestCard key={request.id} request={request} />
              ))
            )}
          </div>
        </div>

        {showPagination ? (
          <HistoryPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            isFetching={isFetching}
            onPageChange={setPage}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
