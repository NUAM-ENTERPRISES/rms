import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  History,
  Instagram,
  LayoutGrid,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { useCan } from "@/hooks/useCan";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetMetaLeadsHistoryQuery,
  type MetaLeadPlatformFilter,
  type MetaLeadStatus,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";

const PLATFORM_FILTERS: Array<{
  id: MetaLeadPlatformFilter;
  label: string;
  subtitle: string;
  icon: typeof LayoutGrid;
  accent: string;
}> = [
  {
    id: "all",
    label: "Total Leads",
    subtitle: "All inbound Meta leads",
    icon: LayoutGrid,
    accent: "indigo",
  },
  {
    id: "meta",
    label: "Meta Leads",
    subtitle: "Lead Ads form submissions",
    icon: Share2,
    accent: "violet",
  },
  {
    id: "instagram",
    label: "Instagram Leads",
    subtitle: "Instagram messaging",
    icon: Instagram,
    accent: "fuchsia",
  },
  {
    id: "messenger",
    label: "Messenger Leads",
    subtitle: "Facebook Messenger",
    icon: Facebook,
    accent: "sky",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Leads",
    subtitle: "WhatsApp messaging",
    icon: MessageCircle,
    accent: "emerald",
  },
];

const STATUS_BADGE_CLASS: Record<MetaLeadStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-800 dark:!border-border dark:!bg-muted/30 dark:text-amber-300",
  linked:
    "border-success-200 bg-success-50 text-success-700 dark:!border-border dark:!bg-muted/30 dark:text-success-300",
  skipped: "border-border bg-muted text-muted-foreground",
  fraud:
    "border-danger-200 bg-danger-50 text-danger-700 dark:!border-border dark:!bg-muted/30 dark:text-danger-300",
  review:
    "border-accent-200 bg-accent-50 text-accent-700 dark:!border-border dark:!bg-muted/30 dark:text-accent-300",
  processed:
    "border-primary-200 bg-primary-50 text-primary-700 dark:!border-border dark:!bg-muted/30 dark:text-primary-300",
};

const PAGE_SIZE = 20;

function formatPhone(
  countryCode: string | null,
  phoneNumber: string | null,
): string {
  if (!phoneNumber) return "—";
  return countryCode ? `${countryCode} ${phoneNumber}` : phoneNumber;
}

function formatPlatformLabel(platform: string | null): string {
  if (!platform) return "Meta";
  const normalized = platform.toLowerCase();
  if (normalized === "facebook") return "Messenger";
  if (normalized === "meta") return "Meta";
  return platform;
}

