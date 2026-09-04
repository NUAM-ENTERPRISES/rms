import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Phone,
  Search,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ImportRowResult } from "../data/dto";

const PAGE_SIZE = 20;

interface ImportResultsTableProps {
  results: ImportRowResult[];
}

function initials(result: ImportRowResult): string {
  const first = result.firstName?.trim()?.[0] ?? "";
  const last = result.lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

function fullName(result: ImportRowResult): string {
  const name = `${result.firstName ?? ""} ${result.lastName ?? ""}`.trim();
  return name || "Unnamed candidate";
}

function phoneLabel(result: ImportRowResult): string | null {
  if (!result.mobileNumber) return null;
  return `${result.countryCode ?? ""} ${result.mobileNumber}`.trim();
}

/**
 * Results of a confirmed import: searchable, paginated candidate cards with
 * profile links for successes and clear failure reasons for the rest.
 */
export function ImportResultsTable({ results }: ImportResultsTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "created" | "failed">("all");

  const createdCount = results.filter((result) => result.success).length;
  const failedCount = results.length - createdCount;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return results.filter((result) => {
      if (filter === "created" && !result.success) return false;
      if (filter === "failed" && result.success) return false;
      if (!needle) return true;
      const haystack = [
        result.firstName,
        result.lastName,
        result.candidateCode,
        result.mobileNumber,
        result.email,
        result.professionLabel,
        result.sheetName,
        String(result.rowNumber),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [results, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  if (results.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat label="Total" value={results.length} />
        <SummaryStat
          label="Created"
          value={createdCount}
          tone="text-emerald-700 dark:text-emerald-400"
        />
        <SummaryStat
          label="Failed"
          value={failedCount}
          tone="text-destructive"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, code, mobile, sheet..."
            className="h-9 pl-8"
            aria-label="Search import results"
          />
        </div>
        <div
          className="flex shrink-0 gap-1 rounded-lg bg-muted p-1"
          role="group"
          aria-label="Filter results"
        >
          {(
            [
              ["all", "All"],
              ["created", "Created"],
              ["failed", "Failed"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "default" : "ghost"}
              className="h-8"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {pageItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No results match that search.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Created candidates">
          {pageItems.map((result) => (
            <li key={result.rowId}>
              <ResultCard result={result} />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous results page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-muted-foreground">
              {safePage}/{totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Next results page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultCard({ result }: { result: ImportRowResult }) {
  const phone = phoneLabel(result);

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors sm:flex-row sm:items-center",
        result.success
          ? "border-border hover:border-primary/30"
          : "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            result.success
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive",
          )}
          aria-hidden="true"
        >
          {initials(result)}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {fullName(result)}
            </h3>
            {result.success ? (
              <Badge
                variant="secondary"
                className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                <CircleCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                Created
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="border-0 bg-destructive/10 text-destructive"
              >
                <CircleX className="mr-1 h-3 w-3" aria-hidden="true" />
                Failed
              </Badge>
            )}
            {result.candidateCode ? (
              <Badge variant="outline" className="font-mono text-[11px]">
                {result.candidateCode}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {result.professionLabel ? (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3 w-3" aria-hidden="true" />
                {result.professionLabel}
              </span>
            ) : null}
            {phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" aria-hidden="true" />
                {phone}
              </span>
            ) : null}
            {result.email ? (
              <span className="inline-flex items-center gap-1 truncate">
                <UserRound className="h-3 w-3" aria-hidden="true" />
                {result.email}
              </span>
            ) : null}
            <span>
              {result.sheetName}:{result.rowNumber}
            </span>
          </div>

          {!result.success && result.error ? (
            <p className="text-xs text-destructive">{result.error}</p>
          ) : null}
        </div>
      </div>

      {result.success && result.candidateId ? (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to={`/candidates/${result.candidateId}`}>
            Open profile
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
    </article>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>
        {value}
      </p>
    </div>
  );
}
