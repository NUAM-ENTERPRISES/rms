import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetOverlay,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SlidersHorizontal,
  Building2,
  Users,
  Target,
  CalendarDays,
} from "lucide-react";
import { ClientSelect, DatePicker } from "@/components/molecules";
import { QueryProjectsRequest } from "@/features/projects";
import { useGetTeamsQuery } from "@/features/teams";
import { useDebounce } from "@/hooks/useDebounce";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export type ProjectAdvancedFiltersDraft = {
  clientId?: string;
  teamId?: string;
  priority?: QueryProjectsRequest["priority"];
  deadlinePreset: string;
  deadlineFrom?: Date;
  deadlineTo?: Date;
};

export function draftFromProjectFilters(
  filters: QueryProjectsRequest,
): ProjectAdvancedFiltersDraft {
  return {
    clientId: filters.clientId,
    teamId: filters.teamId,
    priority: filters.priority,
    deadlinePreset: filters.deadlineFrom || filters.deadlineTo ? "custom" : "all",
    deadlineFrom: filters.deadlineFrom
      ? new Date(filters.deadlineFrom)
      : undefined,
    deadlineTo: filters.deadlineTo ? new Date(filters.deadlineTo) : undefined,
  };
}

export function countProjectAdvancedFilters(filters: QueryProjectsRequest): number {
  return [
    filters.clientId,
    filters.teamId,
    filters.priority,
    filters.deadlineFrom,
    filters.deadlineTo,
  ].filter(Boolean).length;
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const DEADLINE_PRESETS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "this_week", label: "Week" },
  { key: "this_month", label: "Month" },
] as const;

interface ProjectAdvancedFiltersSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: QueryProjectsRequest;
  onApply: (patch: Pick<
    QueryProjectsRequest,
    "clientId" | "teamId" | "priority" | "deadlineFrom" | "deadlineTo"
  >) => void;
  onReset: () => void;
}

export function ProjectAdvancedFiltersSheet({
  isOpen,
  onOpenChange,
  filters,
  onApply,
  onReset,
}: ProjectAdvancedFiltersSheetProps) {
  const [localDraft, setLocalDraft] = useState<ProjectAdvancedFiltersDraft>(() =>
    draftFromProjectFilters(filters),
  );
  const [teamSearch, setTeamSearch] = useState("");
  const debouncedTeamSearch = useDebounce(teamSearch, 300);

  const { data: teamsData, isLoading: teamsLoading } = useGetTeamsQuery({
    page: 1,
    limit: 50,
    search: debouncedTeamSearch || undefined,
  });

  const teamOptions = teamsData?.data?.teams ?? [];

  useEffect(() => {
    if (isOpen) {
      setLocalDraft(draftFromProjectFilters(filters));
      setTeamSearch("");
    }
  }, [isOpen, filters]);

  const handleDeadlinePresetClick = (preset: string) => {
    let from: Date | undefined;
    let to: Date | undefined;
    const now = new Date();

    switch (preset) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "this_week":
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "this_month":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "overdue":
        from = undefined;
        to = endOfDay(subDays(now, 1));
        break;
      case "all":
      default:
        from = undefined;
        to = undefined;
        break;
    }

    setLocalDraft((d) => ({
      ...d,
      deadlinePreset: preset,
      deadlineFrom: from,
      deadlineTo: to,
    }));
  };

  const handleApply = () => {
    onApply({
      clientId: localDraft.clientId || undefined,
      teamId: localDraft.teamId || undefined,
      priority: localDraft.priority,
      deadlineFrom: localDraft.deadlineFrom?.toISOString(),
      deadlineTo: localDraft.deadlineTo?.toISOString(),
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetOverlay className="top-[64px] z-40" />
      <SheetContent
        side="right"
        className="z-40 flex h-[calc(100vh-124px)] w-full flex-col rounded-xl border p-0 shadow-2xl top-[74px] right-2 sm:max-w-[320px]"
      >
        <SheetHeader className="flex-shrink-0 rounded-t-xl border-b bg-card px-5 py-3">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden />
            Filters
          </SheetTitle>
          <SheetDescription className="mt-0.5 text-[11px] text-muted-foreground">
            Refine projects by client, team, priority, or deadline
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-5 py-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3 w-3 text-primary" aria-hidden />
              Client
            </label>
            <ClientSelect
              value={localDraft.clientId}
              onValueChange={(clientId) =>
                setLocalDraft((d) => ({
                  ...d,
                  clientId: clientId || undefined,
                }))
              }
              placeholder="All clients"
              allowEmpty
              pageSize={10}
              className="bg-card shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="project-advanced-team-search"
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              <Users className="h-3 w-3 text-primary" aria-hidden />
              Team
            </label>
            <Input
              id="project-advanced-team-search"
              placeholder="Search teams…"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="h-8 bg-card text-xs shadow-sm"
            />
            <Select
              value={localDraft.teamId || "all"}
              onValueChange={(value) =>
                setLocalDraft((d) => ({
                  ...d,
                  teamId: value === "all" ? undefined : value,
                }))
              }
              disabled={teamsLoading}
            >
              <SelectTrigger
                className="h-8 rounded-lg border-border bg-card text-xs shadow-sm"
                aria-label="Filter by team"
              >
                <SelectValue
                  placeholder={teamsLoading ? "Loading teams…" : "All teams"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teamOptions.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Target className="h-3 w-3 text-primary" aria-hidden />
              Priority
            </label>
            <Select
              value={localDraft.priority || "all"}
              onValueChange={(value) =>
                setLocalDraft((d) => ({
                  ...d,
                  priority:
                    value === "all"
                      ? undefined
                      : (value as QueryProjectsRequest["priority"]),
                }))
              }
            >
              <SelectTrigger
                className="h-8 rounded-lg border-border bg-card text-xs shadow-sm"
                aria-label="Filter by priority"
              >
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3 w-3 text-primary" aria-hidden />
              Deadline
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEADLINE_PRESETS.map((preset) => {
                const isActive = localDraft.deadlinePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleDeadlinePresetClick(preset.key)}
                    className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-tight transition-all ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleDeadlinePresetClick("overdue")}
                className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-tight transition-all ${
                  localDraft.deadlinePreset === "overdue"
                    ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                Overdue
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">
                  From
                </span>
                <DatePicker
                  value={localDraft.deadlineFrom}
                  showTime={false}
                  onChange={(date) =>
                    setLocalDraft((d) => ({
                      ...d,
                      deadlineFrom: date || undefined,
                      deadlinePreset: "custom",
                    }))
                  }
                  placeholder="Start"
                  compact
                  className="origin-top-left scale-90 bg-card"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">
                  To
                </span>
                <DatePicker
                  value={localDraft.deadlineTo}
                  showTime={false}
                  onChange={(date) =>
                    setLocalDraft((d) => ({
                      ...d,
                      deadlineTo: date || undefined,
                      deadlinePreset: "custom",
                    }))
                  }
                  placeholder="End"
                  compact
                  disabled={!localDraft.deadlineFrom}
                  className="origin-top-left scale-90 bg-card"
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-shrink-0 rounded-b-xl border-t bg-card p-3">
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="h-8 flex-1 border-border text-[11px] font-bold"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="h-8 flex-1 text-[11px] font-bold"
            >
              Apply
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
