import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowRight,
  ChevronRight,
  Footprints,
  Loader2,
  MapPin,
  Plus,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/useCan";
import { ShipmentStatusBadge } from "../components/ShipmentStatusBadge";
import {
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE_LABELS,
} from "../constants";
import type { CourierCandidateGroup } from "../types";

interface CandidatesCourierViewProps {
  groups: CourierCandidateGroup[];
  activeFilterLabel: string;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  totalPages: number;
  totalCandidates: number;
  onPageChange: (page: number) => void;
}

function candidateInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function CandidatesCourierView({
  groups,
  activeFilterLabel,
  isLoading,
  isFetching,
  page,
  totalPages,
  totalCandidates,
  onPageChange,
}: CandidatesCourierViewProps) {
  const navigate = useNavigate();
  const canWrite = useCan("write:documents");

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-16 text-muted-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Users className="h-8 w-8 opacity-50" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium">No candidates match this filter</p>
          <p className="mt-1 text-sm">
            {activeFilterLabel === "All"
              ? "Create the first courier leg to get started."
              : `No results for "${activeFilterLabel}".`}
          </p>
        </div>
        {canWrite && activeFilterLabel === "All" && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => navigate("/courier-management/new")}
          >
            <Plus className="h-4 w-4" />
            New Courier Leg
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-opacity",
        isFetching && "opacity-70",
      )}
    >
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold">Candidates Courier</h2>
            <Badge variant="secondary" className="text-xs font-medium">
              {activeFilterLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}{" "}
            matching · {groups.length} on this page · Click a row for details
          </p>
        </div>
        {isFetching && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead className="w-[90px]">Legs</TableHead>
            <TableHead>Latest courier details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" aria-hidden />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const { candidate, candidateId, legCount, latestLeg, currentLocationHint } =
              group;
            const latest = latestLeg;

            return (
              <TableRow
                key={candidateId}
                className="cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                role="link"
                aria-label={`View courier details for ${candidate.firstName} ${candidate.lastName}`}
                onClick={() =>
                  navigate(`/courier-management/candidates/${candidateId}`)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/courier-management/candidates/${candidateId}`);
                  }
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={candidate.profileImage ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {candidateInitials(
                          candidate.firstName,
                          candidate.lastName,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {candidate.firstName} {candidate.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {candidate.candidateCode ?? "—"}
                        {candidate.lockerFileNumber && (
                          <span className="ml-1">
                            · Locker {candidate.lockerFileNumber}
                          </span>
                        )}
                      </p>
                      {currentLocationHint && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-teal-700">
                          <MapPin className="h-3 w-3 shrink-0" />
                          At {currentLocationHint}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {legCount}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        Leg {latest.legNumber}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {SHIPMENT_PURPOSE_LABELS[latest.purposeType]}
                      </Badge>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        {latest.deliveryMode === DELIVERY_MODE.COURIER ? (
                          <Truck className="h-3 w-3" />
                        ) : (
                          <Footprints className="h-3 w-3" />
                        )}
                        {DELIVERY_MODE_LABELS[latest.deliveryMode]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3 shrink-0 text-teal-600" />
                      <span className="truncate">{latest.fromAddressLabel}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{latest.toAddressLabel}</span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                      {latest.trackingId && (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {latest.courierPartner} · {latest.trackingId}
                        </code>
                      )}
                      {latest.sentAt && (
                        <span>
                          Sent {format(new Date(latest.sentAt), "MMM d, yyyy")}
                        </span>
                      )}
                      {latest.receivedAt && (
                        <span className="text-emerald-700">
                          Received{" "}
                          {format(new Date(latest.receivedAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <ShipmentStatusBadge status={latest.status} />
                </TableCell>

                <TableCell className="text-muted-foreground">
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
