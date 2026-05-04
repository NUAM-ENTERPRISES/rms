import { DOCUMENT_TYPE } from '../../common/constants/document-types';

/** Mirrors `web/src/features/candidates/profileCompletion.ts` required document list. */
const PROFILE_REQUIRED_DOCS: { docType: string; label: string }[] = [
  { docType: DOCUMENT_TYPE.RESUME, label: 'Resume' },
  { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate' },
  { docType: DOCUMENT_TYPE.PASSPORT_PHOTO, label: 'Passport Size Photo' },
  { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy' },
  { docType: DOCUMENT_TYPE.AADHAAR, label: 'Aadhaar Card' },
  {
    docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
    label: 'Registration Certificate',
  },
];

function normalizeDocType(docType: string): string {
  const lower = docType.toLowerCase();
  if (lower === 'photo') return DOCUMENT_TYPE.PASSPORT_PHOTO;
  if (lower === 'passport') return DOCUMENT_TYPE.PASSPORT_COPY;
  if (lower === 'degree') return DOCUMENT_TYPE.DEGREE_CERTIFICATE;
  return lower;
}

export type ProfileCompletionInput = {
  email?: string | null;
  mobileNumber?: string | null;
  dateOfBirth?: Date | string | null;
  documents: { docType: string }[];
};

export type CandidateProfileCompletionPayload = {
  percent: number;
  requiredCount: number;
  completedCount: number;
  missing: Array<{ type: 'personal' | 'document'; key: string; label: string }>;
  breakdown: {
    personal: {
      requiredCount: number;
      completedCount: number;
      missing: Array<{ key: string; label: string }>;
    };
    documents: {
      requiredCount: number;
      completedCount: number;
      missing: Array<{ key: string; label: string }>;
    };
  };
};

/**
 * Server-side profile completion (personal fields + mandatory document types).
 * Keep in sync with `getCandidateProfileCompletion` on the web app.
 */
export function computeCandidateProfileCompletion(
  input: ProfileCompletionInput,
): CandidateProfileCompletionPayload {
  const docs = Array.isArray(input.documents) ? input.documents : [];

  const uploadedByType = new Map<string, boolean>();
  for (const d of docs) {
    if (!d?.docType) continue;
    uploadedByType.set(normalizeDocType(String(d.docType)), true);
  }

  const requiredDocs = PROFILE_REQUIRED_DOCS;
  const docRequiredCount = requiredDocs.length;
  const docMissing = requiredDocs.filter(
    (r) => !uploadedByType.has(String(r.docType).toLowerCase()),
  );
  const docCompletedCount = docRequiredCount - docMissing.length;

  const missingPersonal = [
    {
      key: 'dateOfBirth',
      label: 'Date of Birth',
      ok: input.dateOfBirth != null && String(input.dateOfBirth).trim() !== '',
    },
    {
      key: 'mobileNumber',
      label: 'Mobile Number',
      ok: !!input.mobileNumber?.toString().trim(),
    },
    {
      key: 'email',
      label: 'Email',
      ok: !!input.email?.toString().trim(),
    },
  ].filter((x) => !x.ok);

  const personalRequired = 3;
  const personalCompleted = personalRequired - missingPersonal.length;

  const missing: CandidateProfileCompletionPayload['missing'] = [
    ...missingPersonal.map((p) => ({
      type: 'personal' as const,
      key: p.key,
      label: p.label,
    })),
    ...docMissing.map((d) => ({
      type: 'document' as const,
      key: String(d.docType),
      label: d.label,
    })),
  ];

  const requiredCount = docRequiredCount + personalRequired;
  const completedCount = requiredCount - missing.length;
  const percent =
    requiredCount > 0 ? Math.round((completedCount / requiredCount) * 100) : 0;

  return {
    percent,
    requiredCount,
    completedCount,
    missing,
    breakdown: {
      personal: {
        requiredCount: personalRequired,
        completedCount: personalCompleted,
        missing: missingPersonal.map((p) => ({ key: p.key, label: p.label })),
      },
      documents: {
        requiredCount: docRequiredCount,
        completedCount: docCompletedCount,
        missing: docMissing.map((d) => ({
          key: String(d.docType),
          label: d.label,
        })),
      },
    },
  };
}
