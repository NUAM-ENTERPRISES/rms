/**
 * Multi-step job title picker: Sector → Profession type → Job titles
 */

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks";
import { useGetProfessionTypesQuery } from "@/features/candidates/api";
import { useGetAdminRoleCatalogQuery } from "@/features/admin/api/catalogSettingsApi";
import type { SectorValue } from "./SectorSelect";

export type JobTitlePickerRole = {
  id: string;
  name: string;
  label?: string;
};

export interface JobTitlePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (role: JobTitlePickerRole) => void;
  selectedRoleCatalogId?: string;
  selectedJobTitle?: string;
  pageSize?: number;
}

type WizardStep = 1 | 2 | 3;

const SECTOR_OPTIONS: {
  value: SectorValue;
  label: string;
  description: string;
  icon: typeof HeartPulse;
  accent: string;
  iconWrap: string;
}[] = [
  {
    value: "HEALTHCARE",
    label: "Healthcare",
    description: "Clinical, nursing, and medical support roles",
    icon: HeartPulse,
    accent:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-card to-card hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100/60",
    iconWrap: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80",
  },
  {
    value: "NON_HEALTH_CARE",
    label: "Non-healthcare",
    description: "Admin, operations, and non-clinical roles",
    icon: Building2,
    accent:
      "border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-card to-card hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/60",
    iconWrap: "bg-sky-100 text-sky-700 ring-1 ring-sky-200/80",
  },
];

const PROFESSION_PAGE_SIZE = 10;

const STEP_LABELS = ["Sector", "Profession", "Job title"] as const;

const STEP_COPY: Record<
  WizardStep,
  { title: string; description: string }
