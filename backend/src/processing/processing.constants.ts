import { ProcessingStepKey } from '@prisma/client';

export type ProcessingStepConfig = {
  key: ProcessingStepKey;
  label: string;
  description: string;
  defaultSlaDays: number;
  optional?: boolean;
  allowNotApplicable?: boolean;
};

export const PROCESSING_STEPS: ProcessingStepConfig[] = [
  {
    key: ProcessingStepKey.MEDICAL_CERTIFICATE,
    label: 'Medical Certificate',
    description:
      'Obtain the fit-to-travel medical certificate from an authorized clinic.',
    defaultSlaDays: 5,
  },
  {
    key: ProcessingStepKey.DOCUMENT_COLLECTION,
    label: 'Original Document Check',
    description:
      'Collect and verify originals (passport, licenses, academic transcripts).',
    defaultSlaDays: 7,
  },
  {
    key: ProcessingStepKey.HRD_ATTESTATION,
    label: 'HRD Attestation',
    description:
      'Complete state HRD attestation for relevant educational certificates.',
    defaultSlaDays: 20,
  },
  {
    key: ProcessingStepKey.QVP,
    label: 'QVP Accreditation',
    description: 'Qualification Verification Program mandated by Saudi MHRSD.',
    defaultSlaDays: 15,
    allowNotApplicable: true,
  },
  {
    key: ProcessingStepKey.DATAFLOW,
    label: 'DataFlow Verification',
    description:
      'DataFlow / SCFHS verification for healthcare professionals where required.',
    defaultSlaDays: 30,
    allowNotApplicable: true,
  },
  {
    key: ProcessingStepKey.PROMETRIC,
    label: 'Prometric Exam',
    description: 'Schedule and clear the Prometric licensing examination.',
    defaultSlaDays: 10,
    allowNotApplicable: true,
  },
  {
    key: ProcessingStepKey.VISA,
    label: 'Visa Processing',
    description: 'Submit documents for visa stamping and follow approvals.',
    defaultSlaDays: 25,
  },
  {
    key: ProcessingStepKey.IMMIGRATION,
    label: 'Immigration Formalities',
    description: 'Complete MOFA / emigration clearances after visa approval.',
    defaultSlaDays: 7,
  },
  {
    key: ProcessingStepKey.TICKETING,
    label: 'Ticketing',
    description: 'Book tickets based on client deployment window.',
    defaultSlaDays: 3,
  },
  {
    key: ProcessingStepKey.TRAVEL,
    label: 'Travel & Arrival',
    description: 'Confirm travel, arrival, and pickup coordination.',
    defaultSlaDays: 2,
  },
  {
    key: ProcessingStepKey.JOINING,
    label: 'Joining Confirmation',
    description: 'Ensure candidate has reported and onboarded at client site.',
    defaultSlaDays: 7,
  },
];

export const PROCESSING_STEP_ORDER = PROCESSING_STEPS.map((step) => step.key);

export const PROCESSING_STEP_CONFIG_MAP = PROCESSING_STEPS.reduce(
  (acc, step) => {
    acc[step.key] = step;
    return acc;
  },
  {} as Record<ProcessingStepKey, ProcessingStepConfig>,
);
