import { Badge } from "@/components/ui/badge";
import type { UserAccountStatus } from "@/features/admin/api";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  UserAccountStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  BLOCKED: {
    label: "Blocked",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

interface UserAccountStatusBadgeProps {
  status?: UserAccountStatus;
  className?: string;
}

export function UserAccountStatusBadge({
  status = "ACTIVE",
  className,
}: UserAccountStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.ACTIVE;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
