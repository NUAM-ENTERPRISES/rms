/** Nomination stages where offer letter upload is allowed (interview passed or later). */
export const OFFER_LETTER_UPLOAD_ELIGIBLE_SUB_STATUSES = [
  "interview_passed",
  "transfered_to_processing",
  "processing_in_progress",
  "processing_completed",
  "processing_cancelled",
  "ready_for_final",
] as const;

export type OfferLetterUploadEligibleSubStatus =
  (typeof OFFER_LETTER_UPLOAD_ELIGIBLE_SUB_STATUSES)[number];

export function isOfferLetterUploadEligible(
  subStatusName?: string | null,
): boolean {
  if (!subStatusName) return false;
  return OFFER_LETTER_UPLOAD_ELIGIBLE_SUB_STATUSES.includes(
    subStatusName as OfferLetterUploadEligibleSubStatus,
  );
}

export function buildOfferLetterNominationKey(
  projectId: string,
  roleCatalogId?: string | null,
): string {
  return `${projectId}-${roleCatalogId ?? "unknown"}`;
}

export type PassedInterviewNominationLookup = {
  mapIds: Set<string>;
  keys: Set<string>;
  roleCatalogByMapId: Map<string, string>;
};

export function buildPassedInterviewNominationLookup(
  interviews: OfferLetterInterviewItem[] = [],
): PassedInterviewNominationLookup {
  const mapIds = new Set<string>();
  const keys = new Set<string>();
  const roleCatalogByMapId = new Map<string, string>();

  for (const interview of interviews) {
    const mapId = interview.candidateProjectMap?.id;
    const roleCatalogId =
      interview.candidateProjectMap?.roleNeeded?.roleCatalogId ||
      interview.candidateProjectMap?.roleNeeded?.roleCatalog?.id;

    if (mapId) {
      mapIds.add(mapId);
      if (roleCatalogId) {
        roleCatalogByMapId.set(mapId, roleCatalogId);
      }
    }

    const projectId =
      interview.candidateProjectMap?.project?.id || interview.project?.id;
    if (!projectId) continue;

    keys.add(buildOfferLetterNominationKey(projectId, roleCatalogId));
  }

  return { mapIds, keys, roleCatalogByMapId };
}

export type OfferLetterDocumentItem = {
  fileUrl?: string;
  fileName?: string;
  status?: string;
  createdAt?: string;
  uploadedBy?: string;
  uploadedByUser?: { name?: string; email?: string } | null;
  roleCatalogId?: string | null;
  roleCatalog?: { id?: string } | null;
  verifications?: Array<{
    candidateProjectMapId?: string;
    candidateProjectMap?: {
      id?: string;
      project?: { id?: string };
    };
  }>;
};

function offerLetterMatchesNomination(
  doc: OfferLetterDocumentItem,
  options: {
    nominationMapId?: string;
    projectId: string;
    roleCatalogId?: string | null;
  },
): boolean {
  const { nominationMapId, projectId, roleCatalogId } = options;

  if (roleCatalogId) {
    const docRoleId = doc.roleCatalogId || doc.roleCatalog?.id;
    if (docRoleId && docRoleId !== roleCatalogId) return false;
  }

  const verifications = doc.verifications ?? [];
  if (verifications.length === 0) return false;

  return verifications.some((verification) => {
    const mapId =
      verification.candidateProjectMapId ||
      verification.candidateProjectMap?.id;
    if (nominationMapId && mapId === nominationMapId) return true;
    return verification.candidateProjectMap?.project?.id === projectId;
  });
}

/** Match offer letters per project nomination, not by role alone. */
export function findOfferLetterForNomination<T extends OfferLetterDocumentItem>(
  offerLetters: T[],
  options: {
    nominationMapId?: string;
    projectId: string;
    roleCatalogId?: string | null;
  },
): T | undefined {
  return offerLetters.find((doc) =>
    offerLetterMatchesNomination(doc, options),
  );
}

export function hasPassedInterviewForNomination(options: {
  nominationMapId?: string;
  projectId: string;
  roleCatalogId?: string | null;
  passedInterviewLookup?: PassedInterviewNominationLookup;
}): boolean {
  const { nominationMapId, projectId, roleCatalogId, passedInterviewLookup } =
    options;

  if (!passedInterviewLookup) return false;
  if (nominationMapId && passedInterviewLookup.mapIds.has(nominationMapId)) {
    return true;
  }

  return passedInterviewLookup.keys.has(
    buildOfferLetterNominationKey(projectId, roleCatalogId),
  );
}

export function canUserUploadOfferLetter(options: {
  isRecruiter: boolean;
  isInterviewCoordinator: boolean;
  canUploadDocuments: boolean;
  canWriteCandidates: boolean;
  canUploadInterviews: boolean;
  subStatusName?: string | null;
  /** When true, skip nomination sub-status check (e.g. interview-passed list views). */
  assumeInterviewPassed?: boolean;
  /** When true, a passed interview exists for this project nomination. */
  hasPassedInterview?: boolean;
}): boolean {
  const {
    isRecruiter,
    isInterviewCoordinator,
    canUploadDocuments,
    canWriteCandidates,
    canUploadInterviews,
    subStatusName,
    assumeInterviewPassed = false,
    hasPassedInterview = false,
  } = options;

  const hasPermission =
    canUploadDocuments ||
    canWriteCandidates ||
    isRecruiter ||
    isInterviewCoordinator ||
    canUploadInterviews;

  if (!hasPermission) return false;

  if (assumeInterviewPassed || hasPassedInterview) return true;

  return isOfferLetterUploadEligible(subStatusName);
}

