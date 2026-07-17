import type { ParsedEducationEntry } from './resume-field-parser';

export type QualificationCatalogEntry = {
  id: string;
  name: string;
  shortName: string | null;
  field?: string | null;
  aliases: string[];
};

export type MatchedQualification = {
  qualificationId: string;
  rawDegree: string;
  university?: string;
  graduationYear?: number;
  isCompleted: boolean;
  notes?: string;
  matchedAs: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .filter((t) => t.length > 1 && !['of', 'in', 'and', 'the', 'for'].includes(t)),
  );
}

function scoreMatch(needle: string, haystack: string): number {
  if (!needle || !haystack) return 0;
  if (needle === haystack) return 100;
  if (haystack.includes(needle) || needle.includes(haystack)) {
    const overlap = Math.min(needle.length, haystack.length);
    const longer = Math.max(needle.length, haystack.length);
    return 70 + Math.floor((overlap / longer) * 25);
  }

  const nTokens = tokenSet(needle);
  const hTokens = tokenSet(haystack);
  if (nTokens.size === 0) return 0;
  let hits = 0;
  for (const t of nTokens) {
    if (hTokens.has(t)) hits += 1;
  }
  if (hits === 0) return 0;
  return Math.floor((hits / nTokens.size) * 80);
}

function fieldBoost(needle: string, field?: string | null): number {
  if (!field) return 0;
  const n = normalize(needle);
  const f = normalize(field);
  if (!f) return 0;
  if (n.includes(f) || f.includes(n)) return 20;
  const nTokens = tokenSet(n);
  const fTokens = tokenSet(f);
  let hits = 0;
  for (const t of fTokens) {
    if (nTokens.has(t)) hits += 1;
  }
  if (hits === 0) return 0;
  return Math.min(18, hits * 6);
}

/**
 * Map parsed education phrases onto Affiniks qualification catalog rows.
 */
export function matchEducationsToCatalog(
  educations: ParsedEducationEntry[],
  catalog: QualificationCatalogEntry[],
  minScore = 60,
): MatchedQualification[] {
  if (!educations.length || !catalog.length) return [];

  const indexed = catalog.map((entry) => {
    const labels = [entry.name, entry.shortName ?? '', ...entry.aliases]
      .map(normalize)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    return { entry, labels };
  });

  const matched: MatchedQualification[] = [];
  const usedQualificationIds = new Set<string>();

  for (const edu of educations) {
    const needle = normalize(edu.rawDegree);
    if (!needle) continue;

    let best: { id: string; score: number; label: string } | null = null;

    for (const { entry, labels } of indexed) {
      if (usedQualificationIds.has(entry.id)) continue;
      for (const label of labels) {
        const score =
          scoreMatch(needle, label) + fieldBoost(needle, entry.field);
        if (!best || score > best.score) {
          best = { id: entry.id, score, label };
        }
      }
    }

    if (!best || best.score < minScore) continue;

    usedQualificationIds.add(best.id);
    matched.push({
      qualificationId: best.id,
      rawDegree: edu.rawDegree,
      university: edu.university,
      graduationYear: edu.graduationYear,
      isCompleted: true,
      notes: edu.notes ?? `Matched resume phrase "${edu.rawDegree}"`,
      matchedAs: best.label,
    });
  }

  return matched;
}
