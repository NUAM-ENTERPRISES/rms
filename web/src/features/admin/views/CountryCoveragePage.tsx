import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FilterX, Globe2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelect } from "@/components/molecules";
import { useCan } from "@/hooks/useCan";
import { CountryCoverageCard } from "../components/CountryCoverageCard";
import { GccCoverageCard } from "../components/GccCoverageCard";
import {
  COUNTRY_COVERAGE_PAGE_SIZE,
  useGetCountryCoverageSummaryQuery,
  type CountryCoverageSector,
} from "../api/countryCoverageApi";

type SectorFilter = CountryCoverageSector | "ALL";

const GCC_CODES = new Set(["SA", "AE", "QA", "OM", "BH", "KW"]);

export default function CountryCoveragePage() {
  const canRead = useCan("read:country_coverage");
  const [countryCode, setCountryCode] = useState("");
  const [sector, setSector] = useState<SectorFilter>("ALL");
  const [page, setPage] = useState(1);

  const queryArgs = useMemo(
    () => ({
      countryCode: countryCode || undefined,
      sector: sector === "ALL" ? undefined : sector,
      page,
      limit: COUNTRY_COVERAGE_PAGE_SIZE,
    }),
    [countryCode, sector, page],
  );

  const { data, isLoading, isFetching, isError } =
    useGetCountryCoverageSummaryQuery(queryArgs, {
      skip: !canRead,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    });

  const countries = data?.data?.countries ?? [];
  const nonGccCountries = countries.filter((country) => !country.isGcc);
  const gcc = data?.data?.gcc;
  const pagination = data?.data?.pagination;
  const selectedIsGcc = !!countryCode && GCC_CODES.has(countryCode.toUpperCase());
  const showGccCard = !!gcc && (!countryCode || selectedIsGcc) && page === 1;
  const hasCards = showGccCard || nonGccCountries.length > 0;
  const hasFilters = !!countryCode || sector !== "ALL";

  const resetFilters = () => {
    setCountryCode("");
    setSector("ALL");
    setPage(1);
  };

  const showingFrom =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.limit + 1
      : 0;
  const showingTo =
    pagination && pagination.total > 0
      ? Math.min(pagination.page * pagination.limit, pagination.total)
      : 0;

  if (!canRead) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        You do not have permission to view country coverage.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 shadow-xl shadow-teal-200">
            <Globe2 className="h-8 w-8 text-white" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Country Coverage
            </h1>
            <p className="text-muted-foreground mt-1">
              See which users cover each country. GCC countries appear as one
              card with unique users.
            </p>
          </div>
        </div>
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-2"
          >
            <FilterX className="h-4 w-4" aria-hidden />
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filters
        </p>
        <div className="flex flex-col xl:flex-row gap-3 xl:items-end">
          <div className="flex-1 min-w-[220px] max-w-md">
            <CountrySelect
              label="Country"
              value={countryCode}
              onValueChange={(code) => {
                setCountryCode(code);
                setPage(1);
              }}
              placeholder="All countries (with flags)"
              allowEmpty
              pageSize={30}
            />
          </div>

          <div className="space-y-1.5 w-full sm:w-52">
            <p className="text-sm font-medium text-foreground">Sector</p>
            <Select
              value={sector}
              onValueChange={(v) => {
                setSector(v as SectorFilter);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Sector filter">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All sectors</SelectItem>
                <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
                <SelectItem value="NON_HEALTH_CARE">Non-healthcare</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading coverage…
        </div>
      ) : isError && !data ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
          Failed to load country coverage. Please try again.
        </div>
      ) : !hasCards ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">
          No countries match your filters. Coverage is set on each user&apos;s
          recruiter capabilities.
        </div>
      ) : (
        <div
          className={`space-y-4 ${isFetching ? "opacity-70 transition-opacity" : ""}`}
          aria-busy={isFetching}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {showGccCard && gcc && <GccCoverageCard gcc={gcc} />}
            {!selectedIsGcc &&
              nonGccCountries.map((country) => (
                <CountryCoverageCard key={country.code} country={country} />
              ))}
          </div>

          {pagination && pagination.total > pagination.limit && (
            <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-border bg-muted/50 px-6 py-4 gap-3">
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
                </span>{" "}
                countries
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
                <span className="px-2 text-xs font-medium text-muted-foreground">
                  Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                </span>
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
        </div>
      )}
    </div>
  );
}
