import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpRight,
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
import { useDebounce } from "@/hooks/useDebounce";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import {
  useGetCourierCandidateGroupsQuery,
  useGetCourierShipmentStatsQuery,
} from "../api";
import { CourierExportButton } from "../components/CourierExportButton";
import { CandidatesCourierView } from "./CandidatesCourierView";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
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

export default function CourierRegisterPage() {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  useAppSelector((state) => state.auth);
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
    <div className="w-full space-y-6">
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

        <div className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statTiles.map((stat, i) => {
            const isActive = activeTile === stat.id;
            return (
              <motion.div
                key={stat.id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <DashboardStatTile
                  accent={stat.accent}
                  label={stat.label}
                  value={stat.value}
                  subtitle={stat.subtitle}
                  icon={stat.icon}
                  active={isActive}
                  interactive
                  footerText={isActive ? "Viewing now" : "Click to filter"}
                  onClick={() => handleTileClick(stat.id, stat.filter)}
                />
              </motion.div>
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
  );
}
