// Shared progress calculation & normalization utilities for candidate pipeline

export const STATUS_ORDER = [
  'nominated',
  'pending_documents',
  'documents_submitted',
  'verification_in_progress',
  'documents_verified',
  'approved',

  // Interview-related (includes mock/training variants)
  'interview_assigned',
  'interview_scheduled',
  'interview_rescheduled',
  'interview_completed',
  'interview_passed',
  'interview_selected',

  'mock_interview_assigned',
  'mock_interview_scheduled',
  'mock_interview_completed',
  'mock_interview_passed',
  'mock_interview_failed',

  'training_assigned',
  'training_in_progress',
  'training_completed',
  'ready_for_reassessment',

  'interview_failed',

  // Final/selection
  'selected',
  'processing',
  'processing_started',
  'hired'
];

export function normalizeStatusName(entry?: any) {
  if (!entry) return undefined;

  const candidates = [
    entry?.subStatus?.name,
    typeof entry?.subStatusSnapshot === 'string' ? entry.subStatusSnapshot : undefined,
    entry?.mainStatus?.name,
    typeof entry?.mainStatusSnapshot === 'string' ? entry.mainStatusSnapshot : undefined,
    entry?.projectStatus?.statusName
  ]
    .filter(Boolean)
    .map((v: string) => String(v).toLowerCase());

  // try to match fully or partially to one of the known STATUS_ORDER keys
  for (const cand of candidates) {
    for (const key of STATUS_ORDER) {
      if (cand === key) return key;
      if (cand.includes(key)) return key; // 'verification_in_progress_document' -> 'verification_in_progress'
      if (cand.replace(/\s+/g, '_').includes(key)) return key; // 'Verified Documents' -> 'documents_verified' (if present)
    }
  }

  // fallback: return the first candidate normalized (underscored)
  return candidates.length ? candidates[0].replace(/\s+/g, '_') : undefined;
}

// Canonical ordered keys used for progress calculation (keeps the original 12-step granularity)
export const PROGRESS_ORDER = [
  'nominated',
  'pending_documents',
  'documents_submitted',
  'verification_in_progress',
  'documents_verified',
  'interview_scheduled',
  'interview_completed',
  'interview_passed',
  'selected',
  'processing',
  'hired'
];

// Map a normalized status (may be fine-grained, e.g. interview_assigned) to a canonical progress key
export function mapToProgressKey(raw?: string) {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();

  // exact match with canonical
  if (PROGRESS_ORDER.includes(s)) return s;

  // Document flow
  if (s.includes('pending_documents')) return 'pending_documents';
  if (s.includes('documents_submitted')) return 'documents_submitted';
  if (s.includes('verification_in_progress')) return 'verification_in_progress';
  if (s.includes('documents_verified')) return 'documents_verified';

  // Approved is before interview
  if (s === 'approved') return 'approved';

  // Interview related: map many sub-statuses into the canonical interview keys
  if (s.includes('interview') || s.startsWith('mock_interview') || s.startsWith('training')) {
    if (s.includes('assigned') || s.includes('scheduled') || s.includes('resched')) return 'interview_scheduled';
    if (s.includes('completed')) return 'interview_completed';
    if (s.includes('pass') || s.includes('selected')) return 'interview_passed';
    if (s.includes('fail')) return 'interview_completed';
    // fallback: treat as scheduled if unknown sub status under interview
    return 'interview_scheduled';
  }

  // Final flow
  if (s.includes('selected')) return 'selected';
  if (s.includes('processing')) return 'processing';
  if (s.includes('hired')) return 'hired';

  // fallback - try substring match into PROGRESS_ORDER
  for (const key of PROGRESS_ORDER) {
    if (s.includes(key)) return key;
  }

  return undefined;
}

export function getMostRecentEntry(history: any[] = []) {
  if (!history || history.length === 0) return undefined;
  let latest = history[0];
  for (const entry of history) {
    if (new Date(entry.statusChangedAt).getTime() > new Date(latest.statusChangedAt).getTime()) {
      latest = entry;
    }
  }
  return latest;
}

export function calculateProgress(history: any[] = []) {
  if (!history || history.length === 0) return { progress: 0, current: undefined };

  const latest = getMostRecentEntry(history);
  const raw = normalizeStatusName(latest);

  // map fine-grained status to canonical progress key
  const canonical = mapToProgressKey(raw);

  const totalStatuses = PROGRESS_ORDER.length;
  const currentIndex = canonical ? PROGRESS_ORDER.indexOf(canonical) : -1;
  const progress = currentIndex >= 0 ? Math.round(((currentIndex + 1) / totalStatuses) * 100) : 0;

  return { progress, current: canonical };
}

export function getNextProgressStatus(rawOrCanonical?: string) {
  if (!rawOrCanonical) return undefined;
  const canonical = PROGRESS_ORDER.includes(rawOrCanonical) ? rawOrCanonical : mapToProgressKey(rawOrCanonical);
  if (!canonical) return undefined;
  const idx = PROGRESS_ORDER.indexOf(canonical);
  return idx >= 0 && idx < PROGRESS_ORDER.length - 1 ? PROGRESS_ORDER[idx + 1] : undefined;
}

export default {
  STATUS_ORDER,
  normalizeStatusName,
  PROGRESS_ORDER,
  mapToProgressKey,
  getMostRecentEntry,
  calculateProgress
};
