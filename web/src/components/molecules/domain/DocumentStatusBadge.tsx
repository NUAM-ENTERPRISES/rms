import { Badge } from "@/components/ui/badge";
import { getDocumentStatusConfig } from "@/constants/statuses";
import { DocumentStatus } from "@/constants/statuses";
import { cn } from "@/lib/utils";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
  showIcon?: boolean;
}

export default function DocumentStatusBadge({
  status,
  className,
  showIcon = true,
}: DocumentStatusBadgeProps) {
  const config = getDocumentStatusConfig(status);

  return (
    <Badge
      variant={config.badgeClass as any}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium",
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
