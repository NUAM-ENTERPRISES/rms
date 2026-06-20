import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OfferLetterBadgeProps = {
  uploaderName?: string | null;
  label?: string;
  uploadedAt?: string | null;
  size?: "sm" | "xs";
  align?: "start" | "end";
  className?: string;
};

const formatUploadedDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function OfferLetterBadge({
  uploaderName,
  label = "Offer Letter Uploaded",
  uploadedAt,
  size = "sm",
  align = "start",
  className,
}: OfferLetterBadgeProps) {
  const isXs = size === "xs";

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 w-fit max-w-[10rem]",
        align === "end" && "items-end text-right",
        className,
      )}
    >
      <Badge
        variant="secondary"
        className={cn(
          "bg-emerald-100 text-emerald-700 border-none font-bold uppercase tracking-wide w-fit",
          isXs ? "text-[8px] px-1.5 py-0 h-4" : "text-[10px] px-2 py-0.5",
        )}
      >
        {label}
      </Badge>
      {uploaderName && (
        <p
          className={cn(
            "text-slate-500 truncate leading-tight",
            isXs ? "text-[9px]" : "text-[11px]",
          )}
        >
          by {uploaderName}
        </p>
      )}
      {uploadedAt && (
        <p className={cn("text-slate-400 leading-tight", isXs ? "text-[8px]" : "text-[10px]")}>
          {formatUploadedDate(uploadedAt)}
        </p>
      )}
    </div>
  );
}