/** Recruiters may upload only when no offer letter exists; other roles can re-upload. */
export function canShowOfferLetterUploadButton(options: {
  isRecruiter: boolean;
  hasOfferLetter: boolean;
  canUpload: boolean;
}): boolean {
  const { isRecruiter, hasOfferLetter, canUpload } = options;
  if (!canUpload) return false;
  if (isRecruiter && hasOfferLetter) return false;
  return true;
}

/** Interview coordinators may request recruiter upload when no letter exists yet. */
export function canShowOfferLetterRequestButton(options: {
  isRecruiter: boolean;
  hasOfferLetter: boolean;
  hasPendingRequest: boolean;
  canRequest: boolean;
}): boolean {
  const { isRecruiter, hasOfferLetter, hasPendingRequest, canRequest } = options;
  if (!canRequest || isRecruiter || hasOfferLetter || hasPendingRequest) {
    return false;
  }
  return true;
}

export type OfferLetterInterviewItem = {
  id?: string;
  outcome?: string;
  isOfferLetterUploaded?: boolean;
  offerLetterData?: {
    document?: {
      fileUrl?: string;
      uploadedByUser?: { name?: string; email?: string } | null;
    };
  } | null;
  candidateProjectMap?: {
    id?: string;
    candidate?: { id?: string };
    project?: { id?: string };
    roleNeeded?: {
      roleCatalogId?: string | null;
      roleCatalog?: { id?: string } | null;
    } | null;
  };
  candidate?: { id?: string };
  project?: { id?: string };
};

export function getOfferLetterOverrideKey(item: OfferLetterInterviewItem): string {
  const candidateId =
    item.candidateProjectMap?.candidate?.id || item.candidate?.id || "unknown";
  const projectId =
    item.candidateProjectMap?.project?.id || item.project?.id || "unknown";
  const roleCatalogId =
    item.candidateProjectMap?.roleNeeded?.roleCatalogId ||
    item.candidateProjectMap?.roleNeeded?.roleCatalog?.id ||
    "unknown";
  return `${candidateId}:${projectId}:${roleCatalogId}`;
}

/** Prefer server URL so recruiter re-uploads are visible to interview coordinators. */
export function resolveOfferLetterFileUrl(
  item: OfferLetterInterviewItem,
  overrides?: Record<string, string>,
): string | undefined {
  const serverUrl = item.offerLetterData?.document?.fileUrl;
  if (serverUrl) return serverUrl;

  const key = getOfferLetterOverrideKey(item);
  const candidateId =
    item.candidateProjectMap?.candidate?.id || item.candidate?.id;

  return overrides?.[key] || (candidateId ? overrides?.[candidateId] : undefined);
}

export function hasOfferLetter(
  item: OfferLetterInterviewItem,
  overrides?: Record<string, string>,
): boolean {
  return !!(
    item.isOfferLetterUploaded ||
    item.offerLetterData?.document?.fileUrl ||
    resolveOfferLetterFileUrl(item, overrides)
  );
}

export function getOfferLetterUploaderName(
  item: OfferLetterInterviewItem,
): string | null {
  return item.offerLetterData?.document?.uploadedByUser?.name || null;
}

export type OfferLetterUploadSuccess = {
  document?: { fileUrl?: string };
  fileUrl?: string;
};

export function getOfferLetterUrlFromUpload(
  data?: OfferLetterUploadSuccess,
): string | undefined {
  return data?.document?.fileUrl || data?.fileUrl;
}

export const OFFER_LETTER_UPLOAD_REQUEST_TITLE =
  "Call candidate and upload offer letter";

export const OFFER_LETTER_UPLOAD_REQUEST_MESSAGE =
  "This nomination was sent for processing without an offer letter. The interview coordinator did not receive the signed offer letter from the candidate. Please call the candidate, collect the signed offer letter, and upload it here.";

export function getOfferLetterUploadRequestRequesterLabel(
  reason?: string | null,
): string | null {
  if (!reason) return null;
  const match = reason.match(/\(Requested by ([^)]+)\)/i);
  return match?.[1]?.trim() ?? null;
}

/** Coordinator note shown to recruiters; strips the trailing requester attribution. */
export function getOfferLetterUploadRequestDisplayMessage(
  reason?: string | null,
): string {
  if (!reason?.trim()) {
    return OFFER_LETTER_UPLOAD_REQUEST_MESSAGE;
  }

  const withoutRequester = reason
    .replace(/\s*\(Requested by [^)]+\)\s*$/i, "")
    .trim();

  return withoutRequester || OFFER_LETTER_UPLOAD_REQUEST_MESSAGE;
}

export type OfferLetterUploadRequestItem = {
  projectId: string;
  roleCatalogId?: string | null;
  candidateProjectMapId?: string;
  reason?: string;
  requestedAt?: string;
};

export function findOfferLetterUploadRequestForNomination<
  T extends OfferLetterUploadRequestItem,
>(
  requests: T[],
  options: {
    candidateProjectMapId?: string;
    projectId: string;
    roleCatalogId?: string | null;
  },
): T | undefined {
  const { candidateProjectMapId, projectId, roleCatalogId } = options;

  return requests.find((request) => {
    if (
      candidateProjectMapId &&
      request.candidateProjectMapId === candidateProjectMapId
    ) {
      return true;
    }

    return (
      request.projectId === projectId &&
      (request.roleCatalogId === roleCatalogId ||
        (!request.roleCatalogId && !roleCatalogId))
    );
  });
}
