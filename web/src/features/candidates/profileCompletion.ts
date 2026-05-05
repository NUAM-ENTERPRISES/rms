/**
 * Client-side profile completion rules.
 * Keep in sync with `backend/src/candidates/utils/profile-completion.util.ts`.
 */

export type ProfileMissingItem =
  | {
      kind: "personal";
      key: "email" | "mobile" | "date_of_birth";
      label: string;
    }
  | { kind: "document"; key: string; label: string };

export type CandidateProfileCompletionPayload = {
  percent: number;
  requiredCount: number;
  completedCount: number;
  missing: ProfileMissingItem[];
  breakdown: {
    personal: { completed: number; total: number };
    documents: { completed: number; total: number };
  };
};

export const CANDIDATE_PROFILE_REQUIRED_DOCUMENTS = [
  "resume",
  "degree",
  "photo",
  "passport",
  "aadhaar",
  "registration_certificate",
] as const;

export type CandidateProfileRequiredDocumentId =
  (typeof CANDIDATE_PROFILE_REQUIRED_DOCUMENTS)[number];

export const PROFILE_DOCUMENT_SATISFIERS: Record<string, readonly string[]> = {
  resume: ["resume", "cv"],
  degree: ["degree", "degree_certificate", "degree_certificate_original"],
  photo: ["photo", "passport_photo"],
  passport: [
    "passport",
    "passport_copy",
    "passport_original",
    "passport_cover_bio",
  ],
  aadhaar: ["aadhaar"],
  registration_certificate: [
    "registration_certificate",
    "registration_certificate_original",
  ],
};

const REQUIRED_DOC_LABELS: Record<CandidateProfileRequiredDocumentId, string> = {
  resume: "Resume",
  degree: "Degree certificate",
  photo: "Photograph",
  passport: "Passport",
  aadhaar: "Aadhaar",
  registration_certificate: "Registration certificate",
};

/** Display labels on the Document Repository tab (document-only scoring). */
export const DOCUMENT_REPOSITORY_LABELS: Record<
  CandidateProfileRequiredDocumentId,
  string
> = {
  resume: "Resume",
  degree: "Degree Certificate",
  photo: "Passport Size Photo",
  passport: "Passport Copy",
  aadhaar: "Aadhaar Card",
  registration_certificate: "Registration Certificate",
};

/** `docType` value to send when uploading a slot (matches `DOCUMENT_TYPE` / upload API). */
export const DOCUMENT_REPOSITORY_UPLOAD_TYPE: Record<
  CandidateProfileRequiredDocumentId,
  string
> = {
  resume: "resume",
  degree: "degree_certificate",
  photo: "passport_photo",
  passport: "passport_copy",
  aadhaar: "aadhaar",
  registration_certificate: "registration_certificate",
};

export type DocumentRepositoryMissingItem = {
  key: CandidateProfileRequiredDocumentId;
  label: string;
  uploadDocType: string;
};

export type DocumentRepositoryCompletion = {
  percent: number;
  requiredCount: number;
  completedCount: number;
  missing: DocumentRepositoryMissingItem[];
  /** Types present (at least one file per slot). */
  typeSatisfiedCount: number;
  /** Types still missing. */
  typeMissingCount: number;
};

function hasEmail(email?: string | null): boolean {
  return Boolean(email && String(email).trim().length > 0);
}

function hasMobile(
  countryCode?: string | null,
  mobileNumber?: string | null
): boolean {
  return Boolean(
    countryCode &&
      String(countryCode).trim().length > 0 &&
      mobileNumber &&
      String(mobileNumber).trim().length > 0
  );
}

function hasDateOfBirth(dateOfBirth?: string | null): boolean {
  return dateOfBirth != null && String(dateOfBirth).length > 0;
}

function collectUploadedDocTypes(
  documents: Array<{ docType?: string }>
): Set<string> {
  const set = new Set<string>();
  for (const d of documents) {
    const t = d?.docType;
    if (t) set.add(String(t).trim().toLowerCase());
  }
  return set;
}

function hasRequiredDocument(
  uploaded: Set<string>,
  canonicalId: CandidateProfileRequiredDocumentId
): boolean {
  const satisfiers = PROFILE_DOCUMENT_SATISFIERS[canonicalId] ?? [canonicalId];
  return satisfiers.some((t) => uploaded.has(String(t).toLowerCase()));
}

/**
 * Document Repository tab only: six mandatory **document** slots, independent of
 * personal fields and of per-file workflow status (pending/verified).
 */
export function getCandidateProfileCompletion(
  documents: Array<{ docType?: string }> | undefined
): DocumentRepositoryCompletion {
  const uploaded = collectUploadedDocTypes(documents ?? []);

  const missing: DocumentRepositoryMissingItem[] = [];
  for (const id of CANDIDATE_PROFILE_REQUIRED_DOCUMENTS) {
    if (!hasRequiredDocument(uploaded, id)) {
      missing.push({
        key: id,
        label: DOCUMENT_REPOSITORY_LABELS[id],
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
    missing,
    typeSatisfiedCount: completedCount,
    typeMissingCount: missing.length,
  };
}

export type DocumentRepositorySlotRow = {
  key: CandidateProfileRequiredDocumentId;
  label: string;
  uploadDocType: string;
  /** At least one document of this type (or an accepted alias) is on file. */
  satisfied: boolean;
};

/** All six mandatory slots in fixed order, for checklist UI. */
export function getDocumentRepositorySlots(
  documents: Array<{ docType?: string }> | undefined
): DocumentRepositorySlotRow[] {
  const uploaded = collectUploadedDocTypes(documents ?? []);
  return CANDIDATE_PROFILE_REQUIRED_DOCUMENTS.map((id) => ({
    key: id,
    label: DOCUMENT_REPOSITORY_LABELS[id],
    uploadDocType: DOCUMENT_REPOSITORY_UPLOAD_TYPE[id],
    satisfied: hasRequiredDocument(uploaded, id),
  }));
}

type ProfileInput = {
  email?: string | null;
  countryCode?: string | null;
  mobileNumber?: string | null;
  dateOfBirth?: string | null;
  profileCompletion?: CandidateProfileCompletionPayload;
};

export function computeLocalCandidateProfileCompletion(
  candidate: ProfileInput,
  documents: Array<{ docType?: string }>
): CandidateProfileCompletionPayload {
  const personalChecks: Array<{ ok: boolean; missing: ProfileMissingItem }> = [
    {
      ok: hasEmail(candidate.email),
      missing: { kind: "personal", key: "email", label: "Email" },
    },
    {
      ok: hasMobile(candidate.countryCode, candidate.mobileNumber),
      missing: { kind: "personal", key: "mobile", label: "Mobile number" },
    },
    {
      ok: hasDateOfBirth(candidate.dateOfBirth),
      missing: {
        kind: "personal",
        key: "date_of_birth",
        label: "Date of birth",
      },
    },
  ];

  const uploaded = collectUploadedDocTypes(documents);

  const documentChecks = CANDIDATE_PROFILE_REQUIRED_DOCUMENTS.map((id) => ({
    ok: hasRequiredDocument(uploaded, id),
    missing: {
      kind: "document" as const,
      key: id,
      label: REQUIRED_DOC_LABELS[id],
    },
  }));

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

export function resolveCandidateProfileCompletion(
  candidate: ProfileInput,
  documents?: Array<{ docType?: string }>
): CandidateProfileCompletionPayload {
  if (candidate.profileCompletion) {
    return candidate.profileCompletion;
  }
  return computeLocalCandidateProfileCompletion(
    candidate,
    documents ?? []
  );
}
