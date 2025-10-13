/**
 * RoleSelect component - Single select for user roles
 * Following FE_GUIDELINES.md for consistent UI patterns
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
}

/**
 * RoleSelect component for selecting a single user role
 *
 * Features:
 * - Single select with search functionality
 * - Fetches roles from API
 * - Consistent styling with other form components
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
}: RoleSelectProps) {
  const { data: systemConfig, isLoading } = useSystemConfig();
  const roles = systemConfig?.data?.roles || [];

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={name} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex h-11 w-full items-center justify-center rounded-md border border-slate-200 bg-white/50 px-3 py-2 text-sm">
          <LoadingSpinner className="h-5 w-5 text-primary" />
          <span className="ml-2 text-slate-500">Loading roles...</span>
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
      <Label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Select
        value={value}
        onValueChange={onValueChange}
        name={name}
        disabled={disabled}
      >
        <SelectTrigger
          id={name}
          className={cn(
            "h-11 bg-white/50 border-slate-200 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200",
            error && "border-destructive focus:border-destructive"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent className="max-h-[300px]">
          <SelectItem value="no-role">No Role</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
