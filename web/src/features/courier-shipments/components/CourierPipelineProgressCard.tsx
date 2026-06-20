import {
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Package,
  Route,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SHIPMENT_STATUS } from "../constants";
import type { CourierShipment } from "../types";

interface CourierPipelineProgressCardProps {
  legs: CourierShipment[];
  receivedLegs: number;
  totalLegs: number;
  currentLocationHint?: string | null;
  highlightLegId?: string | null;
  className?: string;
}

function CircularProgressRing({
  value,
  size = 96,
  strokeWidth = 7,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const isComplete = value >= 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-500",
            isComplete ? "text-emerald-300" : "text-white",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none text-white">
          {value}%
        </span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-teal-100/80">
          complete
        </span>
      </div>
    </div>
  );
}

function legTimelineDotClass(status: string) {
  if (status === SHIPMENT_STATUS.RECEIVED) {
    return "border-emerald-500 bg-emerald-500 text-white";
  }
  if (status === SHIPMENT_STATUS.IN_TRANSIT) {
    return "border-amber-500 bg-amber-500 text-white";
  }
  return "border-slate-300 bg-background text-slate-400";
}

function legTimelineLineClass(status: string) {
  if (status === SHIPMENT_STATUS.RECEIVED) {
    return "bg-emerald-300";
  }
  if (status === SHIPMENT_STATUS.IN_TRANSIT) {
    return "bg-amber-200";
  }
  return "bg-border";
}

function scrollToLeg(legId: string) {
  document
    .getElementById(`courier-leg-${legId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function CourierPipelineProgressCard({
  legs,
  receivedLegs,
  totalLegs,
  currentLocationHint,
  highlightLegId,
  className,
}: CourierPipelineProgressCardProps) {
  const progress =
    totalLegs > 0 ? Math.round((receivedLegs / totalLegs) * 100) : 0;
  const isComplete = totalLegs > 0 && progress >= 100;

  const draftLegs = legs.filter(
    (leg) => leg.status === SHIPMENT_STATUS.DRAFT,
  ).length;
  const inTransitLegs = legs.filter(
    (leg) => leg.status === SHIPMENT_STATUS.IN_TRANSIT,
  ).length;

  const timelineLegs = [...legs].sort((a, b) => a.legNumber - b.legNumber);

  const statTiles = [
    {
      key: "received",
      label: "Received",
      value: receivedLegs,
      icon: CheckCircle2,
      className: "border-emerald-200/80 bg-emerald-50/80 text-emerald-700",
      iconClassName: "text-emerald-600",
    },
    {
      key: "in-transit",
      label: "In transit",
      value: inTransitLegs,
      icon: Clock,
      className: "border-amber-200/80 bg-amber-50/80 text-amber-700",
      iconClassName: "text-amber-600",
    },
    {
      key: "draft",
      label: "Draft",
      value: draftLegs,
      icon: Circle,
      className: "border-slate-200/80 bg-slate-50/80 text-slate-600",
      iconClassName: "text-slate-500",
    },
  ];

  return (
    <Card
      className={cn(
        "overflow-hidden border-teal-100 shadow-md",
        className,
      )}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 px-4 py-4">
        <span
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-4">
          <CircularProgressRing value={progress} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 shrink-0 text-teal-100" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-50">
                Pipeline progress
              </p>
            </div>
            <p className="text-sm font-medium text-white/90">
              <span className="text-lg font-bold text-white">
                {receivedLegs}
              </span>
              <span className="text-white/70"> / {totalLegs} legs received</span>
            </p>
            {isComplete ? (
              <Badge className="gap-1 border-emerald-300/30 bg-emerald-500/20 text-[10px] text-emerald-50 hover:bg-emerald-500/20">
                <Sparkles className="h-3 w-3" aria-hidden />
                Journey complete
              </Badge>
            ) : inTransitLegs > 0 ? (
              <Badge className="gap-1 border-amber-300/30 bg-amber-500/20 text-[10px] text-amber-50 hover:bg-amber-500/20">
                <Package className="h-3 w-3" aria-hidden />
                {inTransitLegs} leg{inTransitLegs !== 1 ? "s" : ""} on the way
              </Badge>
            ) : (
              <Badge className="border-white/20 bg-white/10 text-[10px] text-white hover:bg-white/10">
                Awaiting next movement
              </Badge>
            )}
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          {statTiles.map((tile) => (
            <div
              key={tile.key}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-center",
                tile.className,
              )}
            >
              <tile.icon
                className={cn("mx-auto mb-1 h-3.5 w-3.5", tile.iconClassName)}
                aria-hidden
              />
              <p className="text-lg font-bold leading-none">{tile.value}</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide opacity-80">
                {tile.label}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Overall completion
            </p>
            <span className="text-xs font-medium text-foreground">
              {progress}%
            </span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-teal-500 [&>div]:to-emerald-500"
          />
        </div>

        {timelineLegs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Leg journey
            </p>
            <ol className="space-y-0">
              {timelineLegs.map((leg, index) => {
                const isHighlighted = highlightLegId === leg.id;
                const isLast = index === timelineLegs.length - 1;

                return (
                  <li key={leg.id} className="relative flex gap-3">
                    {!isLast && (
                      <span
                        className={cn(
                          "absolute left-[11px] top-6 h-[calc(100%-4px)] w-0.5",
                          legTimelineLineClass(leg.status),
                        )}
                        aria-hidden
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => scrollToLeg(leg.id)}
                      className={cn(
                        "group flex min-w-0 flex-1 items-start gap-3 rounded-lg border border-transparent px-1 py-1.5 text-left transition-colors hover:border-teal-100 hover:bg-teal-50/50",
                        isHighlighted && "border-teal-200 bg-teal-50/70",
                      )}
                      aria-label={`Go to leg ${leg.legNumber}: ${leg.fromAddressLabel} to ${leg.toAddressLabel}`}
                    >
                      <span
                        className={cn(
                          "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                          legTimelineDotClass(leg.status),
                        )}
                      >
                        {leg.legNumber}
                      </span>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">
                            Leg {leg.legNumber}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 text-[9px] font-semibold uppercase tracking-wide",
                              leg.status === SHIPMENT_STATUS.RECEIVED &&
                                "text-emerald-600",
                              leg.status === SHIPMENT_STATUS.IN_TRANSIT &&
                                "text-amber-600",
                              leg.status === SHIPMENT_STATUS.DRAFT &&
                                "text-muted-foreground",
                            )}
                          >
                            {leg.status === SHIPMENT_STATUS.RECEIVED
                              ? "Done"
                              : leg.status === SHIPMENT_STATUS.IN_TRANSIT
                                ? "Active"
                                : "Draft"}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground group-hover:text-foreground/80">
                          {leg.fromAddressLabel}
                          <span className="mx-1 text-muted-foreground/60">→</span>
                          {leg.toAddressLabel}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div
          className={cn(
            "rounded-xl border p-3",
            currentLocationHint
              ? "border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-emerald-50/40"
              : "border-dashed border-border/70 bg-muted/10",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                currentLocationHint
                  ? "bg-teal-100 text-teal-700"
                  : "bg-muted text-muted-foreground/50",
              )}
            >
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Current location
              </p>
              {currentLocationHint ? (
                <p className="mt-0.5 text-sm font-semibold text-teal-950">
                  {currentLocationHint}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No active location yet
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
