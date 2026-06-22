import type { PendingStatusChangeRequest } from "@/features/candidates/api";

export type ResolvedCountryRestriction = {
  countryCode: string;
  countryName: string;
};

function readRestrictionCountryCode(
  request: Pick<
    PendingStatusChangeRequest,
    "restrictCountryCode" | "requestedCountryRestriction"
  >,
): string | null {
  const rawCode = request.restrictCountryCode;
  if (typeof rawCode === "string" && rawCode.trim()) {
    return rawCode.trim();
  }

  return null;
}

export function resolveCountryRestrictionFromRequest(
  request: Pick<
    PendingStatusChangeRequest,
    | "restrictCountryCode"
    | "restrictCountryName"
    | "requestedCountryRestriction"
  >,
  projectCountry?: { code?: string | null; name?: string | null },
): ResolvedCountryRestriction | null {
  const countryCode = readRestrictionCountryCode(request);
  if (!countryCode && !request.requestedCountryRestriction) {
    return null;
  }

  const resolvedCode =
    countryCode ??
    (request.requestedCountryRestriction && projectCountry?.code?.trim()
      ? projectCountry.code.trim()
      : null);

  if (!resolvedCode) {
    return null;
  }

  const countryName =
    request.restrictCountryName?.trim() ||
    (projectCountry?.code === resolvedCode
      ? projectCountry?.name?.trim()
      : undefined) ||
    projectCountry?.name?.trim() ||
    resolvedCode;

  return { countryCode: resolvedCode, countryName };
}
