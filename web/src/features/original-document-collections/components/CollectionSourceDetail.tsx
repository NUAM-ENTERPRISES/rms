import { Truck } from "lucide-react";
import { CourierTrackingDisplay } from "@/shared/components/CourierTrackingDisplay";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  COLLECTION_TYPE,
  DIRECT_OFFICE_LABELS,
} from "../constants";

export type CollectionSourceFields = {
  collectionType: string;
  directOffice?: string | null;
  directOfficeOther?: string | null;
  interviewVenue?: string | null;
  agent?: { name: string } | null;
  agentNameManual?: string | null;
  courierPartner?: string | null;
  trackingNumber?: string | null;
};

export function getCollectionSourceDetailText(
  collection: CollectionSourceFields,
): string {
  switch (collection.collectionType) {
    case COLLECTION_TYPE.DIRECT:
      return collection.directOffice === "other"
        ? (collection.directOfficeOther ?? "Other")
        : (DIRECT_OFFICE_LABELS[collection.directOffice ?? ""] ??
            collection.directOffice ??
            "—");
    case COLLECTION_TYPE.AGENT:
      return collection.agent?.name ?? collection.agentNameManual ?? "—";
    case COLLECTION_TYPE.INTERVIEW_COORDINATOR:
      return collection.interviewVenue ?? "—";
    case COLLECTION_TYPE.COURIER:
      return (
        [collection.courierPartner, collection.trackingNumber]
          .filter(Boolean)
          .join(" / ") || "—"
      );
    case COLLECTION_TYPE.RECRUITER:
      return "Recruiter handover";
    default:
      return "—";
  }
}

interface CollectionSourceDetailProps {
  collection: CollectionSourceFields;
  className?: string;
}

export function CollectionSourceDetail({
  collection,
  className,
}: CollectionSourceDetailProps) {
  if (collection.collectionType === COLLECTION_TYPE.COURIER) {
    if (collection.trackingNumber?.trim()) {
      return (
        <CourierTrackingDisplay
          className={className}
          courierPartner={collection.courierPartner}
          trackingId={collection.trackingNumber}
        />
      );
    }

    if (collection.courierPartner?.trim()) {
      return (
        <Badge
          variant="outline"
          className={cn(
            "h-7 gap-1 rounded-lg border-border/70 bg-background/90 px-2 text-[10px] font-semibold text-teal-800 shadow-sm",
            className,
          )}
        >
          <Truck className="h-3 w-3" aria-hidden="true" />
          {collection.courierPartner}
        </Badge>
      );
    }

    return <span className={cn("text-sm text-slate-500", className)}>—</span>;
  }

  return (
    <span className={cn("text-sm text-slate-600", className)}>
      {getCollectionSourceDetailText(collection)}
    </span>
  );
}
