export class GccImportLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GccImportLookupError';
  }
}

export type ProfessionTypeRow = { id: string; name: string; isActive: boolean };
export type CandidateStatusRow = { id: number; statusName: string };

export function resolveNurseProfessionType(
  rows: ProfessionTypeRow[],
): ProfessionTypeRow {
  if (rows.length !== 1) {
    throw new GccImportLookupError(
      `Expected exactly one active profession type name=nurse, found ${rows.length}`,
    );
  }
  return rows[0];
}

export function resolveInterestedStatus(
  rows: CandidateStatusRow[],
): CandidateStatusRow {
  if (rows.length !== 1) {
    throw new GccImportLookupError(
      `Expected exactly one candidate_status named Interested, found ${rows.length}`,
    );
  }
  return rows[0];
}

export function isInterestedStatusName(statusName: string | null | undefined): boolean {
  return (statusName ?? '').trim().toLowerCase() === 'interested';
}

export function remarksEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (a ?? '').trim() === (b ?? '').trim();
}

export function shouldUpdateInterestedStatus(params: {
  currentStatusName: string | null | undefined;
  latestInterestedReason: string | null | undefined;
  excelRemarks: string;
}): boolean {
  const remarks = params.excelRemarks.trim();
  if (isInterestedStatusName(params.currentStatusName)) {
    if (!remarks) return false;
    if (remarksEqual(params.latestInterestedReason, remarks)) return false;
    return true;
  }
  return true;
}
