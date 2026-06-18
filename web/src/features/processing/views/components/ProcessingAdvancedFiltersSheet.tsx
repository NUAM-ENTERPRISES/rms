import { useEffect, useState } from "react";
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
import { SlidersHorizontal, Globe, Building2, CalendarDays, UserCheck, FileText } from "lucide-react";
import { MultiCountrySelect, DatePicker } from "@/components/molecules";
import { SECTOR_TYPES } from "@/constants/candidate-constants";
import { useGetRecruitersListQuery } from "@/services/recruiterAnalyticsApi";
import { useGetUsersQuery } from "@/features/admin";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import type { ProcessingAdvancedFilters } from "@/features/processing/utils/processingListQuery";

const DATE_PRESETS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "this_week", label: "Week" },
  { key: "this_month", label: "Month" },
] as const;

interface ProcessingAdvancedFiltersSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProcessingAdvancedFilters;
  onApply: (filters: ProcessingAdvancedFilters) => void;
  onReset: () => void;
  showAssignedToFilter?: boolean;
}

export function ProcessingAdvancedFiltersSheet({
  isOpen,
  onOpenChange,
  filters,
  onApply,
  onReset,
  showAssignedToFilter = false,
}: ProcessingAdvancedFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<ProcessingAdvancedFilters>(filters);

  const { data: recruitersData } = useGetRecruitersListQuery(undefined, { skip: !isOpen });
  const recruiters = recruitersData?.data ?? [];

  const { data: usersResponse } = useGetUsersQuery(
    { limit: 50, roles: ["Processing Executive"], accountStatus: "ACTIVE" },
    { skip: !isOpen || !showAssignedToFilter },
  );
  const processingUsers = usersResponse?.data?.users ?? [];

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  const handleDatePresetClick = (preset: string) => {
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
      case "last_7_days":
        from = startOfDay(subDays(now, 6));
        to = endOfDay(now);
        break;
      case "all":
      default:
        from = undefined;
        to = undefined;
        break;
    }

    setLocalFilters((current) => ({
      ...current,
      datePreset: preset,
      dateFrom: from,
      dateTo: to,
    }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetOverlay className="top-[64px] z-40" />
      <SheetContent
        side="right"
        className="top-[74px] right-2 z-40 flex h-[calc(100vh-124px)] w-full flex-col rounded-xl border p-0 shadow-2xl sm:max-w-[340px]"
      >
        <SheetHeader className="flex-shrink-0 rounded-t-xl border-b bg-white px-5 py-3">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            Advanced Filters
          </SheetTitle>
          <SheetDescription className="mt-0.5 text-[11px] text-muted-foreground">
            Refine processing candidates in the table
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/30 px-5 py-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <Globe className="h-3 w-3 text-emerald-500" />
              Project Country
            </label>
            <MultiCountrySelect
              placeholder="Select countries"
              value={localFilters.countryCodes}
              onValueChange={(val) =>
                setLocalFilters((current) => ({ ...current, countryCodes: val }))
              }
              className="origin-left scale-95 bg-white shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <Building2 className="h-3 w-3 text-purple-500" />
              Sector
            </label>
            <Select
              value={localFilters.sector}
              onValueChange={(val) =>
                setLocalFilters((current) => ({ ...current, sector: val }))
              }
            >
              <SelectTrigger className="h-9 rounded-lg border-gray-200 bg-white text-xs shadow-sm">
                <SelectValue placeholder="All sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sectors</SelectItem>
                {Object.entries(SECTOR_TYPES).map(([key, value]) => (
                  <SelectItem key={value} value={value}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <UserCheck className="h-3 w-3 text-blue-500" />
              Recruiter
            </label>
            <Select
              value={localFilters.recruiterId}
              onValueChange={(val) =>
                setLocalFilters((current) => ({ ...current, recruiterId: val }))
              }
            >
              <SelectTrigger className="h-9 rounded-lg border-gray-200 bg-white text-xs shadow-sm">
                <SelectValue placeholder="All recruiters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All recruiters</SelectItem>
                {recruiters.map((recruiter) => (
                  <SelectItem key={recruiter.id} value={recruiter.id}>
                    {recruiter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showAssignedToFilter ? (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <UserCheck className="h-3 w-3 text-indigo-500" />
                Assigned Processing User
              </label>
              <Select
                value={localFilters.assignedToId}
                onValueChange={(val) =>
                  setLocalFilters((current) => ({ ...current, assignedToId: val }))
                }
              >
                <SelectTrigger className="h-9 rounded-lg border-gray-200 bg-white text-xs shadow-sm">
                  <SelectValue placeholder="All processing users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All processing users</SelectItem>
                  {processingUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <FileText className="h-3 w-3 text-amber-500" />
              File / Locker Number
            </label>
            <Input
              value={localFilters.fileNumber}
              onChange={(e) =>
                setLocalFilters((current) => ({ ...current, fileNumber: e.target.value }))
              }
              placeholder="e.g. 1112"
              className="h-9 rounded-lg border-gray-200 bg-white text-xs shadow-sm"
            />
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-3">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <CalendarDays className="h-3 w-3 text-rose-500" />
              Last Updated
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  size="sm"
                  variant={localFilters.datePreset === preset.key ? "default" : "outline"}
                  className="h-7 rounded-full px-2.5 text-[10px]"
                  onClick={() => handleDatePresetClick(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                value={localFilters.dateFrom}
                onChange={(date) =>
                  setLocalFilters((current) => ({
                    ...current,
                    datePreset: "custom",
                    dateFrom: date,
                  }))
                }
                placeholder="From"
                showTime={false}
                compact
                className="h-9 text-xs"
              />
              <DatePicker
                value={localFilters.dateTo}
                onChange={(date) =>
                  setLocalFilters((current) => ({
                    ...current,
                    datePreset: "custom",
                    dateTo: date,
                  }))
                }
                placeholder="To"
                showTime={false}
                compact
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="flex-shrink-0 gap-2 border-t bg-white px-5 py-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(localFilters);
                onOpenChange(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
