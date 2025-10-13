import { Badge } from "@/components/ui/badge";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { DocumentType } from "@/constants/document-types";
import { cn } from "@/lib/utils";

interface DocumentTypeBadgeProps {
  docType: DocumentType;
  className?: string;
  showIcon?: boolean;
  variant?: "default" | "outline" | "secondary";
}

export default function DocumentTypeBadge({
  docType,
  className,
  showIcon = true,
  variant = "outline",
}: DocumentTypeBadgeProps) {
  const config = getDocumentTypeConfig(docType);

  return (
    <Badge
      variant={variant}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      {showIcon && config.icon && (
        <span className="text-[10px]">{config.icon}</span>
      )}
      {config.displayName}
    </Badge>
  );
}
