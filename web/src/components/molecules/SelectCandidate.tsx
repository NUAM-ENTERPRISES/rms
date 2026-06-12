/**
 * Candidate combobox with debounced search and paginated results (10 per page).
 * Follows SelectAgent patterns (FE_GUIDELINES.md molecules).
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useGetCandidatesQuery,
  useGetCandidateByIdQuery,
  type Candidate,
  type GetCandidatesParams,
} from "@/features/candidates/api";
import { useDebounce } from "@/hooks";

const EMPTY_CANDIDATES: Candidate[] = [];

function sameCandidateOrder(a: Candidate[], b: Candidate[]) {
  return (
    a.length === b.length && a.every((candidate, i) => candidate.id === b[i]?.id)
  );
}

function candidateDisplayName(candidate: Candidate): string {
  return `${candidate.firstName} ${candidate.lastName}`.trim();
}

function candidateInitials(candidate: Candidate): string {
  const first = candidate.firstName?.charAt(0) ?? "";
  const last = candidate.lastName?.charAt(0) ?? "";
  const initials = `${first}${last}`.trim();
  return initials ? initials.toUpperCase() : "?";
}

function CandidateAvatar({
  candidate,
  size = "md",
  className,
}: {
  candidate: Candidate;
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const fallbackText = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Avatar
      className={cn(
        sizeClass,
        "shrink-0 border border-slate-200 bg-slate-100 shadow-sm",
        className,
      )}
    >
      <AvatarImage
        src={candidate.profileImage || undefined}
        alt={candidateDisplayName(candidate)}
      />
      <AvatarFallback
        className={cn(
          fallbackText,
          "bg-gradient-to-br from-slate-500 to-slate-600 font-semibold text-white",
        )}
      >
        {candidateInitials(candidate)}
      </AvatarFallback>
    </Avatar>
  );
}

export interface SelectCandidateProps {
  value?: string;
  onValueChange?: (candidateId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  allowEmpty?: boolean;
  pageSize?: number;
}

export function SelectCandidate({
  value,
  onValueChange,
  label,
  placeholder = "Search and select a candidate...",
  required = false,
  disabled = false,
  error,
  className,
  allowEmpty = false,
  pageSize = 10,
}: SelectCandidateProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [accumulatedCandidates, setAccumulatedCandidates] =
    useState<Candidate[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const queryParams = useMemo((): GetCandidatesParams => {
    const params: GetCandidatesParams = {
      page,
      limit: pageSize,
    };
    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }
    return params;
  }, [page, pageSize, debouncedSearch]);

  const { data, isLoading, isFetching } = useGetCandidatesQuery(queryParams, {
    skip: !open,
  });

  const pageCandidates = data?.data ?? EMPTY_CANDIDATES;
  const pagination = data?.pagination as
    | { page?: number; total?: number; totalPages?: number }
    | undefined;
  const hasMore = pagination?.totalPages
    ? page < pagination.totalPages
    : false;

  useEffect(() => {
    setPage(1);
    setAccumulatedCandidates([]);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    if (page === 1) {
      setAccumulatedCandidates((prev) =>
        sameCandidateOrder(prev, pageCandidates) ? prev : pageCandidates,
      );
    } else {
      setAccumulatedCandidates((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const appended = pageCandidates.filter((c) => !seen.has(c.id));
        return appended.length ? [...prev, ...appended] : prev;
      });
    }
  }, [open, page, pageCandidates]);

  const { data: selectedCandidateById } = useGetCandidateByIdQuery(value!, {
    skip:
      !value ||
      accumulatedCandidates.some((c) => c.id === value) ||
      pageCandidates.some((c) => c.id === value),
  });

  const selectedCandidate: Candidate | undefined =
    accumulatedCandidates.find((c) => c.id === value) ??
    pageCandidates.find((c) => c.id === value) ??
    selectedCandidateById;

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasMore, isFetching]);

  const handleSelect = (candidateId: string) => {
    if (candidateId === value && allowEmpty) {
      onValueChange?.("");
    } else if (candidateId !== value) {
      onValueChange?.(candidateId);
    }
    setOpen(false);
  };

  const displayCandidates =
    accumulatedCandidates.length > 0 ? accumulatedCandidates : pageCandidates;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setPage(1);
            setAccumulatedCandidates([]);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-11 w-full justify-between border-slate-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              !value && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            {selectedCandidate ? (
              <div className="flex min-w-0 items-center gap-2.5 truncate text-left">
                <CandidateAvatar candidate={selectedCandidate} size="sm" />
                <span className="truncate">
                  {candidateDisplayName(selectedCandidate)}
                  {selectedCandidate.candidateCode
                    ? ` (${selectedCandidate.candidateCode})`
                    : ""}
                </span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(32rem,calc(100vw-2rem))] p-0"
          align="start"
          sideOffset={6}
        >
          <div className="flex max-h-[400px] flex-col">
            <div className="sticky top-0 z-10 space-y-2 border-b bg-background p-2">
              <Input
                placeholder="Search by name, email, phone, or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto">
              {isLoading && !displayCandidates.length ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Loading candidates...
                  </p>
                </div>
              ) : displayCandidates.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {search.trim()
                      ? "No candidates match your search."
                      : "No candidates found."}
                  </p>
                </div>
              ) : (
                <div className="p-1">
                  {allowEmpty && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelect("")}
                        className="flex w-full cursor-pointer items-center rounded-md px-3 py-2.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      >
                        <Check
                          className={cn(
                            "mr-3 h-4 w-4 shrink-0",
                            value === ""
                              ? "text-primary opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="italic text-muted-foreground">
                          Clear selection
                        </span>
                      </button>
                      <div className="mx-2 my-1 h-px bg-border" />
                    </>
                  )}
                  {displayCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelect(candidate.id)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === candidate.id
                            ? "text-primary opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <CandidateAvatar candidate={candidate} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {candidateDisplayName(candidate)}
                        </p>
                        <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                          {candidate.candidateCode ? (
                            <p className="truncate font-mono">
                              {candidate.candidateCode}
                            </p>
                          ) : null}
                          {candidate.email ? (
                            <p className="truncate">{candidate.email}</p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {hasMore && displayCandidates.length > 0 && (
                <div className="sticky bottom-0 border-t bg-muted/50 p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={isFetching}
                    className="w-full"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load more
                        {pagination?.total != null
                          ? ` (${Math.max(0, pagination.total - displayCandidates.length)} left)`
                          : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}
              {pagination && !hasMore && displayCandidates.length > 0 && (
                <div className="border-t bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                  Showing {displayCandidates.length} of {pagination.total ?? displayCandidates.length}{" "}
                  {(pagination.total ?? 0) === 1 ? "candidate" : "candidates"}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
