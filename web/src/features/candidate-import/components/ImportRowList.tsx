import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ImportRow, ImportRowStatus } from "../data/dto";

export const IMPORT_ROW_PAGE_SIZE = 20;

const STATUS_TONE: Record<ImportRowStatus, string> = {
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  needs_review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  duplicate: "bg-destructive/10 text-destructive",
  invalid: "bg-destructive/10 text-destructive",
  imported: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

interface ImportRowListProps {
  rows: ImportRow[];
  selectedRowId: string | null;
  onSelect: (rowId: string) => void;
}

function initials(row: ImportRow): string {
  const first = row.normalized.firstName?.trim()?.[0] ?? "";
  const last = row.normalized.lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

/** Pure helper exported for unit tests. */
export function paginateRows<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    start,
    end: Math.min(start + pageSize, items.length),
    items: items.slice(start, start + pageSize),
  };
}

/**
 * Searchable, paginated sidebar of parsed import rows.
 *
 * Keeps selection aligned with the visible page when possible so paging never
 * leaves the editor showing a row the list no longer highlights.
 */
export function ImportRowList({
  rows,
  selectedRowId,
  onSelect,
}: ImportRowListProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.normalized.firstName,
        row.normalized.lastName,
        row.normalized.mobileNumber,
        row.normalized.email,
        row.sheetName,
        String(row.rowNumber),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pagination = paginateRows(filtered, page, IMPORT_ROW_PAGE_SIZE);
  const pageIds = pagination.items.map((row) => row.id).join(",");

  // Keep the editor in sync with what the list can show: if search drops the
  // current row, pick the first match; if the user pages away, pick the first
  // row on the new page.
  useEffect(() => {
    if (pagination.items.length === 0) return;
    const selectedOnPage = pagination.items.some(
      (row) => row.id === selectedRowId,
    );
    if (!selectedOnPage) {
      onSelect(pagination.items[0].id);
    }
    // pageIds is the stable fingerprint of the visible page.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid loop on new array identity
  }, [pageIds, selectedRowId, onSelect]);

  return (
    <div className="flex h-full max-h-[36rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Candidates</h2>
          <Badge variant="secondary" className="tabular-nums">
            {filtered.length}
          </Badge>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, mobile, sheet..."
            className="h-9 pl-8"
            aria-label="Search candidates"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Parsed rows">
        {pagination.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No candidates match that search."
              : "No candidates in this batch."}
          </p>
        ) : (
          <ul>
            {pagination.items.map((row) => {
              const selected = selectedRowId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                      selected &&
                        "border-l-2 border-l-primary bg-muted/70 pl-[10px]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {initials(row)}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {row.normalized.firstName}{" "}
                        {row.normalized.lastName ?? ""}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="truncate">
                          {row.sheetName}:{row.rowNumber}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border-0 px-1.5 py-0 text-[10px] capitalize",
                            STATUS_TONE[row.status],
                          )}
                        >
                          {row.status.replace(/_/g, " ")}
                        </Badge>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {filtered.length > 0 ? (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-2 py-2">
          <p className="px-1 text-xs text-muted-foreground">
            {pagination.start + 1}–{pagination.end} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-muted-foreground">
              {pagination.page}/{pagination.totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1),
                )
              }
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
