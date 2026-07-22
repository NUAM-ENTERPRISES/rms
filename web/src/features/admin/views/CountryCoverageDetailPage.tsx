import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe2,
  History,
  Briefcase,
  HeartPulse,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/useDebounce";
import { FlagIcon, FlagWithName } from "@/shared";
import { useCan } from "@/hooks/useCan";
import { getRoleBadgeVariant } from "@/hooks/useSystemConfig";
import { cn } from "@/lib/utils";
import { ImageViewer } from "@/components/molecules";
import { UserAccountStatusBadge } from "../components/UserAccountStatusBadge";
import {
  useGetCountryCoverageUsersQuery,
  type CountryCoverageSector,
} from "../api/countryCoverageApi";
import { TransferCountryCoverageDialog } from "../components/TransferCountryCoverageDialog";
import { CountryCoverageTransferHistoryDialog } from "../components/CountryCoverageTransferHistoryDialog";

type SectorFilter = CountryCoverageSector | "ALL";
const PAGE_SIZE = 10;

const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

const TILE_ACCENTS = [
  { card: "from-teal-50 via-card to-cyan-50/40 border-teal-100", value: "text-teal-700", iconBg: "bg-teal-100", ring: "ring-teal-400/50" },
  { card: "from-indigo-50 via-card to-violet-50/40 border-indigo-100", value: "text-indigo-700", iconBg: "bg-indigo-100", ring: "ring-indigo-400/50" },
  { card: "from-emerald-50 via-card to-green-50/40 border-emerald-100", value: "text-emerald-700", iconBg: "bg-emerald-100", ring: "ring-emerald-400/50" },
  { card: "from-sky-50 via-card to-blue-50/40 border-sky-100", value: "text-sky-700", iconBg: "bg-sky-100", ring: "ring-sky-400/50" },
  { card: "from-amber-50 via-card to-orange-50/40 border-amber-100", value: "text-amber-700", iconBg: "bg-amber-100", ring: "ring-amber-400/50" },
  { card: "from-rose-50 via-card to-pink-50/40 border-rose-100", value: "text-rose-700", iconBg: "bg-rose-100", ring: "ring-rose-400/50" },
] as const;

