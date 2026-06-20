import { PROJECT_SECTOR } from '../projects/constants';

/** Stored on steps auto-cancelled because template key was removed from the sector allowlist. */
export const PROCESSING_STEP_SECTOR_MISMATCH_REASON = 'Not applicable for this project sector';

/**
 * Template keys allowed for processing when `Project.sector` is healthcare.
 * Includes `document_received` for Gulf country plans (see processing-country-steps seed).
 */
export const HEALTHCARE_STEP_KEYS = new Set<string>([
  'offer_letter',
  'document_received',
  'hrd',
  'data_flow',
  'eligibility',
  'prometric',
  'council_registration',
  'document_attestation',
  'medical',
  'mofa_number',
  'medical_fitness',
  'biometrics',
  'visa',
  'emigration',
  'ticket',
]);

/** Minimal path for non-healthcare projects (intersected with country / global plan). */
export const NON_HEALTHCARE_STEP_KEYS = new Set<string>([
  'offer_letter',
  'hrd',
  'document_attestation',
  'biometrics',
  'visa',
  'emigration',
  'ticket',
]);

export function allowedTemplateKeysForSector(sector: string | null | undefined): Set<string> {
  if (sector === PROJECT_SECTOR.NON_HEALTHCARE) {
    return NON_HEALTHCARE_STEP_KEYS;
  }
  return HEALTHCARE_STEP_KEYS;
}

export type FilterProcessingStepsOptions = {
  /** Include steps with status `cancelled` (e.g. when entire processing is cancelled). */
  includeCancelled?: boolean;
};

/** Steps visible for progress / UI: template key allowed for project sector and not cancelled. */
export function filterProcessingStepsForSector<T extends { status: string; template: { key: string } }>(
  steps: T[],
  sector: string | null | undefined,
  options?: FilterProcessingStepsOptions,
): T[] {
  const allowed = allowedTemplateKeysForSector(sector);
  const includeCancelled = options?.includeCancelled === true;
  return steps.filter(
    (s) =>
      allowed.has(s.template.key) &&
      (includeCancelled || s.status !== 'cancelled'),
  );
}

export type ApplicableStepProgress = {
  totalApplicable: number;
  completedApplicable: number;
  percent: number;
  pendingSteps: Array<{
    key: string;
    label: string;
    status: string;
  }>;
};

export function computeApplicableStepProgress(
  steps: { status: string; template: { key: string; label?: string; order?: number } }[],
  sector: string | null | undefined,
): ApplicableStepProgress {
  const applicable = filterProcessingStepsForSector(steps, sector);
  const sorted = [...applicable].sort(
    (a, b) => (a.template.order ?? 9999) - (b.template.order ?? 9999),
  );
  const totalApplicable = sorted.length;
  const completedApplicable = sorted.filter((s) => s.status === 'completed').length;
  const percent =
    totalApplicable === 0 ? 0 : Math.round((completedApplicable / totalApplicable) * 100);
  const pendingSteps = sorted
    .filter((s) => s.status !== 'completed')
    .map((s) => ({
      key: s.template.key,
      label: (s.template.label?.trim() || s.template.key),
      status: s.status,
    }));
  return { totalApplicable, completedApplicable, percent, pendingSteps };
}
