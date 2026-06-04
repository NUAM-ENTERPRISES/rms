import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueryProjectsRequest } from "@/features/projects";
import {
  ProjectAdvancedFiltersSheet,
  countProjectAdvancedFilters,
} from "@/features/projects/components/ProjectAdvancedFiltersSheet";
import { useGetTeamsQuery } from "@/features/teams";
import { cn } from "@/lib/utils";

interface ProjectFiltersProps {
  filters: QueryProjectsRequest;
  onFiltersChange: (filters: QueryProjectsRequest) => void;
  className?: string;
}

export default function ProjectFilters({
  filters,
  onFiltersChange,
  className,
}: ProjectFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: teamsData } = useGetTeamsQuery({ page: 1, limit: 50 });
  const teamOptions = teamsData?.data?.teams ?? [];

  const handleFilterChange = (
    key: keyof QueryProjectsRequest,
    value: QueryProjectsRequest[keyof QueryProjectsRequest],
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1,
    });
  };

  const applyAdvancedFilters = (
    patch: Pick<
      QueryProjectsRequest,
      "clientId" | "teamId" | "priority" | "deadlineFrom" | "deadlineTo"
    >,
  ) => {
    onFiltersChange({
      ...filters,
      page: 1,
      ...patch,
    });
  };

  const resetAdvancedFilters = () => {
    onFiltersChange({
      ...filters,
      page: 1,
      clientId: undefined,
      teamId: undefined,
      priority: undefined,
      deadlineFrom: undefined,
      deadlineTo: undefined,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      page: 1,
      limit: filters.limit,
      sortOrder: "desc",
    });
  };

  const advancedFilterCount = countProjectAdvancedFilters(filters);

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.clientId ||
      filters.teamId ||
      filters.priority ||
      filters.deadlineFrom ||
      filters.deadlineTo ||
      filters.isUrgent ||
      filters.sortBy ||
      (filters.sortOrder && filters.sortOrder !== "desc"),
  );

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ] as const;

  const sortOptions = [
    { value: "createdAt", label: "Created Date" },
    { value: "updatedAt", label: "Updated Date" },
    { value: "title", label: "Title" },
    { value: "deadline", label: "Deadline" },
    { value: "status", label: "Status" },
  ] as const;

  const activeFilterBadges = useMemo(() => {
    const badges: { key: string; label: string; onClear: () => void }[] = [];
    if (filters.search) {
      badges.push({
        key: "search",
        label: `Search: ${filters.search}`,
        onClear: () => handleFilterChange("search", undefined),
      });
    }
    if (filters.status) {
      badges.push({
        key: "status",
        label: `Status: ${filters.status}`,
        onClear: () => handleFilterChange("status", undefined),
      });
    }
    if (filters.priority) {
      badges.push({
        key: "priority",
        label: `Priority: ${filters.priority}`,
        onClear: () => handleFilterChange("priority", undefined),
      });
    }
    if (filters.isUrgent) {
      badges.push({
        key: "urgent",
        label: "Urgent deadlines",
        onClear: () => handleFilterChange("isUrgent", undefined),
      });
    }
    if (filters.clientId) {
      badges.push({
        key: "client",
        label: "Client filter",
        onClear: () => handleFilterChange("clientId", undefined),
      });
    }
    if (filters.teamId) {
      const teamName =
        teamOptions.find((t) => t.id === filters.teamId)?.name ?? "Team";
      badges.push({
        key: "team",
        label: `Team: ${teamName}`,
        onClear: () => handleFilterChange("teamId", undefined),
      });
    }
    if (filters.deadlineFrom || filters.deadlineTo) {
      badges.push({
        key: "deadline",
        label: "Deadline range",
        onClear: () => {
          onFiltersChange({
            ...filters,
            page: 1,
            deadlineFrom: undefined,
            deadlineTo: undefined,
          });
        },
      });
    }
    if (filters.sortBy) {
      badges.push({
        key: "sort",
        label: `Sort: ${filters.sortBy}`,
        onClear: () => handleFilterChange("sortBy", undefined),
      });
    }
    return badges;
  }, [filters, teamOptions]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative group">
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 transition-colors duration-200",
            searchFocused ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Search className="h-5 w-5" aria-hidden />
        </div>
        <Input
          placeholder="Search projects by title, description, or client..."
          value={filters.search || ""}
          onChange={(e) =>
            handleFilterChange("search", e.target.value || undefined)
          }
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="h-12 rounded-2xl border-border bg-muted/40 pl-12 text-base shadow-sm transition-shadow focus:bg-background focus:ring-2 focus:ring-ring/30"
          aria-label="Search projects"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              handleFilterChange("status", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger
              className="h-10 min-w-[140px] rounded-xl"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sort
          </span>
          <Select
            value={filters.sortBy || "default"}
            onValueChange={(value) =>
              handleFilterChange("sortBy", value === "default" ? undefined : value)
            }
          >
            <SelectTrigger
              className="h-10 min-w-[140px] rounded-xl"
              aria-label="Sort projects"
            >
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdvancedOpen(true)}
          className={cn(
            "h-10 gap-2 rounded-full border px-4 shadow-sm",
            isAdvancedOpen &&
              "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          aria-expanded={isAdvancedOpen}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Advanced filters
          {advancedFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs"
            >
              {advancedFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      <ProjectAdvancedFiltersSheet
        isOpen={isAdvancedOpen}
        onOpenChange={setIsAdvancedOpen}
        filters={filters}
        onApply={applyAdvancedFilters}
        onReset={resetAdvancedFilters}
      />

      {hasActiveFilters && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active filters
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilterBadges.map((badge) => (
              <Badge
                key={badge.key}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {badge.label}
                <button
                  type="button"
                  onClick={badge.onClear}
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label={`Remove ${badge.label} filter`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
