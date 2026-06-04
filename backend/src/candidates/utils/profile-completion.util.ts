/**
 * Candidate profile completion (v1).
 *
 * Keep CANDIDATE_PROFILE_REQUIRED_DOCUMENTS and PROFILE_DOCUMENT_SATISFIERS
 * in sync with `web/src/features/candidates/profileCompletion.ts`.
 */

export const CANDIDATE_PROFILE_REQUIRED_DOCUMENTS = [
  'resume',
  'degree',
  'photo',
  'passport',
  'aadhaar',
  'registration_certificate',
] as const;

export type CandidateProfileRequiredDocumentId =
  (typeof CANDIDATE_PROFILE_REQUIRED_DOCUMENTS)[number];

export type ProfileMissingItem =
  | {
      kind: 'personal';
      key: 'email' | 'mobile' | 'date_of_birth';
      label: string;
    }
  | { kind: 'document'; key: string; label: string };

export interface CandidateProfileCompletionPayload {
  percent: number;
  requiredCount: number;
  completedCount: number;
  missing: ProfileMissingItem[];
  breakdown: {
    personal: { completed: number; total: number };
    documents: { completed: number; total: number };
  };
}

/**
 * For each canonical required doc id, which stored `Document.docType` values count.
 */
export const PROFILE_DOCUMENT_SATISFIERS: Record<string, readonly string[]> = {
  resume: ['resume', 'cv'],
  degree: ['degree', 'degree_certificate', 'degree_certificate_original'],
  photo: ['photo', 'passport_photo'],
  passport: [
    'passport',
    'passport_copy',
    'passport_original',
    'passport_cover_bio',
  ],
  aadhaar: ['aadhaar'],
  registration_certificate: [
    'registration_certificate',
    'registration_certificate_original',
  ],
};

const REQUIRED_DOC_LABELS: Record<CandidateProfileRequiredDocumentId, string> =
  {
    resume: 'Resume',
    degree: 'Degree certificate',
    photo: 'Photograph',
    passport: 'Passport',
    aadhaar: 'Aadhaar',
    registration_certificate: 'Registration certificate',
  };

/** Display labels for repository / recruiter mandatory checklist UI. */
export const DOCUMENT_REPOSITORY_LABELS: Record<
  CandidateProfileRequiredDocumentId,
  string
> = {
  resume: 'Resume',
  degree: 'Degree Certificate',
  photo: 'Passport Size Photo',
  passport: 'Passport Copy',
  aadhaar: 'Aadhaar Card',
  registration_certificate: 'Registration Certificate',
};

export type DocumentRepositorySlotRow = {
  key: CandidateProfileRequiredDocumentId;
  label: string;
  uploadDocType: string;
  satisfied: boolean;
};

export function getDocumentRepositorySlots(
  documents: Array<{ docType: string }>,
): DocumentRepositorySlotRow[] {
  const uploaded = collectUploadedDocTypes(documents);
  return CANDIDATE_PROFILE_REQUIRED_DOCUMENTS.map((id) => ({
    key: id,
    label: DOCUMENT_REPOSITORY_LABELS[id],
    uploadDocType: DOCUMENT_REPOSITORY_UPLOAD_TYPE[id],
    satisfied: hasRequiredDocument(uploaded, id),
  }));
}

/** Matches `DOCUMENT_REPOSITORY_UPLOAD_TYPE` in web profileCompletion.ts */
export const DOCUMENT_REPOSITORY_UPLOAD_TYPE: Record<
  CandidateProfileRequiredDocumentId,
  string
> = {
  resume: 'resume',
  degree: 'degree_certificate',
  photo: 'passport_photo',
  passport: 'passport_copy',
  aadhaar: 'aadhaar',
  registration_certificate: 'registration_certificate',
};

export type DocumentRepositoryMissingSlot = {
  key: CandidateProfileRequiredDocumentId;
  label: string;
  uploadDocType: string;
};

export type DocumentRepositoryCompletion = {
  percent: number;
  requiredCount: number;
  completedCount: number;
  typeMissingCount: number;
  missing: DocumentRepositoryMissingSlot[];
};

/** Document Repository tab scoring only (six mandatory document types). */
export function computeDocumentRepositoryCompletion(
  documents: Array<{ docType: string }>,
): DocumentRepositoryCompletion {
  const uploaded = collectUploadedDocTypes(documents);
  const missing: DocumentRepositoryMissingSlot[] = [];

  for (const id of CANDIDATE_PROFILE_REQUIRED_DOCUMENTS) {
    if (!hasRequiredDocument(uploaded, id)) {
      missing.push({
        key: id,
        label: REQUIRED_DOC_LABELS[id],
        uploadDocType: DOCUMENT_REPOSITORY_UPLOAD_TYPE[id],
      });
    }
  }

  const requiredCount = CANDIDATE_PROFILE_REQUIRED_DOCUMENTS.length;
  const completedCount = requiredCount - missing.length;
  const percent =
    requiredCount > 0
      ? Math.round((completedCount / requiredCount) * 100)
      : 0;

  return {
    percent,
    requiredCount,
    completedCount,
    typeMissingCount: missing.length,
    missing,
  };
}

