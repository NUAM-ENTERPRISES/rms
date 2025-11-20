/**
 * Client Select component with search and pagination
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState, useEffect, useCallback, useMemo, type ComponentProps, type MouseEvent } from "react";
import { Check, ChevronsUpDown, Building2, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useGetClientsQuery, type Client } from "@/features/clients";
import { useDebounce } from "@/hooks";

export interface ClientSelectProps {
  /** Current selected client ID */
  value?: string;
  /** Callback when client changes */
  onValueChange?: (clientId: string) => void;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Additional CSS classes */
  className?: string;
  /** Filter by client type */
  filterByType?: Client["type"];
  /** Show "No client" option */
  allowEmpty?: boolean;
  /** Number of clients to show per page */
  pageSize?: number;
  /** Show create client button */
  showCreateButton?: boolean;
  /** Callback when create button is clicked */
  onCreateClick?: () => void;
  /** Custom label for create button */
  createButtonLabel?: string;
  /** Button variant override */
  createButtonVariant?: ComponentProps<typeof Button>["variant"];
  /** Additional classes for create button */
  createButtonClassName?: string;
}

/**
 * ClientSelect component with search and pagination for selecting clients
 */
export function ClientSelect({
  value,
  onValueChange,
  label,
  placeholder = "Select a client...",
  required = false,
  disabled = false,
  error,
  className,
  filterByType,
  allowEmpty = true,
  pageSize = 10,
  showCreateButton = false,
  onCreateClick,
  createButtonLabel,
  createButtonVariant,
  createButtonClassName,
}: ClientSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Build query params - only use search for API, not for cmdk filtering
  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit: pageSize,
    };
    // Use debounced search for API call
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (filterByType) {
      params.type = filterByType;
    }
    return params;
  }, [page, pageSize, debouncedSearch, filterByType]);

  // Fetch clients with search and pagination
  const { data, isLoading, isFetching } = useGetClientsQuery(queryParams);
  
  // Fetch selected client separately if we have a value and it's not in current results
  const { data: selectedClientData } = useGetClientsQuery(
    { search: value, limit: 1 },
    { skip: !value || data?.data?.clients?.some((c) => c.id === value) }
  );

  const clients = data?.data?.clients || [];
  const pagination = data?.data?.pagination;
  const hasMore = pagination ? page < pagination.pages : false;

  // Find selected client - check both current results and separately fetched data
  const selectedClient = 
    clients.find((c) => c.id === value) || 
    selectedClientData?.data?.clients?.[0];

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Load more clients
  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isFetching]);

  // Handle client selection
  const handleSelect = (clientId: string) => {
    if (clientId === value) {
      // Deselect if clicking the same client
      if (allowEmpty) {
        onValueChange?.("");
      }
    } else {
      onValueChange?.(clientId);
    }
    setOpen(false);
  };

  // Get client type badge color
  const getTypeColor = (type: Client["type"]) => {
    switch (type) {
      case "INDIVIDUAL":
        return "bg-blue-100 text-blue-800";
      case "SUB_AGENCY":
        return "bg-purple-100 text-purple-800";
      case "HEALTHCARE_ORGANIZATION":
        return "bg-green-100 text-green-800";
      case "EXTERNAL_SOURCE":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format type for display
  const formatType = (type: Client["type"]) => {
    return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleCreateButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onCreateClick?.();
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
              !value && "text-muted-foreground",
              error && "border-red-500"
            )}
          >
            {selectedClient ? (
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{selectedClient.name}</span>
                <Badge
                  variant="outline"
                  className={cn("text-xs flex-shrink-0", getTypeColor(selectedClient.type))}
                >
                  {formatType(selectedClient.type)}
                </Badge>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex flex-col max-h-[400px]">
            <div className="p-2 border-b bg-white sticky top-0 z-10 space-y-2">
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
              {showCreateButton && onCreateClick && (
                <Button
                  type="button"
                  variant={createButtonVariant ?? "default"}
                  size="sm"
                  onClick={handleCreateButtonClick}
                  className={cn(
                    "w-full justify-center h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white",
                    createButtonClassName
                  )}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createButtonLabel ?? "Create New Client"}
                </Button>
              )}
            </div>
            <div className="overflow-y-auto">
              {isLoading && !clients.length ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500">Loading clients...</p>
                </div>
              ) : clients.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">
                    {search ? "No clients found." : "No clients available."}
                  </p>
                </div>
              ) : (
                <div className="p-1">
                  {allowEmpty && (
                    <>
                      <button
                        onClick={() => handleSelect("")}
                        className="flex w-full items-center rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                      >
                        <Check
                          className={cn(
                            "mr-3 h-4 w-4 flex-shrink-0",
                            value === "" ? "opacity-100 text-blue-600" : "opacity-0"
                          )}
                        />
                        <span className="text-slate-500 italic">Please select a client</span>
                      </button>
                      <div className="my-1 mx-2 h-px bg-slate-200" />
                    </>
                  )}
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelect(client.id)}
                      className="flex w-full items-center rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 text-left"
                    >
                      <Check
                        className={cn(
                          "mr-3 h-4 w-4 flex-shrink-0",
                          value === client.id ? "opacity-100 text-blue-600" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        <span className="truncate flex-1 text-slate-700 font-medium">{client.name}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs flex-shrink-0 font-normal", getTypeColor(client.type))}
                        >
                          {formatType(client.type)}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {hasMore && (
                <div className="p-2 border-t bg-slate-50 sticky bottom-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={isFetching}
                    className="w-full hover:bg-white text-slate-700"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Load more (${(pagination?.total || 0) - clients.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
              {pagination && !hasMore && clients.length > 0 && (
                <div className="py-2 px-3 text-xs text-slate-500 text-center border-t bg-slate-50">
                  Showing all {pagination.total} {pagination.total === 1 ? 'client' : 'clients'}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
