import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "@/constants/statuses";
import { CandidateProjectStatus } from "@/constants/statuses";
import { cn } from "@/lib/utils";

interface CandidateStatusBadgeProps {
  status: CandidateProjectStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function CandidateStatusBadge({
  status,
  className,
  showIcon = true,
  size = "md",
}: CandidateStatusBadgeProps) {
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <Badge
      variant={config.badgeClass as any}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && config.icon && (
        <span className="text-[10px]">{config.icon}</span>
      )}
      {config.label}
    </Badge>
  );
}