export default function MetaLeadsHistoryPage() {
  const canRead = useCan("read:system_config");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<MetaLeadPlatformFilter>("all");
  const debouncedSearch = useDebounce(search, 400);

  const queryArgs = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      platform,
    }),
    [page, debouncedSearch, platform],
  );

  const { data, isLoading, isFetching, refetch, isError } =
    useGetMetaLeadsHistoryQuery(queryArgs, { skip: !canRead });

  const items = data?.data?.items ?? [];
  const pagination = data?.data?.pagination;
  const platformCounts = data?.data?.platformCounts ?? {
    total: 0,
    meta: 0,
    instagram: 0,
    messenger: 0,
    whatsapp: 0,
  };
  const isTileCountsLoading = isLoading && !data?.data;
  const hasActiveFilters =
    debouncedSearch.trim().length > 0 || platform !== "all";

  const getTileValue = (filterId: MetaLeadPlatformFilter): number | "—" => {
    if (isTileCountsLoading) return "—";
    switch (filterId) {
      case "all":
        return platformCounts.total;
      case "meta":
        return platformCounts.meta;
      case "instagram":
        return platformCounts.instagram;
      case "messenger":
        return platformCounts.messenger;
      case "whatsapp":
        return platformCounts.whatsapp;
      default:
        return "—";
    }
  };

  if (!canRead) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center p-6"
        role="alert"
      >
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <History
            className="mx-auto mb-4 h-10 w-10 text-danger-600"
            aria-hidden
          />
          <h1 className="text-xl font-semibold text-foreground">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don&apos;t have permission to view Meta Lead history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 dark:!bg-muted/40">
            <MessageCircle
              className="h-5 w-5 text-primary-600 dark:text-primary-400"
              aria-hidden
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Meta History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review inbound MetaLead records from WhatsApp, Instagram,
              Messenger, and Lead Ads.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-11 gap-2 self-start rounded-xl"
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </header>

      <div className="grid auto-rows-fr grid-cols-2 gap-4 lg:grid-cols-5">
        {PLATFORM_FILTERS.map((tile) => {
          const isActive = platform === tile.id;
          return (
            <DashboardStatTile
              key={tile.id}
              accent={tile.accent}
              label={tile.label}
              value={getTileValue(tile.id)}
              subtitle={tile.subtitle}
              icon={tile.icon}
              active={isActive}
              interactive
              footerText={isActive ? "Viewing now" : "Click to filter"}
              onClick={() => {
                setPlatform(tile.id);
                setPage(1);
              }}
            />
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-4">
          <div className="group relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary-600"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, phone, lead ID, short code…"
              className="h-11 rounded-xl border-border bg-muted/30 pl-10 focus:bg-card"
              aria-label="Search Meta leads"
            />
          </div>
        </div>
      </div>

      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-opacity",
          isFetching && !isLoading && "opacity-70",
        )}
      >
        <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary-600 p-2.5 shadow-md">
                <History className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Lead Directory
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pagination?.total ?? 0} lead
                  {(pagination?.total ?? 0) !== 1 ? "s" : ""} matching
                </p>
              </div>
            </div>
            {isFetching && (
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : isError ? (
            <div
              className="p-8 text-center text-sm text-danger-600"
              role="alert"
            >
              Failed to load Meta Lead history. Try refreshing.
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <History className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">No Meta leads found</p>
              <p className="max-w-xs text-center text-sm">
                {hasActiveFilters
                  ? "No leads match your filters. Try adjusting search or platform."
                  : "Wait for new inbound webhooks from Meta channels."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/80">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="h-10 px-4 pl-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Created
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="hidden h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Platform
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="hidden h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:table-cell">
                      Short code
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Candidate
                    </TableHead>
                    <TableHead className="hidden h-10 px-4 pr-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground xl:table-cell">
                      Note
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/60"
                    >
                      <TableCell className="px-4 py-3 pl-6 align-top">
                        <div className="text-sm font-semibold text-foreground">
                          {format(new Date(lead.createdAt), "dd MMM yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="font-semibold text-foreground">
                          {lead.displayName || "—"}
                        </div>
                        {lead.leadId && (
                          <div className="mt-0.5 max-w-[180px] truncate text-xs text-muted-foreground">
                            {lead.leadId}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground md:hidden">
                          {formatPhone(lead.countryCode, lead.phoneNumber)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden px-4 py-3 align-top md:table-cell">
                        <div className="text-sm text-foreground">
                          {formatPhone(lead.countryCode, lead.phoneNumber)}
                        </div>
                        <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {lead.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <Badge variant="outline" className="capitalize">
                          {formatPlatformLabel(lead.platform)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            STATUS_BADGE_CLASS[lead.status],
                          )}
                        >
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden px-4 py-3 align-top font-mono text-xs lg:table-cell">
                        {lead.shortCode || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        {lead.candidateId && lead.candidate ? (
                          <Link
                            to={`/candidates/${lead.candidateId}`}
                            className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                          >
                            {lead.candidate.candidateCode ||
                              [lead.candidate.firstName, lead.candidate.lastName]
                                .filter(Boolean)
                                .join(" ") ||
                              "View candidate"}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-[180px] px-4 py-3 pr-6 align-top xl:table-cell">
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {lead.processingNote || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && !isLoading && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/50 px-6 py-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(pagination.page - 1) * PAGE_SIZE + 1}
              </span>
              –
              <span className="font-semibold text-foreground">
                {Math.min(pagination.page * PAGE_SIZE, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {pagination.total}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-lg p-0"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-lg p-0"
                disabled={page >= pagination.totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
