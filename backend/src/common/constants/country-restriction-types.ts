export const COUNTRY_RESTRICTION_TYPES = {
  PROCESSING_STEP_CANCEL: 'processing_step_cancel',
  MANUAL: 'manual',
} as const;

export type CountryRestrictionType =
  (typeof COUNTRY_RESTRICTION_TYPES)[keyof typeof COUNTRY_RESTRICTION_TYPES];

export const COUNTRY_RESTRICTION_TYPE_LABELS: Record<CountryRestrictionType, string> = {
  [COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL]: 'Processing step cancel',
  [COUNTRY_RESTRICTION_TYPES.MANUAL]: 'Manual',
};

export interface ProcessingStepCancelSourceMeta {
  stepKey: string;
  projectId: string;
  projectTitle?: string;
  processingStepId?: string;
  processingCandidateId?: string;
}

export interface ManualRestrictionSourceMeta {
  notes?: string;
}
