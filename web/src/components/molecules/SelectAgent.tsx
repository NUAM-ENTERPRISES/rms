/**
 * Agent combobox with search and pagination (active agents by default).
 * Follows ClientSelect patterns (FE_GUIDELINES.md molecules).
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Check, ChevronsUpDown, Handshake, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useGetAgentsQuery,
  useGetAgentQuery,
  type Agent,
  type GetAgentsParams,
} from "@/features/agents/api";
import { useDebounce } from "@/hooks";

const EMPTY_AGENTS: Agent[] = [];

function sameAgentOrder(a: Agent[], b: Agent[]) {
  return (
    a.length === b.length && a.every((agent, i) => agent.id === b[i]?.id)
  );
}

export interface SelectAgentProps {
  /** Selected agent user id */
  value?: string;
  onValueChange?: (agentId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  /** When true (default), only agents with `isActive === true` are listed */
  activeOnly?: boolean;
  allowEmpty?: boolean;
  pageSize?: number;
}

export function SelectAgent({
  value,
  onValueChange,
  label,
  placeholder = "Select an agent...",
  required = false,
  disabled = false,
  error,
  className,
  activeOnly = true,
  allowEmpty = false,
  pageSize = 10,
}: SelectAgentProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [accumulatedAgents, setAccumulatedAgents] = useState<Agent[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const queryParams = useMemo((): GetAgentsParams => {
    const params: GetAgentsParams = {
      page,
      limit: pageSize,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeOnly) params.isActive = true;
    return params;
  }, [page, pageSize, debouncedSearch, activeOnly]);

  const { data, isLoading, isFetching } = useGetAgentsQuery(queryParams, {
    skip: !open,
  });

  const pageAgents = data?.data ?? EMPTY_AGENTS;
  const meta = data?.meta;
  const hasMore = meta ? page < meta.totalPages : false;

  useEffect(() => {
    setPage(1);
    setAccumulatedAgents([]);
  }, [debouncedSearch, activeOnly]);

  useEffect(() => {
    if (!open) return;
    if (page === 1) {
      setAccumulatedAgents((prev) =>
        sameAgentOrder(prev, pageAgents) ? prev : pageAgents,
      );
    } else {
      setAccumulatedAgents((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const appended = pageAgents.filter((a) => !seen.has(a.id));
        return appended.length ? [...prev, ...appended] : prev;
      });
    }
  }, [open, page, pageAgents]);

  const { data: selectedAgentResponse } = useGetAgentQuery(value!, {
    skip:
      !value ||
      accumulatedAgents.some((a) => a.id === value) ||
      pageAgents.some((a) => a.id === value),
  });

  const selectedAgent: Agent | undefined =
    accumulatedAgents.find((a) => a.id === value) ??
    pageAgents.find((a) => a.id === value) ??
    selectedAgentResponse?.data;

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasMore, isFetching]);

  const handleSelect = (agentId: string) => {
    if (agentId === value && allowEmpty) {
      onValueChange?.("");
    } else if (agentId !== value) {
      onValueChange?.(agentId);
    }
    setOpen(false);
  };

  const displayAgents = accumulatedAgents.length > 0 ? accumulatedAgents : pageAgents;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setPage(1);
            setAccumulatedAgents([]);
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
              "w-full justify-between h-11 border-slate-200 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              !value && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            {selectedAgent ? (
              <div className="flex items-center gap-2 truncate text-left">
                <Handshake className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {selectedAgent.name}
                  {selectedAgent.companyName
                    ? ` (${selectedAgent.companyName})`
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
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <div className="flex max-h-[400px] flex-col">
            <div className="sticky top-0 z-10 space-y-2 border-b bg-background p-2">
              <Input
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto">
              {isLoading && !displayAgents.length ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading agents...</p>
                </div>
              ) : displayAgents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {search.trim()
                      ? "No agents match your search."
                      : activeOnly
                        ? "No active agents found."
                        : "No agents found."}
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
                        <span className="text-muted-foreground italic">
                          Clear selection
                        </span>
                      </button>
                      <div className="mx-2 my-1 h-px bg-border" />
                    </>
                  )}
                  {displayAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleSelect(agent.id)}
                      className="flex w-full cursor-pointer items-center rounded-md px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <Check
                        className={cn(
                          "mr-3 h-4 w-4 shrink-0",
                          value === agent.id
                            ? "text-primary opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Handshake className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium text-foreground">
                          {agent.name}
                          {agent.companyName ? ` (${agent.companyName})` : ""}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {hasMore && displayAgents.length > 0 && (
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
                        {meta != null ? ` (${Math.max(0, meta.total - displayAgents.length)} left)` : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}
              {meta && !hasMore && displayAgents.length > 0 && (
                <div className="border-t bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                  Showing {displayAgents.length} of {meta.total}{" "}
                  {meta.total === 1 ? "agent" : "agents"}
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
