import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CreReassignedStatusNote } from "./CreReassignedStatusNote";

type CreReassignedHandoffBadgeProps = {
  note?: string | null;
  creStatus?: string | null;
  candidateName?: string;
  className?: string;
};

/** CRE Reassigned badge with note control stacked underneath. */
export function CreReassignedHandoffBadge({
  note,
  creStatus,
  candidateName,
  className,
}: CreReassignedHandoffBadgeProps) {
  return (
    <div
      className={cn("flex shrink-0 flex-col items-start gap-0.5", className)}
    >
      <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-green-100 text-green-700 border border-green-200">
        CRE Reassigned
      </Badge>
      <CreReassignedStatusNote
        note={note}
        creStatus={creStatus}
        candidateName={candidateName}
      />
    </div>
  );
}
