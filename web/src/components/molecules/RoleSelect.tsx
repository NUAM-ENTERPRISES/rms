import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface RoleOption {
  id: string;
  name: string;
  isSystem?: boolean;
  description?: string | null;
}

export interface RoleSelectProps {
  value?: string;
  onValueChange?: (roleId: string) => void;
  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  roles?: RoleOption[];
  isLoadingRoles?: boolean;
  includeNoRoleOption?: boolean;
  noRoleOptionLabel?: string;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  roleTypeFilter?: "SYSTEM" | "CUSTOM" | "ALL";
  onRoleTypeFilterChange?: (value: "SYSTEM" | "CUSTOM" | "ALL") => void;
  onResetFilters?: () => void;
}

/**
 * RoleSelect – combobox-style role picker with search & type filter.
 */
export function RoleSelect({
  value,
  onValueChange,
  name,
  label = "Role",
  placeholder = "Select a role...",
  required = false,
  disabled = false,
  error,
  className,
  roles: providedRoles,
  isLoadingRoles: providedLoadingState,
  includeNoRoleOption = true,
  noRoleOptionLabel = "No Role",
  searchable = false,
  searchValue,
  onSearchChange,
  roleTypeFilter,
  onRoleTypeFilterChange,
  onResetFilters,
}: RoleSelectProps) {
  const roles = providedRoles ?? [];
  const isLoadingRoles = providedLoadingState ?? false;

  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeSearch = searchValue ?? localSearch;
  const selectedRole = roles.find((r) => r.id === value);

  const filteredRoles = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      `${r.name} ${r.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [roles, activeSearch]);

  function handleSearchChange(v: string) {
    onSearchChange?.(v);
    setLocalSearch(v);
  }

  function handleSelect(id: string) {
    onValueChange?.(id);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (disabled) return;
    setOpen(next);
    if (next) {
      // auto-focus search input when opening
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }

  /* ── Loading skeleton ── */
  if (isLoadingRoles) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <div className="flex h-11 w-full items-center justify-center rounded-md border border-border bg-card/50 px-3 py-2 text-sm">
          <LoadingSpinner className="h-5 w-5 text-primary" />
          <span className="ml-2 text-muted-foreground">Loading roles…</span>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {searchable ? (
        /* ── Combobox variant ── */
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              disabled={disabled}
              className={cn(
                "h-11 w-full justify-between border-border bg-card/50 font-normal hover:bg-card",
                !selectedRole && "text-muted-foreground",
                error && "border-destructive focus-visible:ring-destructive/40",
              )}
            >
              <span className="truncate">{selectedRole?.name ?? placeholder}</span>
              <ChevronDown
                className={cn(
                  "ml-2 h-4 w-4 shrink-0 opacity-60 transition-transform",
                  open && "rotate-180",
                )}
              />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[480px] p-0 shadow-lg"
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {/* ── Header: filter pills + search ── */}
            <div className="space-y-2 border-b border-border bg-popover px-3 py-3">
              {/* Type filter */}
              {onRoleTypeFilterChange && (
                <div className="flex items-center gap-1.5">
                  {(["ALL", "SYSTEM", "CUSTOM"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onRoleTypeFilterChange(type)}
                      className={cn(
                        "h-7 rounded-full border px-3 text-[11px] font-medium transition-colors",
                        roleTypeFilter === type
                          ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {type === "SYSTEM" ? "System" : type === "CUSTOM" ? "Custom" : "All"}
                    </button>
                  ))}
                  {onResetFilters && (activeSearch || roleTypeFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetFilters();
                        handleSearchChange("");
                      }}
                      className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Reset
                    </button>
                  )}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  value={activeSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search roles…"
                  className="h-9 w-full rounded-md border border-border bg-muted/30 pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/60 focus:bg-card dark:bg-muted/20 dark:focus:bg-card"
                />
              </div>
            </div>

            {/* ── Role list ── */}
            <div
              role="listbox"
              aria-label="Roles"
              className="max-h-60 overflow-y-auto bg-popover py-1"
            >
              {/* No Role option */}
              {includeNoRoleOption && (
                <button
                  type="button"
                  role="option"
                  aria-selected={!value || value === ""}
                  onClick={() => handleSelect("")}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    (!value || value === "") && "bg-accent/50",
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      !value || value === "" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="italic text-muted-foreground">{noRoleOptionLabel}</span>
                </button>
              )}

              {/* Empty state */}
              {!isLoadingRoles && filteredRoles.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No roles found.
                </p>
              )}

              {/* Role items */}
              {filteredRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  role="option"
                  aria-selected={value === role.id}
                  onClick={() => handleSelect(role.id)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    value === role.id && "bg-accent/50",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-primary",
                      value === role.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {role.name}
                    </div>
                    {role.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {role.description}
                      </div>
                    )}
                  </div>
                  {typeof role.isSystem === "boolean" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-auto mt-0.5 shrink-0 text-[10px] uppercase",
                        role.isSystem
                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                      )}
                    >
                      {role.isSystem ? "System" : "Custom"}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        /* ── Plain native select ── */
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            "h-11 w-full rounded-md border border-border bg-card/50 px-3 text-sm text-foreground",
            error && "border-destructive",
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {includeNoRoleOption && <option value="">— {noRoleOptionLabel} —</option>}
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
