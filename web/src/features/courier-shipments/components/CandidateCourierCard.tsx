import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Footprints,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DELIVERY_MODE, SHIPMENT_STATUS } from "../constants";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";
import type { CourierShipment, CourierShipmentCandidate } from "../types";

export interface CandidateCourierGroup {
  candidate: CourierShipmentCandidate;
  candidateId: string;
  legCount: number;
  latestLeg: CourierShipment;
  inTransitCount: number;
  receivedCount: number;
  draftCount: number;
  currentLocationHint: string | null;
}

interface CandidateCourierCardProps {
  group: CandidateCourierGroup;
}

function candidateInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function CandidateCourierCard({ group }: CandidateCourierCardProps) {
  const { candidate, candidateId, legCount, latestLeg, inTransitCount, receivedCount, draftCount, currentLocationHint } = group;

  const hasActivity = inTransitCount > 0 || receivedCount > 0;
  const allReceived = legCount > 0 && receivedCount === legCount;
  const hasPending = inTransitCount > 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        hasPending && "border-amber-200/70",
        allReceived && "border-emerald-200/70",
      )}
    >
      {/* Color strip at top */}
      <div
        className={cn(
          "h-1 w-full",
          hasPending
            ? "bg-gradient-to-r from-amber-400 to-amber-300"
            : allReceived
              ? "bg-gradient-to-r from-emerald-400 to-teal-300"
              : "bg-gradient-to-r from-slate-300 to-slate-200",
        )}
      />

      <div className="flex flex-col gap-4 p-5">
        {/* Candidate header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={candidate.profileImage ?? undefined} />
            <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-teal-100 to-indigo-100 text-teal-800">
              {candidateInitials(candidate.firstName, candidate.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight">
              {candidate.firstName} {candidate.lastName}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {candidate.candidateCode ?? "—"}
              {candidate.lockerFileNumber && (
                <span className="ml-1.5 text-slate-500">
                  · Locker {candidate.lockerFileNumber}
                </span>
              )}
            </p>
          </div>

          <div className="shrink-0">
            <Badge
              variant="outline"
              className="gap-1 text-xs font-medium border-slate-200 text-slate-700"
            >
              <Package className="h-3 w-3" />
              {legCount} leg{legCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {/* Current location */}
        {currentLocationHint && (
          <div className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs text-teal-800">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600" />
            <span className="font-medium">Currently at:</span>
            <span className="truncate">{currentLocationHint}</span>
          </div>
        )}

        {/* Latest leg section */}
        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Latest — Leg {latestLeg.legNumber}
            </p>
            <ShipmentStatusBadge status={latestLeg.status} className="text-[10px]" />
          </div>

          <div className="flex items-start gap-1.5 text-xs font-medium">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
            <span className="min-w-0 truncate">{latestLeg.fromAddressLabel}</span>
            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{latestLeg.toAddressLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {latestLeg.deliveryMode === DELIVERY_MODE.COURIER ? (
                <Truck className="h-3 w-3" />
              ) : (
                <Footprints className="h-3 w-3" />
              )}
              {latestLeg.deliveryMode === DELIVERY_MODE.COURIER ? "Courier" : "Direct"}
              {latestLeg.courierPartner && ` · ${latestLeg.courierPartner}`}
            </span>
            {latestLeg.sentAt && (
              <span>
                {format(new Date(latestLeg.sentAt), "MMM d, yyyy")}
              </span>
            )}
            {latestLeg.status === SHIPMENT_STATUS.RECEIVED && latestLeg.receivedAt && (
              <span className="text-emerald-700">
                Received {format(new Date(latestLeg.receivedAt), "MMM d")}
              </span>
            )}
          </div>
        </div>

        {/* Mini stats row */}
        {hasActivity && (
          <div className="flex items-center gap-3 text-xs">
            {receivedCount > 0 && (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {receivedCount} received
              </span>
            )}
            {inTransitCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                {inTransitCount} in transit
              </span>
            )}
            {draftCount > 0 && (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Package className="h-3.5 w-3.5" />
                {draftCount} draft
              </span>
            )}
          </div>
        )}

        {/* Footer action */}
        <div className="flex items-center justify-end pt-1 border-t">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
          >
            <Link to={`/courier-management/candidates/${candidateId}`}>
              View pipeline
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