function hasEmail(email?: string | null): boolean {
  return Boolean(email && String(email).trim().length > 0);
}

function hasMobile(
  countryCode?: string | null,
  mobileNumber?: string | null,
): boolean {
  return Boolean(
    countryCode &&
      String(countryCode).trim().length > 0 &&
      mobileNumber &&
      String(mobileNumber).trim().length > 0,
  );
}

function hasDateOfBirth(dateOfBirth?: Date | string | null): boolean {
  return dateOfBirth != null && dateOfBirth !== '';
}

function collectUploadedDocTypes(
  documents: Array<{ docType: string }>,
): Set<string> {
  const set = new Set<string>();
  for (const d of documents) {
    if (d?.docType) set.add(String(d.docType).trim().toLowerCase());
  }
  return set;
}

function hasRequiredDocument(
  uploaded: Set<string>,
  canonicalId: CandidateProfileRequiredDocumentId,
): boolean {
  const satisfiers =
    PROFILE_DOCUMENT_SATISFIERS[canonicalId] ?? [canonicalId];
  return satisfiers.some((t) => uploaded.has(String(t).toLowerCase()));
}

export type CandidateProfileCompletionInput = {
  email?: string | null;
  countryCode?: string | null;
  mobileNumber?: string | null;
  dateOfBirth?: Date | string | null;
};

export function computeCandidateProfileCompletion(
  candidate: CandidateProfileCompletionInput,
  documents: Array<{ docType: string }>,
): CandidateProfileCompletionPayload {
  const personalChecks: Array<{ ok: boolean; missing: ProfileMissingItem }> =
    [
      {
        ok: hasEmail(candidate.email),
        missing: {
          kind: 'personal',
          key: 'email',
          label: 'Email',
        },
      },
      {
        ok: hasMobile(candidate.countryCode, candidate.mobileNumber),
        missing: {
          kind: 'personal',
          key: 'mobile',
          label: 'Mobile number',
        },
      },
      {
        ok: hasDateOfBirth(candidate.dateOfBirth),
        missing: {
          kind: 'personal',
          key: 'date_of_birth',
          label: 'Date of birth',
        },
      },
    ];

  const uploaded = collectUploadedDocTypes(documents);

  const documentChecks = CANDIDATE_PROFILE_REQUIRED_DOCUMENTS.map(
    (id) => ({
      ok: hasRequiredDocument(uploaded, id),
      missing: {
        kind: 'document' as const,
        key: id,
        label: REQUIRED_DOC_LABELS[id],
      },
    }),
  );

  const personalDone = personalChecks.filter((c) => c.ok).length;
  const personalTotal = personalChecks.length;
  const docsDone = documentChecks.filter((c) => c.ok).length;
  const docsTotal = documentChecks.length;

  const missing: ProfileMissingItem[] = [
    ...personalChecks.filter((c) => !c.ok).map((c) => c.missing),
    ...documentChecks.filter((c) => !c.ok).map((c) => c.missing),
  ];

  const requiredCount = personalTotal + docsTotal;
  const completedCount = personalDone + docsDone;
  const percent =
    requiredCount === 0
      ? 100
      : Math.round((completedCount / requiredCount) * 100);

  return {
    percent,
    requiredCount,
    completedCount,
    missing,
    breakdown: {
      personal: { completed: personalDone, total: personalTotal },
      documents: { completed: docsDone, total: docsTotal },
    },
  };
}

/**
 * Merge `profileCompletion` onto a candidate; drops `documents` from the result
 * (used when documents were only loaded for scoring).
 */
export function withProfileCompletion<
  T extends {
    email?: string | null;
    countryCode?: string | null;
    mobileNumber?: string | null;
    dateOfBirth?: Date | string | null;
    documents?: Array<{ docType: string }>;
  },
>(
  candidate: T,
): Omit<T, 'documents'> & {
  profileCompletion: CandidateProfileCompletionPayload;
} {
  const { documents = [], ...rest } = candidate;
  const profileCompletion = computeCandidateProfileCompletion(
    rest,
    documents,
  );
  return { ...(rest as Omit<T, 'documents'>), profileCompletion };
}
