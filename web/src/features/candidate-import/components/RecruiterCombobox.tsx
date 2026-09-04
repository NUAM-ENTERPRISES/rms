import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks";
import type { RecruiterOption } from "../data/dto";

const PAGE_SIZE = 10;

export interface RecruiterComboboxProps {
  recruiters: RecruiterOption[];
  value?: string;
  onValueChange: (recruiterId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
  className?: string;
}

/**
 * Searchable, paginated recruiter picker for the import review flow.
 *
 * The recruiter list is already fully loaded from the import endpoint, so
 * search and paging are client-side — same UX as SelectAgent without a
 * round-trip per keystroke.
 */
export function RecruiterCombobox({
  recruiters,
  value,
  onValueChange,
  label = "Owning recruiter",
  placeholder = "Search recruiters...",
  required = false,
  disabled = false,
  error,
  id,
  className,
}: RecruiterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 200);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(1);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return recruiters;
    return recruiters.filter((recruiter) => {
      const haystack = `${recruiter.name} ${recruiter.email}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [recruiters, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const selected = recruiters.find((recruiter) => recruiter.id === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-2 truncate text-left">
                <UserRound
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {selected.name}
                  <span className="ml-1.5 text-muted-foreground">
                    {selected.email}
                  </span>
                </span>
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <div className="border-b border-border p-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className="h-9"
              autoFocus
              aria-label="Search recruiters"
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {pageItems.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {debouncedSearch.trim()
                  ? "No recruiters match that search."
                  : "No recruiters available."}
              </p>
            ) : (
              pageItems.map((recruiter) => (
                <button
                  key={recruiter.id}
                  type="button"
                  onClick={() => {
                    onValueChange(recruiter.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === recruiter.id
                        ? "text-primary opacity-100"
                        : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-foreground">
                      {recruiter.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {recruiter.email}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-2 py-1.5">
              <p className="px-1 text-xs text-muted-foreground">
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
                  aria-label="Previous recruiters page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
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
                  aria-label="Next recruiters page"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
