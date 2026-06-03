/** Resolve passport from API row (camelCase or legacy snake_case). */
export function resolveCandidatePassportNumber(
  candidate: {
    passportNumber?: string | null;
    passport_number?: string | null;
  } | null
  | undefined,
): string | null {
  if (!candidate) return null;
  const raw =
    candidate.passportNumber ?? candidate.passport_number ?? null;
  const trimmed = raw?.toString().trim();
  return trimmed ? trimmed : null;
}
