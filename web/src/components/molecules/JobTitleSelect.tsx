/**
 * Job Title Select component with search and pagination
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronsUpDown, Briefcase, Loader2 } from "lucide-react";
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
import { useGetRoleDepartmentsQuery } from "@/features/projects";
import { useDebounce } from "@/hooks";

export interface JobTitleSelectProps {
  /** Current selected job title */
  value?: string;
  /** Callback when job title changes */
  onValueChange?: (jobTitle: string) => void;
  /** Callback when role changes, returns both id and label */
  onRoleChange?: (role: { id: string; name: string; label?: string } | null) => void;
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
  /** Filter by category */
  filterByCategory?: string;
  /** Filter roles by department id (if provided this will load roles for the department) */
  departmentId?: string;
  /** Show "No selection" option */
  allowEmpty?: boolean;
  /** Number of roles to show per page */
  pageSize?: number;
}

/**
 * JobTitleSelect component with search and pagination for selecting job titles
 */
export function JobTitleSelect({
  value = "",
  onValueChange,
  onRoleChange,
  label,
  placeholder = "Select a job title...",
  required = false,
  disabled = false,
  error,
  className,
  filterByCategory,
  departmentId,
  allowEmpty = true,
  pageSize = 10,
}: JobTitleSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Note: we intentionally use the `role-departments` endpoint for both global and
  // department-scoped role fetching. Query params are assembled where the hook is called.
  // Use the role-departments endpoint exclusively. If departmentId is provided we request that
  // department with includeRoles=true to get its roles; otherwise request departments with
  // includeRoles=true and flatten roles from the returned departments for global searching.
  // If disabled and no department is selected, avoid calling the API (prevent unnecessary network calls)
  const departmentsQueryParams = disabled && !departmentId
    ? undefined
    : departmentId
    ? { id: departmentId, includeRoles: true, page: 1, limit: 1 }
    : { includeRoles: true, search: debouncedSearch, page, limit: pageSize };

  const { data: deptData, isLoading, isFetching } = useGetRoleDepartmentsQuery(departmentsQueryParams);

  // When departmentId is provided, the first department contains the roles; otherwise flatten
  // roles across departments returned on the current page.
  const departments = deptData?.data?.departments || [];
  const rolesList = departments.flatMap((d) => d.roles || []);

  // Deduplicate roles by id (in case a role appears in multiple departments)
  const rolesById = rolesList.reduce<Record<string, any>>((acc, r) => {
    if (!acc[r.id]) acc[r.id] = r;
    return acc;
  }, {});
  const roles = Object.values(rolesById);

  const pagination = deptData?.data?.pagination;
  const hasMore = pagination ? page < (pagination.totalPages || pagination.pages || 1) : false;

  // Find selected role
  const selectedRole = roles.find((r) => r.label === value || r.name === value || r.id === value);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Reset page when department selection changes
  useEffect(() => {
    setPage(1);
  }, [departmentId]);

  // Load more roles
  const loadMore = useCallback(() => {
    if (!departmentId && hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isFetching, departmentId]);
  // include departmentId in deps to avoid stale closures

  // Handle role selection
  const handleSelect = (jobLabel: string) => {
    if (jobLabel === value) {
      // Deselect if clicking the same role
      if (allowEmpty) {
        onValueChange?.("");
        onRoleChange?.(null);
      }
    } else {
      onValueChange?.(jobLabel);
      // Find the selected role and pass both id, name (label), and label
      const selectedRole = roles.find((r) => r.label === jobLabel);
      if (selectedRole && onRoleChange) {
        onRoleChange({ 
          id: selectedRole.id, 
          name: selectedRole.label || selectedRole.name,
          label: selectedRole.label 
        });
      }
    }
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
                {selectedRole || value ? (
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{selectedRole?.label || selectedRole?.name || value}</span>
                {selectedRole?.category && (
                  <Badge
                    variant="outline"
                    className="text-xs flex-shrink-0 bg-blue-100 text-blue-800"
                  >
                    {selectedRole.category}
                  </Badge>
                )}
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex flex-col max-h-[400px]">
            <div className="p-2 border-b bg-white sticky top-0 z-10">
              <Input
                placeholder="Search job titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto">
              {isLoading && !roles.length ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500">Loading job titles...</p>
                </div>
              ) : roles.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">
                    {search ? "No job titles found." : "No job titles available."}
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
                        <span className="text-slate-500 italic">Please select a job title</span>
                      </button>
                      <div className="my-1 mx-2 h-px bg-slate-200" />
                    </>
                  )}
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleSelect(role.label || role.name)}
                      className="flex w-full items-center rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 text-left"
                    >
                          {(() => {
                            const isSelected = Boolean(
                              selectedRole && (selectedRole.id === role.id || selectedRole.label === role.label)
                            );
                            return (
                              <Check
                                className={cn(
                                  "mr-3 h-4 w-4 flex-shrink-0",
                                  isSelected ? "opacity-100 text-blue-600" : "opacity-0"
                                )}
                              />
                            );
                          })()}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Briefcase className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        <span className="truncate flex-1 text-slate-700 font-medium">{role.label || role.name}</span>
                        {role.category && (
                          <Badge
                            variant="outline"
                            className="text-xs flex-shrink-0 font-normal bg-blue-100 text-blue-800"
                          >
                            {role.category}
                          </Badge>
                        )}
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
                      `Load more`
                    )}
                  </Button>
                </div>
              )}
              {pagination && !hasMore && roles.length > 0 && (
                <div className="py-2 px-3 text-xs text-slate-500 text-center border-t bg-slate-50">
                  Showing all {roles.length} results
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