export default function CountryCoverageDetailPage() {
  const navigate = useNavigate();
  const { countryCode = "" } = useParams<{ countryCode: string }>();
  const canRead = useCan("read:country_coverage");
  const canReadUsers = useCan("read:users");
  const canManageUsers = useCan("manage:users");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<SectorFilter>("ALL");
  const [page, setPage] = useState(1);
  const [coveredCountryFilter, setCoveredCountryFilter] = useState<string>("");
  const [transferTarget, setTransferTarget] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const normalizedCode = countryCode.toUpperCase();
  const isGccGroup = normalizedCode === "GCC";

  const queryArgs = useMemo(
    () => ({
      countryCode: normalizedCode,
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sector: sector === "ALL" ? undefined : sector,
      coveredCountry:
        isGccGroup && coveredCountryFilter
          ? coveredCountryFilter
          : undefined,
    }),
    [
      normalizedCode,
      page,
      debouncedSearch,
      sector,
      isGccGroup,
      coveredCountryFilter,
    ],
  );

  const { data, isLoading, isFetching, isError } =
    useGetCountryCoverageUsersQuery(queryArgs, {
      skip: !canRead || !countryCode,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    });

  const country = data?.data?.country;
  const users = data?.data?.users ?? [];
  const pagination = data?.data?.pagination;
  const countryBreakdown = data?.data?.countryBreakdown ?? [];
  const uniqueUserCount = data?.data?.uniqueUserCount ?? pagination?.total ?? 0;
  const summary = data?.data?.summary;
  const isAllGccActive = isGccGroup && !coveredCountryFilter;
  const displayName = country?.name ?? normalizedCode;
  const displayCode = country?.code ?? normalizedCode;

  const applySectorFilter = (next: SectorFilter) => {
    setSector(next);
    setPage(1);
  };

  if (!canRead) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        You do not have permission to view country coverage.
      </div>
    );
  }

  const showingFrom =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.limit + 1
      : 0;
  const showingTo =
    pagination && pagination.total > 0
      ? Math.min(pagination.page * pagination.limit, pagination.total)
      : 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit -ml-2" asChild>
          <Link to="/admin/country-coverage">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            Back to Country Coverage
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            {isGccGroup ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 shadow-xl shadow-teal-200">
                <Globe2 className="h-8 w-8 text-white" aria-hidden />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-3 shadow-lg shadow-slate-200/60 overflow-hidden">
                <FlagIcon countryCode={displayCode} size="xl" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
                {displayName}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isGccGroup ? (
                  "Unique users covering any GCC country"
                ) : (
                  <span className="inline-flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold tracking-wide rounded-md border border-border bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {displayCode}
                    </span>
                    <span>Users covering this country</span>
                  </span>
                )}
                {pagination != null && (
                  <>
                    {" "}
                    · {pagination.total}{" "}
                    {pagination.total === 1 ? "user" : "users"}
                    {isGccGroup ? " (no duplicates)" : ""}
                    {sector !== "ALL"
                      ? ` · ${
                          sector === "HEALTHCARE"
                            ? "Healthcare"
                            : "Non-healthcare"
                        } filter`
                      : ""}
                  </>
                )}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-2 self-start"
            onClick={() => setHistoryOpen(true)}
            aria-label={`View coverage transfer history for ${displayCode}`}
          >
            <History className="h-4 w-4" aria-hidden />
            History
          </Button>
        </div>
      </div>

      {!isGccGroup && summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => applySectorFilter("ALL")}
            aria-pressed={sector === "ALL"}
            className={cn(
              "group relative text-left rounded-2xl border bg-gradient-to-br from-indigo-50 via-card to-violet-50/40 border-indigo-100 p-4 shadow-sm transition-all duration-200 focus:outline-none",
              sector === "ALL"
                ? "ring-2 shadow-md ring-indigo-400/50"
                : "hover:-translate-y-0.5 hover:shadow-md",
            )}
            aria-label="Show all users covering this country"
          >
            {sector === "ALL" && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  All users
                </p>
                <p className="text-3xl font-bold tabular-nums text-indigo-700">
                  {summary.userCount}
                </p>
                <p className="text-xs text-muted-foreground">Covering {displayName}</p>
              </div>
              <div className="shrink-0 rounded-xl p-2.5 shadow-sm border border-white/60 bg-indigo-100">
                <Users className="h-5 w-5 text-indigo-700" aria-hidden />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-muted-foreground transition-colors">
              <span>{sector === "ALL" ? "Viewing all" : "Show all"}</span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => applySectorFilter("HEALTHCARE")}
            aria-pressed={sector === "HEALTHCARE"}
            className={cn(
              "group relative text-left rounded-2xl border bg-gradient-to-br from-emerald-50 via-card to-green-50/40 border-emerald-100 p-4 shadow-sm transition-all duration-200 focus:outline-none",
              sector === "HEALTHCARE"
                ? "ring-2 shadow-md ring-emerald-400/50"
                : "hover:-translate-y-0.5 hover:shadow-md",
            )}
            aria-label="Filter healthcare users"
          >
            {sector === "HEALTHCARE" && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Healthcare
                </p>
                <p className="text-3xl font-bold tabular-nums text-emerald-700">
                  {summary.healthcareCount}
                </p>
                <p className="text-xs text-muted-foreground">Sector coverage</p>
              </div>
              <div className="shrink-0 rounded-xl p-2.5 shadow-sm border border-white/60 bg-emerald-100">
                <HeartPulse className="h-5 w-5 text-emerald-700" aria-hidden />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-muted-foreground transition-colors">
              <span>
                {sector === "HEALTHCARE" ? "Filtering now" : "Click to filter"}
              </span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => applySectorFilter("NON_HEALTH_CARE")}
            aria-pressed={sector === "NON_HEALTH_CARE"}
            className={cn(
              "group relative text-left rounded-2xl border bg-gradient-to-br from-sky-50 via-card to-blue-50/40 border-sky-100 p-4 shadow-sm transition-all duration-200 focus:outline-none",
              sector === "NON_HEALTH_CARE"
                ? "ring-2 shadow-md ring-sky-400/50"
                : "hover:-translate-y-0.5 hover:shadow-md",
            )}
            aria-label="Filter non-healthcare users"
          >
            {sector === "NON_HEALTH_CARE" && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Non-healthcare
                </p>
                <p className="text-3xl font-bold tabular-nums text-sky-700">
                  {summary.nonHealthcareCount}
                </p>
                <p className="text-xs text-muted-foreground">Sector coverage</p>
              </div>
              <div className="shrink-0 rounded-xl p-2.5 shadow-sm border border-white/60 bg-sky-100">
                <Briefcase className="h-5 w-5 text-sky-700" aria-hidden />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-muted-foreground transition-colors">
              <span>
                {sector === "NON_HEALTH_CARE"
                  ? "Filtering now"
                  : "Click to filter"}
              </span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </button>
        </div>
      )}

      {isGccGroup && countryBreakdown.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <button
            type="button"
            onClick={() => {
              setCoveredCountryFilter("");
              setPage(1);
            }}
            aria-pressed={isAllGccActive}
            className={cn(
              "group relative text-left rounded-2xl border bg-gradient-to-br from-teal-50 via-card to-cyan-50/40 border-teal-100 p-4 shadow-sm transition-all duration-200 focus:outline-none",
              isAllGccActive
                ? "ring-2 shadow-md ring-teal-400/50"
                : "hover:-translate-y-0.5 hover:shadow-md",
            )}
            aria-label="Show all GCC users"
          >
            {isAllGccActive && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  All GCC
                </p>
                <p className="text-3xl font-bold tabular-nums text-teal-700">
                  {uniqueUserCount}
                </p>
                <p className="text-xs text-muted-foreground">Unique users</p>
              </div>
              <div className="shrink-0 rounded-xl p-2.5 shadow-sm border border-white/60 bg-teal-100">
                <Globe2 className="h-5 w-5 text-teal-700" aria-hidden />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-muted-foreground transition-colors">
              <span>{isAllGccActive ? "Viewing all" : "Show all"}</span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </button>

          {countryBreakdown.map((item, i) => {
            const accent = TILE_ACCENTS[i % TILE_ACCENTS.length];
            const isActive = coveredCountryFilter === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setCoveredCountryFilter(item.code);
                  setPage(1);
                }}
                aria-pressed={isActive}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all duration-200 focus:outline-none",
                  accent.card,
                  isActive
                    ? `ring-2 shadow-md ${accent.ring}`
                    : "hover:-translate-y-0.5 hover:shadow-md",
                )}
                aria-label={`Filter users covering ${item.name}`}
              >
                {isActive && (
                  <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                      {item.name}
                    </p>
                    <p
                      className={cn(
                        "text-3xl font-bold tabular-nums",
                        accent.value,
                      )}
                    >
                      {item.userCount}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 rounded-xl p-2 shadow-sm border border-white/60 overflow-hidden",
                      accent.iconBg,
                    )}
                  >
                    <FlagIcon countryCode={item.code} size="lg" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-muted-foreground transition-colors">
                  <span>{isActive ? "Filtering now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="pl-9 h-11 rounded-xl"
          aria-label="Search users"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {isGccGroup && coveredCountryFilter ? (
              <div className="shrink-0 rounded-xl bg-card border border-border p-2 shadow-sm overflow-hidden">
                <FlagIcon countryCode={coveredCountryFilter} size="xl" />
              </div>
            ) : !isGccGroup ? (
              <div className="shrink-0 rounded-xl bg-card border border-border p-2 shadow-sm overflow-hidden">
                <FlagIcon countryCode={displayCode} size="xl" />
              </div>
            ) : (
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 p-2.5 shadow-md">
                <Users className="h-5 w-5 text-white" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground truncate flex items-center gap-2">
                {isGccGroup ? (
                  coveredCountryFilter ? (
                    <>
                      <span>
                        {countryBreakdown.find(
                          (c) => c.code === coveredCountryFilter,
                        )?.name ?? coveredCountryFilter}
                      </span>
                      <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted border border-border rounded-md px-1.5 py-0.5">
                        {coveredCountryFilter}
                      </span>
                    </>
                  ) : (
                    "GCC Coverage Users"
                  )
                ) : (
                  <>
                    <FlagWithName
                      countryCode={displayCode}
                      countryName={displayName}
                      showCode
                      size="sm"
                      className="min-w-0"
                    />
                    <span className="text-slate-400 font-normal">·</span>
                    <span>
                      {sector === "HEALTHCARE"
                        ? "Healthcare"
                        : sector === "NON_HEALTH_CARE"
                          ? "Non-healthcare"
                          : "All"}{" "}
                      users
                    </span>
                  </>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {`${pagination?.total ?? 0} user${
                  (pagination?.total ?? 0) !== 1 ? "s" : ""
                } found`}
              </p>
            </div>
          </div>
        </div>

        {isLoading && !data ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky">
                <TableRow className="bg-muted/80 border-b border-border hover:bg-muted/80">
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Name
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-4 py-3">
                      <div className="h-10 bg-muted rounded" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isError && !data ? (
          <div className="h-64 flex items-center justify-center text-destructive text-sm">
            Failed to load users for this country.
          </div>
        ) : users.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Users className="h-8 w-8 text-slate-300" aria-hidden />
            <p className="text-sm">
              No active users cover this country with the current filters.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`overflow-x-auto ${isFetching ? "opacity-70 transition-opacity" : ""}`}
              aria-busy={isFetching}
            >
              <Table>
                <TableHeader className="sticky">
                  <TableRow className="bg-muted/80 border-b border-border hover:bg-muted/80">
                    <TableHead className="h-10 min-w-[14rem] px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      User
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Contact
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Roles
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Status
                    </TableHead>
                    {isGccGroup && (
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        GCC Countries
                      </TableHead>
                    )}
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Sectors
                    </TableHead>
                    <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-b border-border hover:bg-muted/60 transition-colors"
                    >
                      <TableCell className="min-w-[14rem] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ImageViewer
                            title={user.name}
                            src={user.profileImage || null}
                            fallbackSrc={DEFAULT_PROFILE_IMAGE}
                            className="h-10 w-10 shrink-0 rounded-full border border-border shadow-sm"
                            ariaLabel={`View profile image for ${user.name}`}
                            enableHoverPreview
                            hoverPosition="right"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {user.name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex max-w-[240px] items-center gap-1.5 text-sm text-foreground">
                            <Mail
                              className="h-3.5 w-3.5 shrink-0 text-slate-400"
                              aria-hidden
                            />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.mobileNumber ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden
                              />
                              <span>
                                {[user.phoneCountryCode, user.mobileNumber]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              No phone
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <UserAccountStatusBadge status={user.accountStatus} />
                      </TableCell>
                      {isGccGroup && (
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(user.coveredCountryCodes ?? []).map((code) => (
                              <span
                                key={code}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                              >
                                <FlagIcon countryCode={code} size="sm" />
                                {code}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.sectorScopes.includes("HEALTHCARE") && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              Healthcare
                            </Badge>
                          )}
                          {user.sectorScopes.includes("NON_HEALTH_CARE") && (
                            <Badge
                              variant="outline"
                              className="bg-sky-50 text-sky-700 border-sky-200"
                            >
                              Non-healthcare
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {canReadUsers || canManageUsers ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted"
                                aria-label={`Actions for ${user.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 border-0 shadow-xl"
                            >
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {canReadUsers && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/admin/users/${user.id}`)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                              )}
                              {canManageUsers && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setTransferTarget({
                                      userId: user.id,
                                      userName: user.name,
                                    })
                                  }
                                >
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />{" "}
                                  Transfer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.total > pagination.limit && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {showingFrom}
                  </span>
                  –
                  <span className="font-semibold text-foreground">
                    {showingTo}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">
                    {pagination.total}
                  </span>
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                    aria-label="Next page"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {transferTarget && (
        <TransferCountryCoverageDialog
          open={Boolean(transferTarget)}
          onOpenChange={(open) => {
            if (!open) setTransferTarget(null);
          }}
          sourceCountryCode={normalizedCode}
          userId={transferTarget.userId}
          userName={transferTarget.userName}
        />
      )}

      <CountryCoverageTransferHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        countryCode={normalizedCode}
        countryName={displayName}
      />
    </div>
  );
}
