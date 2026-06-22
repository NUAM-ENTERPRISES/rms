import { useState } from "react";
import { ShieldBan } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FlagIcon } from "@/shared";
import { cn } from "@/lib/utils";
import {
  useGetCandidateCountryRestrictionsQuery,
  type CandidateCountryRestriction,
} from "@/features/candidates/api";
import {
  formatCountryRestrictionDate,
  getCountryRestrictionSourceSummary,
  getCountryRestrictionTypeLabel,
} from "@/features/processing/utils/candidateCountryRestrictionLabels";
import { CountryRestrictionsPagination } from "@/features/candidates/components/CountryRestrictionsPagination";

const COUNTRY_RESTRICTIONS_PAGE_SIZE = 5;

function RestrictionTooltipItem({
  restriction,
}: {
  restriction: CandidateCountryRestriction;
}) {
  const countryName =
    restriction.country?.name ?? restriction.countryCode.toUpperCase();
  const sourceSummary = getCountryRestrictionSourceSummary(restriction);

  return (
    <div className="rounded-lg border border-red-200/80 bg-white/95 p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <FlagIcon
          countryCode={restriction.countryCode}
          size="md"
          className="mt-0.5 shrink-0 rounded shadow-sm"
          aria-label={`Flag of ${countryName}`}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{countryName}</p>
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-[10px] font-semibold uppercase tracking-wide text-red-800"
            >
              Restricted
            </Badge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {restriction.reason}
          </p>
          <div className="space-y-0.5 text-[11px] text-slate-500">
            <p>
              {getCountryRestrictionTypeLabel(restriction.restrictionType)}
            </p>
            {sourceSummary ? <p>Source: {sourceSummary}</p> : null}
            <p>
              Since {formatCountryRestrictionDate(restriction.restrictedAt)}
              {restriction.restrictedBy?.name
                ? ` · ${restriction.restrictedBy.name}`
                : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CandidateCountryRestrictionsIndicatorProps {
  candidateId: string;
  className?: string;
  highlightCountryCode?: string | null;
}

export function CandidateCountryRestrictionsIndicator({
  candidateId,
  className,
  highlightCountryCode,
}: CandidateCountryRestrictionsIndicatorProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetCandidateCountryRestrictionsQuery({
    candidateId,
    page,
    limit: COUNTRY_RESTRICTIONS_PAGE_SIZE,
  });
  const { data: highlightedRestrictionData } =
    useGetCandidateCountryRestrictionsQuery(
      {
        candidateId,
        countryCode: highlightCountryCode ?? undefined,
        limit: 1,
      },
      { skip: !highlightCountryCode },
    );

  const activeRestrictions = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: COUNTRY_RESTRICTIONS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };
  const totalActive = pagination.total;

  if (isLoading || totalActive === 0) {
    return null;
  }

  const highlightsProjectCountry = Boolean(highlightedRestrictionData?.items[0]);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
              highlightsProjectCountry
                ? "border-red-300 bg-red-100 text-red-700 hover:bg-red-200"
                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
              className,
            )}
            aria-label={`${totalActive} active country restriction${totalActive === 1 ? "" : "s"}. Hover for details.`}
          >
            <ShieldBan className="h-4 w-4" aria-hidden />
            {totalActive > 1 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow">
                {totalActive}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="w-[min(100vw-2rem,22rem)] border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50 p-3 text-slate-900 shadow-xl"
        >
          <div className="mb-2 flex items-center gap-2">
            <ShieldBan className="h-4 w-4 text-red-600" aria-hidden />
            <div>
              <p className="text-sm font-bold text-red-950">
                Country restrictions
              </p>
              <p className="text-[11px] text-red-800/80">
                Blocked from future projects in the countries below
              </p>
            </div>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {activeRestrictions.map((restriction) => (
              <RestrictionTooltipItem
                key={restriction.id}
                restriction={restriction}
              />
            ))}
          </div>
          <CountryRestrictionsPagination
            pagination={pagination}
            onPageChange={setPage}
            isLoading={isFetching}
            compact
            className="mt-2 border-red-100"
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
