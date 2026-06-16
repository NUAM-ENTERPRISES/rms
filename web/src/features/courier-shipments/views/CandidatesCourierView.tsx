import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Eye,
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
import {
  CandidateListIdentityCell,
  ImageViewer,
} from "@/components/molecules";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/useCan";
import { ShipmentStatusBadge } from "../components/ShipmentStatusBadge";
import {
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE_LABELS,
} from "../constants";
import type { CourierCandidateGroup } from "../types";

const PAGE_LIMIT = 10;

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
  const canWrite = useCan("write:courier_management");

  const openCandidateCourier = (candidateId: string) => {
    navigate(`/courier-management/candidates/${candidateId}`);
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Users className="h-8 w-8 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600">No candidates match this filter</p>
          <p className="max-w-xs text-center text-sm text-slate-400">
            {activeFilterLabel === "All"
              ? "Create the first courier leg to get started."
              : `No results for "${activeFilterLabel}".`}
          </p>
          {canWrite && activeFilterLabel === "All" && (
            <Button
              size="sm"
              className="mt-1 h-9 gap-1.5 rounded-xl bg-teal-600 px-4 text-white hover:bg-teal-700"
              onClick={() => navigate("/courier-management/new")}
            >
              <Plus className="h-3.5 w-3.5" />
              New Courier Leg
            </Button>
          )}
        </div>
      </div>
    );
  }

  const rangeStart = (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGE_LIMIT, totalCandidates);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-opacity",
        isFetching && "opacity-70",
      )}
    >
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 p-2.5 shadow-md">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold text-gray-900">
                  Candidates Courier
                </h2>
                <Badge variant="secondary" className="text-xs font-medium">
                  {activeFilterLabel}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}{" "}
                matching · Click a row to open courier history
              </p>
            </div>
          </div>
          {isFetching && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="overflow-hidden">
        <Table>
          <TableHeader className="sticky">
            <TableRow className="border-b border-gray-200 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="h-10 min-w-[14rem] whitespace-normal px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Candidate
              </TableHead>
              <TableHead className="h-10 w-[90px] px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Legs
              </TableHead>
              <TableHead className="h-10 min-w-[16rem] px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Latest courier details
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Location
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Status
              </TableHead>
              <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groups.map((group) => {
              const {
                candidate,
                candidateId,
                legCount,
                latestLeg,
                currentLocationHint,
                inTransitCount,
                receivedCount,
              } = group;
              const latest = latestLeg;
              const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();

              return (
                <TableRow
                  key={candidateId}
                  className="cursor-pointer border-b border-gray-100 transition-colors last:border-b-0 hover:bg-blue-50/30"
                  tabIndex={0}
                  role="link"
                  aria-label={`View courier details for ${fullName}`}
                  onClick={() => openCandidateCourier(candidateId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCandidateCourier(candidateId);
                    }
                  }}
                >
                  <TableCell className="min-w-[14rem] whitespace-normal px-4 py-3 align-top">
                    <div className="flex items-start gap-3">
                      <ImageViewer
                        title={fullName}
                        src={candidate.profileImage || null}
                        fallbackSrc="https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                        className="h-10 w-10 shrink-0 rounded-full"
                        ariaLabel={`View full image for ${fullName}`}
                        enableHoverPreview
                      />
                      <div className="min-w-0 flex-1">
                        <CandidateListIdentityCell
                          firstName={candidate.firstName}
                          lastName={candidate.lastName}
                          candidateCode={candidate.candidateCode}
                          onNameClick={() => openCandidateCourier(candidateId)}
                        />
                        {candidate.lockerFileNumber && (
                          <p className="mt-0.5 truncate text-[10px] font-medium text-teal-700">
                            Locker {candidate.lockerFileNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center align-top">
                    <div className="flex flex-col items-center gap-1">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-semibold text-slate-700"
                      >
                        {legCount}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {receivedCount}R · {inTransitCount}T
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="min-w-[16rem] px-4 py-3 align-top">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          Leg {latest.legNumber}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {SHIPMENT_PURPOSE_LABELS[latest.purposeType]}
                        </Badge>
                        <span className="flex items-center gap-1 text-slate-500">
                          {latest.deliveryMode === DELIVERY_MODE.COURIER ? (
                            <Truck className="h-3 w-3" />
                          ) : (
                            <Footprints className="h-3 w-3" />
                          )}
                          {DELIVERY_MODE_LABELS[latest.deliveryMode]}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin className="h-3 w-3 shrink-0 text-teal-600" />
                        <span className="max-w-[7rem] truncate">
                          {latest.fromAddressLabel}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="max-w-[7rem] truncate">
                          {latest.toAddressLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500">
                        {latest.trackingId && (
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                            {latest.courierPartner} · {latest.trackingId}
                          </code>
                        )}
                        {latest.sentAt && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            Sent {format(new Date(latest.sentAt), "MMM d, yyyy")}
                          </span>
                        )}
                        {latest.receivedAt && (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            Received{" "}
                            {format(new Date(latest.receivedAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3 align-top">
                    {currentLocationHint ? (
                      <div className="flex items-start gap-1.5 text-xs text-teal-800">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                        <span className="font-medium leading-snug">
                          {currentLocationHint}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-3 align-top">
                    <ShipmentStatusBadge status={latest.status} />
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right align-top">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-slate-600 hover:bg-slate-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        openCandidateCourier(candidateId);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">{rangeStart}</span>–
            <span className="font-semibold text-slate-700">{rangeEnd}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalCandidates}</span>{" "}
            candidates
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
            >
              Prev
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (
                  totalPages <= 7 ||
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
                ) {
                  return (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "ghost"}
                      size="sm"
                      onClick={() => onPageChange(p)}
                      className={cn(
                        "h-8 w-8 p-0 text-xs",
                        page === p
                          ? "bg-teal-600 shadow-sm hover:bg-teal-700"
                          : "text-slate-500 hover:bg-slate-100",
                      )}
                    >
                      {p}
                    </Button>
                  );
                }
                if (p === page - 2 || p === page + 2) {
                  return (
                    <span key={p} className="px-0.5 text-xs text-slate-300">
                      …
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