> = {
  1: {
    title: "Choose a sector",
    description: "Start with healthcare or non-healthcare.",
  },
  2: {
    title: "Pick a profession",
    description: "Narrow the catalog to the right staff type.",
  },
  3: {
    title: "Select job title",
    description: "Search and pick the exact role for this experience.",
  },
};

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function JobTitlePickerModal({
  open,
  onOpenChange,
  onSelect,
  selectedRoleCatalogId,
  selectedJobTitle,
  pageSize = 20,
}: JobTitlePickerModalProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [sector, setSector] = useState<SectorValue | "">("");
  const [professionTypeId, setProfessionTypeId] = useState("");
  const [professionTypeLabel, setProfessionTypeLabel] = useState("");
  const [professionPage, setProfessionPage] = useState(1);
  const [search, setSearch] = useState("");
  const [rolesPage, setRolesPage] = useState(1);
  const [accumulatedRoles, setAccumulatedRoles] = useState<
    Array<{ id: string; name: string; label?: string }>
  >([]);

  const debouncedSearch = useDebounce(search, 300);

  const resetWizard = useCallback(() => {
    setStep(1);
    setSector("");
    setProfessionTypeId("");
    setProfessionTypeLabel("");
    setProfessionPage(1);
    setSearch("");
    setRolesPage(1);
    setAccumulatedRoles([]);
  }, []);

  useEffect(() => {
    if (open) {
      resetWizard();
    }
  }, [open, resetWizard]);

  const {
    data: professionData,
    isLoading: isLoadingProfessions,
    isFetching: isFetchingProfessions,
  } = useGetProfessionTypesQuery(
    sector
      ? {
          sector,
          page: professionPage,
          limit: PROFESSION_PAGE_SIZE,
        }
      : undefined,
    {
      skip: !open || !sector || step < 2,
    },
  );

  const professionTypes = professionData?.professionTypes ?? [];
  const professionPagination = professionData?.pagination;
  const professionTotalPages = professionPagination?.totalPages ?? 1;
  const selectedSectorOption = SECTOR_OPTIONS.find(
    (option) => option.value === sector,
  );

  const rolesQueryParams =
    open && professionTypeId && step === 3
      ? {
          professionTypeId,
          sector: sector || undefined,
          search: debouncedSearch || undefined,
          page: rolesPage,
          limit: pageSize,
        }
      : undefined;

  const {
    data: rolesCatalogData,
    isLoading: isLoadingRoles,
    isFetching: isFetchingRoles,
  } = useGetAdminRoleCatalogQuery(rolesQueryParams, {
    skip: rolesQueryParams === undefined,
  });

  const rolesPagination = rolesCatalogData?.pagination;
  const hasMoreRoles = rolesPagination
    ? rolesPage < (rolesPagination.totalPages || 1)
    : false;

  useEffect(() => {
    setAccumulatedRoles([]);
    setRolesPage(1);
  }, [debouncedSearch, professionTypeId, sector]);

  useEffect(() => {
    const catalogRoles = rolesCatalogData?.roles ?? [];
    if (!catalogRoles.length) {
      setAccumulatedRoles((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const nextRoles = catalogRoles
      .filter((role) => role.isActive !== false)
      .map((role) => ({
        id: role.id,
        name: role.name || role.label || "",
        label: role.label || role.name,
      }))
      .sort((a, b) =>
        (a.label || a.name).localeCompare(b.label || b.name),
      );

    setAccumulatedRoles((prev) => {
      if (rolesPage === 1) {
        if (
          prev.length === nextRoles.length &&
          prev.every((role, index) => role.id === nextRoles[index]?.id)
        ) {
          return prev;
        }
        return nextRoles;
      }

      const byId = new Map(prev.map((role) => [role.id, role]));
      for (const role of nextRoles) {
        byId.set(role.id, role);
      }
      const merged = Array.from(byId.values()).sort((a, b) =>
        (a.label || a.name).localeCompare(b.label || b.name),
      );
      if (
        merged.length === prev.length &&
        merged.every((role, index) => role.id === prev[index]?.id)
      ) {
        return prev;
      }
      return merged;
    });
  }, [rolesCatalogData, rolesPage]);

  const handleSectorSelect = (value: SectorValue) => {
    setSector(value);
    setProfessionTypeId("");
    setProfessionTypeLabel("");
    setProfessionPage(1);
    setSearch("");
    setRolesPage(1);
    setAccumulatedRoles([]);
    setStep(2);
  };

  const handleProfessionSelect = (id: string, label: string) => {
    setProfessionTypeId(id);
    setProfessionTypeLabel(label);
    setSearch("");
    setRolesPage(1);
    setAccumulatedRoles([]);
    setStep(3);
  };

  const handleRoleSelect = (role: JobTitlePickerRole) => {
    onSelect({
      id: role.id,
      name: role.label || role.name,
      label: role.label || role.name,
    });
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 2) {
      setProfessionTypeId("");
      setProfessionTypeLabel("");
      setProfessionPage(1);
      setStep(1);
      return;
    }
    if (step === 3) {
      setSearch("");
      setRolesPage(1);
      setAccumulatedRoles([]);
      setStep(2);
    }
  };

  const loadMoreRoles = useCallback(() => {
    if (hasMoreRoles && !isFetchingRoles) {
      setRolesPage((prev) => prev + 1);
    }
  }, [hasMoreRoles, isFetchingRoles]);

  const stepCopy = STEP_COPY[step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl gap-0 overflow-hidden p-0 rounded-2xl border-border shadow-2xl">
        <DialogHeader className="relative space-y-0 overflow-hidden border-b border-border px-0 pb-0 pt-0 text-left">
          <div className="bg-gradient-to-br from-primary/10 via-card to-sky-50/40 px-6 pb-5 pt-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Select job title
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {stepCopy.description}
                </DialogDescription>
              </div>
              <Badge
                variant="secondary"
                className="ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              >
                Step {step} of 3
              </Badge>
            </div>

            <nav
              aria-label="Job title selection steps"
              className="mt-5 space-y-3"
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-all duration-500 ease-out",
                    step === 1 && "w-1/3",
                    step === 2 && "w-2/3",
                    step === 3 && "w-full",
                  )}
                  aria-hidden
                />
              </div>
              <ol className="grid grid-cols-3 gap-2">
                {STEP_LABELS.map((label, index) => {
                  const stepNumber = (index + 1) as WizardStep;
                  const isActive = step === stepNumber;
                  const isComplete = step > stepNumber;
                  return (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                        isActive && "bg-card/80 shadow-sm ring-1 ring-border",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                          isActive &&
                            "bg-primary text-primary-foreground shadow-sm",
                          isComplete && "bg-primary/15 text-primary",
                          !isActive &&
                            !isComplete &&
                            "bg-muted text-muted-foreground",
                        )}
                        aria-current={isActive ? "step" : undefined}
                      >
                        {isComplete ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          stepNumber
                        )}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs font-medium",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {(selectedSectorOption || professionTypeLabel) && step > 1 ? (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {selectedSectorOption ? (
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full border-border bg-card/70 px-2.5 py-0.5 text-[11px] font-medium"
                  >
                    <selectedSectorOption.icon
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden
                    />
                    {selectedSectorOption.label}
                  </Badge>
                ) : null}
                {professionTypeLabel ? (
                  <>
                    <ArrowRight
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden
                    />
                    <Badge
                      variant="outline"
                      className="rounded-full border-border bg-card/70 px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      {professionTypeLabel}
                    </Badge>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="px-6 py-5 min-h-[320px]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {stepCopy.title}
            </h3>
          </div>

          {step === 1 ? (
            <div
              className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-3"
              role="listbox"
              aria-label="Select sector"
            >
              <Label className="sr-only">
                Is this a healthcare or non-healthcare role?
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {SECTOR_OPTIONS.map((option) => {
                  const isSelected = sector === option.value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSectorSelect(option.value)}
                      className={cn(
                        "group relative flex flex-col gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        option.accent,
                        isSelected && "ring-2 ring-primary border-primary",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                          option.iconWrap,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="space-y-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {option.label}
                          </span>
                          <ArrowRight
                            className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                            aria-hidden
                          />
                        </span>
                        <span
                          className="block text-xs leading-relaxed text-muted-foreground"
                          aria-hidden
                        >
                          {option.description}
                        </span>
                      </span>
                      {isSelected ? (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div
              className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-3"
              role="listbox"
              aria-label="Select profession type"
            >
              <Label className="sr-only">Select profession type</Label>
              {isLoadingProfessions && professionTypes.length === 0 ? (
                <LoadingState label="Loading professions..." />
              ) : professionTypes.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No professions found"
                  description="Try going back and choosing a different sector."
                />
              ) : (
                <>
                  <div
                    className={cn(
                      "max-h-[300px] space-y-2 overflow-y-auto pr-1 transition-opacity",
                      isFetchingProfessions && "opacity-60",
                    )}
                  >
                    {professionTypes.map((type) => {
                      const isSelected = professionTypeId === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() =>
                            handleProfessionSelect(type.id, type.label)
                          }
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-all duration-150",
                            "hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected &&
                              "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase tracking-wide",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                            aria-hidden
                          >
                            {(type.label || "?").slice(0, 2)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {type.label}
                            </span>
                            <span
                              className="mt-0.5 block text-[11px] text-muted-foreground"
                              aria-hidden
                            >
                              Continue to job titles
                            </span>
                          </span>
                          <ArrowRight
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-all duration-150",
                              "opacity-40 group-hover:translate-x-0.5 group-hover:opacity-100",
                              isSelected && "text-primary opacity-100",
                            )}
                            aria-hidden
                          />
                        </button>
                      );
                    })}
                  </div>

                  {professionPagination && professionTotalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        Page{" "}
                        <span className="font-semibold text-foreground">
                          {professionPagination.page}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-foreground">
                          {professionTotalPages}
                        </span>
                        <span className="mx-1.5 text-border">·</span>
                        {professionPagination.total} total
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-2.5"
                          disabled={
                            professionPage <= 1 || isFetchingProfessions
                          }
                          onClick={() =>
                            setProfessionPage((current) =>
                              Math.max(1, current - 1),
                            )
                          }
                          aria-label="Previous profession page"
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                          <span className="sr-only sm:not-sr-only sm:ml-1">
                            Prev
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-2.5"
                          disabled={
                            professionPage >= professionTotalPages ||
                            isFetchingProfessions
                          }
                          onClick={() =>
                            setProfessionPage((current) =>
                              Math.min(professionTotalPages, current + 1),
                            )
                          }
                          aria-label="Next profession page"
                        >
                          <span className="sr-only sm:not-sr-only sm:mr-1">
                            Next
                          </span>
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ) : professionPagination ? (
                    <p className="text-center text-[11px] text-muted-foreground">
                      Showing {professionTypes.length} of{" "}
                      {professionPagination.total} profession
                      {professionPagination.total === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-3">
              <Label htmlFor="job-title-picker-search" className="sr-only">
                Select job title
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="job-title-picker-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search job titles..."
                  className="h-11 rounded-xl border-border bg-background pl-10 shadow-sm"
                  autoFocus
                />
              </div>

              {isLoadingRoles && accumulatedRoles.length === 0 ? (
                <LoadingState label="Loading job titles..." />
              ) : accumulatedRoles.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title={search ? "No matches" : "No job titles available"}
                  description={
                    search
                      ? "Try a different search term."
                      : "This profession has no active titles yet."
                  }
                />
              ) : (
                <div
                  className="max-h-[280px] space-y-1 overflow-y-auto rounded-xl border border-border bg-card/50 p-1.5"
                  role="listbox"
                  aria-label="Job titles"
                >
                  {accumulatedRoles.map((role) => {
                    const displayLabel = role.label || role.name;
                    const isSelected =
                      selectedRoleCatalogId === role.id ||
                      selectedJobTitle === displayLabel ||
                      selectedJobTitle === role.name;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleRoleSelect(role)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150",
                          "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected &&
                            "bg-primary/10 ring-1 ring-inset ring-primary/25",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-transparent group-hover:border-primary/40",
                          )}
                        >
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                        <Briefcase
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {displayLabel}
                        </span>
                        {isSelected ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 rounded-full px-2 py-0 text-[10px] font-semibold"
                            aria-hidden
                          >
                            Selected
                          </Badge>
                        ) : (
                          <span
                            className="shrink-0 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          >
                            Choose
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {hasMoreRoles ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadMoreRoles}
                  disabled={isFetchingRoles}
                  className="w-full rounded-xl"
                >
                  {isFetchingRoles ? (
                    <>
                      <Loader2
                        className="mr-2 h-3.5 w-3.5 animate-spin"
                        aria-hidden
                      />
                      Loading...
                    </>
                  ) : (
                    "Load more titles"
                  )}
                </Button>
              ) : accumulatedRoles.length > 0 ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  Showing {accumulatedRoles.length} title
                  {accumulatedRoles.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:justify-between">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="gap-1.5 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </Button>
            ) : (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Pick a path to continue
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
