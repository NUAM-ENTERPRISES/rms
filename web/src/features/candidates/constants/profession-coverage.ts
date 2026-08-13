/** Recruiter-scope-only wildcards; must not be assigned to candidates. */
export const PROFESSION_COVERAGE_WILDCARD_NAMES = {
  HEALTHCARE: "any_healthcare",
  NON_HEALTH_CARE: "any_non_health_care",
} as const;

export type ProfessionCoverageWildcardName =
  (typeof PROFESSION_COVERAGE_WILDCARD_NAMES)[keyof typeof PROFESSION_COVERAGE_WILDCARD_NAMES];

export function isProfessionCoverageWildcard(
  name: string | null | undefined,
): boolean {
  return (
    name === PROFESSION_COVERAGE_WILDCARD_NAMES.HEALTHCARE ||
    name === PROFESSION_COVERAGE_WILDCARD_NAMES.NON_HEALTH_CARE
  );
}
