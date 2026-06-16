import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FilterX,
  Footprints,
  Plus,
  Search,
  // Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import {
  useGetCourierCandidateGroupsQuery,
  useGetCourierShipmentStatsQuery,
} from "../api";
import { CourierExportButton } from "../components/CourierExportButton";
import { CandidatesCourierView } from "./CandidatesCourierView";
import { DELIVERY_MODE, SHIPMENT_STATUS } from "../constants";

type StatusFilter =
  | "all"
  | "in_transit"
  | "received"
  | "courier"
  | "direct"
  | "return";

type TileId =
  | "total_candidates"
  | "in_transit"
  | "received"
  | "courier"
  | "direct"
  | "return";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  in_transit: "In Transit",
  received: "Received",
  courier: "Courier",
  direct: "Direct Handover",
  return: "Return Purpose",
};

const accentStyles: Record<
  string,
  { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }
> = {
  blue: {
    card: "from-blue-50 via-white to-blue-50/30 border-blue-100",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    value: "text-blue-700",
    ring: "ring-blue-400/50",
    dot: "bg-blue-500",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    value: "text-emerald-700",
    ring: "ring-emerald-400/50",
    dot: "bg-emerald-500",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    value: "text-amber-700",
    ring: "ring-amber-400/50",
    dot: "bg-amber-500",
  },
  indigo: {
    card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100",
    icon: "text-indigo-600",
    iconBg: "bg-indigo-100",
    value: "text-indigo-700",
    ring: "ring-indigo-400/50",
    dot: "bg-indigo-500",
  },
  violet: {
    card: "from-violet-50 via-white to-violet-50/30 border-violet-100",
    icon: "text-violet-600",
    iconBg: "bg-violet-100",
    value: "text-violet-700",
    ring: "ring-violet-400/50",
    dot: "bg-violet-500",
  },
  teal: {
    card: "from-teal-50 via-white to-teal-50/30 border-teal-100",
    icon: "text-teal-600",
    iconBg: "bg-teal-100",
    value: "text-teal-700",
    ring: "ring-teal-400/50",
    dot: "bg-teal-500",
  },
};

export default function CourierRegisterPage() {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const { user } = useAppSelector((state) => state.auth);
  const canWrite = useCan("write:courier_management");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTile, setActiveTile] = useState<TileId>("total_candidates");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const filters = {
    search: debouncedSearch || undefined,
    status:
      statusFilter === "in_transit"
        ? SHIPMENT_STATUS.IN_TRANSIT
        : statusFilter === "received"
          ? SHIPMENT_STATUS.RECEIVED
          : undefined,
    deliveryMode:
      statusFilter === "courier"
        ? DELIVERY_MODE.COURIER
        : statusFilter === "direct"
          ? DELIVERY_MODE.DIRECT
          : undefined,
    purposeType: statusFilter === "return" ? "return" : undefined,
    page,
    limit: 10,
  };

  const { data: statsResponse } = useGetCourierShipmentStatsQuery();
  const { data, isLoading, isFetching } =
    useGetCourierCandidateGroupsQuery(filters);

  const stats = statsResponse?.data ?? {
    totalCandidates: 0,
    totalLegs: 0,
    candidatesInTransit: 0,
    candidatesReceived: 0,
    candidatesCourier: 0,
    candidatesDirect: 0,
    candidatesReturn: 0,
  };

  const groups = data?.data?.groups ?? [];
  const pagination = data?.data?.pagination ?? {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  };

  const statTiles: Array<{
    id: TileId;
    label: string;
    value: number;
    icon: typeof Users;
    accent: string;
    subtitle: string;
    filter: StatusFilter;
  }> = [
    {
      id: "total_candidates",
      label: "Total Candidates",
      value: stats.totalCandidates,
      icon: Users,
      accent: "blue",
      subtitle: "Unique candidates in courier",
      filter: "all",
    },
    {
      id: "in_transit",
      label: "In Transit",
      value: stats.candidatesInTransit,
      icon: Clock,
      accent: "amber",
      subtitle: "Candidates with legs in transit",
      filter: "in_transit",
    },
    {
      id: "received",
      label: "Received",
      value: stats.candidatesReceived,
      icon: CheckCircle2,
      accent: "emerald",
      subtitle: "Candidates with received legs",
      filter: "received",
    },
    // Courier tile — not needed for now
    // {
    //   id: "courier",
    //   label: "Courier",
    //   value: stats.candidatesCourier,
    //   icon: Truck,
    //   accent: "teal",
    //   subtitle: "Candidates via courier partner",
    //   filter: "courier",
    // },
    {
      id: "direct",
      label: "Direct Handover",
      value: stats.candidatesDirect,
      icon: Footprints,
      accent: "violet",
      subtitle: "Candidates with direct handover",
      filter: "direct",
    },
    {
      id: "return",
      label: "Return Purpose",
      value: stats.candidatesReturn,
      icon: ArrowRight,
      accent: "indigo",
      subtitle: "Candidates with return legs",
      filter: "return",
    },
  ];

  const handleTileClick = (tileId: TileId, filter: StatusFilter) => {
    setActiveTile(tileId);
    setStatusFilter(filter);
    setPage(1);
    listRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const hasActiveFilters =
    search.trim().length > 0 || activeTile !== "total_candidates";

  return (
    <div className="min-h-screen">
      <div className="mx-auto mt-2 max-w-7xl w-full space-y-6 px-6">
        <DashboardWelcomeHeader
          userName={user?.name ?? "Documents Control Executive"}
          subtitle="Track document movements across offices and clients"
        />

        <div className="sticky top-0 z-10 overflow-hidden rounded-2xl border border-border bg-background/80 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
            <div className="group relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidate, tracking, locker..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl pl-10"
                aria-label="Search courier candidates"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setActiveTile("total_candidates");
                    setPage(1);
                  }}
                  className="h-11 gap-2"
                >
                  <FilterX className="h-4 w-4" />
                  Reset
                </Button>
              )}
              <CourierExportButton filters={filters} />
              {canWrite && (
                <Button
                  onClick={() => navigate("/courier-management/new")}
                  className="h-11 gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow-sm hover:from-teal-700 hover:to-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  New Courier Leg
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5">
          {statTiles.map((stat, i) => {
            const Icon = stat.icon;
            const s = accentStyles[stat.accent];
            const isActive = activeTile === stat.id;
            return (
              <motion.button
                key={stat.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleTileClick(stat.id, stat.filter)}
                className={cn(
                  "group relative rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition-all",
                  s.card,
                  isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md",
                )}
              >
                {isActive && (
                  <span className={cn("absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className={cn("text-2xl font-bold tabular-nums", s.value)}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={cn("rounded-lg p-2", s.iconBg)}>
                    <Icon className={cn("h-4 w-4", s.icon)} />
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{stat.subtitle}</p>
              </motion.button>
            );
          })}
        </div>

        <div ref={listRef}>
          <CandidatesCourierView
            groups={groups}
            activeFilterLabel={FILTER_LABELS[statusFilter]}
            isLoading={isLoading}
            isFetching={isFetching}
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCandidates={pagination.total}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
