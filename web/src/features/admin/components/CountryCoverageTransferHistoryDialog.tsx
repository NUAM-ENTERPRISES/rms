import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlagIcon } from "@/shared";
import { useCan } from "@/hooks/useCan";
import {
  useGetCountryCoverageTransferHistoryCandidatesQuery,
  useGetCountryCoverageTransferHistoryQuery,
  type CountryCoverageTransferHistoryItem,
} from "../api/countryCoverageApi";

export interface CountryCoverageTransferHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryCode: string;
  countryName?: string;
}

const TRANSFER_PAGE_SIZE = 10;
const CANDIDATE_PAGE_SIZE = 10;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function transferModeLabel(mode: string) {
  if (mode === "auto_split") return "Auto split";
  if (mode === "manual") return "Manual assign";
  if (mode === "coverage_only") return "Coverage only";
  return mode;
}

function CountryChips({ codes }: { codes?: string[] | null }) {
  const list = codes ?? [];
  if (list.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((code) => (
        <span
          key={code}
          className="inline-flex items-center gap-1 rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
        >
          <FlagIcon countryCode={code} size="sm" />
          {code}
        </span>
      ))}
    </div>
  );
}

function TransferCandidatesPanel({
  countryCode,
  transferId,
  transferredAt,
  candidateCount,
  canReadCandidates,
}: {
  countryCode: string;
  transferId: string;
  transferredAt: string;
  candidateCount: number;
  canReadCandidates: boolean;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError } =
    useGetCountryCoverageTransferHistoryCandidatesQuery({
      countryCode,
      transferId,
      page,
      limit: CANDIDATE_PAGE_SIZE,
    });

  const items = data?.data?.items ?? [];
  const pagination = data?.data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);
  const total = pagination?.total ?? candidateCount;

  if (isLoading && items.length === 0) {
    return (
      <div className="mt-3 flex items-center justify-center rounded-lg border border-border bg-slate-50 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
        Unable to load candidate handoffs. Try again.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        No candidate handoffs — coverage move only.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Handoff</th>
              <th className="px-3 py-2 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr
                key={`${transferId}-${c.candidateId}`}
                className="border-t border-border"
              >
                <td className="px-3 py-2 font-medium text-slate-900">
                  {canReadCandidates ? (
                    <Link
                      to={`/candidates/${c.candidateId}`}
                      className="text-teal-700 hover:underline"
                    >
                      {c.candidateName}
                    </Link>
                  ) : (
                    c.candidateName
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{c.statusName}</td>
                <td className="px-3 py-2 text-slate-700">
                  <span className="font-medium">{c.fromRecruiter.name}</span>
                  <span className="mx-1 text-slate-400">→</span>
                  <span className="font-medium">{c.toRecruiter.name}</span>
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {formatDateTime(transferredAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2">
          <span className="text-[11px] text-slate-500">
            Page {safePage} of {totalPages} · {total} candidates
            {isFetching ? " · loading…" : ""}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={safePage <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous candidates page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={safePage >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next candidates page"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      {totalPages <= 1 && total > 0 && (
        <p className="text-[11px] text-slate-500">
          Showing {total} candidate{total === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

function TransferCard({
  item,
  countryCode,
  canReadCandidates,
}: {
  item: CountryCoverageTransferHistoryItem;
  countryCode: string;
  canReadCandidates: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const candidateCount = item.candidateCount ?? 0;
  const hasCandidates = candidateCount > 0;
  const sourceName = item.sourceUser?.name ?? "Unknown";
  const actorName = item.transferredBy?.name ?? "Unknown";

  return (
    <article className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {sourceName}
            <span className="font-normal text-slate-500"> coverage moved</span>
          </p>
          <p className="text-xs text-slate-500">
            {formatDateTime(item.createdAt)} · by {actorName}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="border-teal-200 bg-teal-50 text-teal-800"
          >
            {candidateCount} candidate
            {candidateCount === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className="border-border bg-slate-50">
            {transferModeLabel(item.transferMode)}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            From ({item.sourceCountryCode})
          </p>
          <CountryChips codes={item.sourceCountryCodes} />
        </div>
        <ArrowRight className="mx-auto h-4 w-4 shrink-0 text-teal-600 sm:mx-2" />
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            To ({item.destinationCountryCode})
          </p>
          <CountryChips codes={item.destinationCountryCodes} />
        </div>
      </div>

      {item.reason && (
        <p className="mt-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Reason:</span>{" "}
          {item.reason}
        </p>
      )}

      {!hasCandidates ? (
        <p className="mt-3 text-xs text-slate-500">
          No candidate handoffs — coverage move only.
        </p>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 gap-1.5 text-xs"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
            {expanded ? "Hide" : "View"} candidate handoffs (
            {candidateCount})
          </Button>
          {expanded && (
            <TransferCandidatesPanel
              countryCode={countryCode}
              transferId={item.id}
              transferredAt={item.createdAt}
              candidateCount={candidateCount}
              canReadCandidates={canReadCandidates}
            />
          )}
        </>
      )}
    </article>
  );
}

export function CountryCoverageTransferHistoryDialog({
  open,
  onOpenChange,
  countryCode,
  countryName,
}: CountryCoverageTransferHistoryDialogProps) {
  const [page, setPage] = useState(1);
  const canReadCandidates = useCan("read:candidates");
  const { data, isLoading, isFetching, isError } =
    useGetCountryCoverageTransferHistoryQuery(
      { countryCode, page, limit: TRANSFER_PAGE_SIZE },
      { skip: !open || !countryCode },
    );

  const items = data?.data?.items ?? [];
  const pagination = data?.data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPage(1);
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex h-[min(40rem,85vh)] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-teal-100 p-2.5">
              <History className="h-5 w-5 text-teal-700" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Coverage transfer history — {countryCode}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                Past coverage moves
                {countryName ? ` for ${countryName}` : ""}. Open a transfer to
                page through candidate handoffs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="space-y-3">
            {(isLoading || isFetching) && items.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
              </div>
            ) : isError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                Unable to load transfer history. Try again.
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                No coverage transfers recorded for {countryCode} yet.
              </div>
            ) : (
              items.map((item) => (
                <TransferCard
                  key={item.id}
                  item={item}
                  countryCode={countryCode}
                  canReadCandidates={canReadCandidates}
                />
              ))
            )}
          </div>
        </div>

        {pagination != null && pagination.total > TRANSFER_PAGE_SIZE && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-slate-50/80 px-6 py-3">
            <span className="text-xs text-slate-500">
              Page {safePage} of {totalPages} · {pagination.total} transfers
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous history page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={safePage >= totalPages || isFetching}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                aria-label="Next history page"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
