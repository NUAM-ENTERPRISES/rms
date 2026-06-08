/** Nomination stages where offer letter upload is allowed (interview passed or later). */
export const OFFER_LETTER_UPLOAD_ELIGIBLE_SUB_STATUSES = [
  "interview_passed",
  "transfered_to_processing",
  "processing_in_progress",
  "processing_completed",
  "processing_failed",
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

export function canUserUploadOfferLetter(options: {
  isRecruiter: boolean;
  isInterviewCoordinator: boolean;
  canUploadDocuments: boolean;
  canWriteCandidates: boolean;
  canUploadInterviews: boolean;
  subStatusName?: string | null;
  /** When true, skip nomination sub-status check (e.g. interview-passed list views). */
  assumeInterviewPassed?: boolean;
}): boolean {
  const {
    isRecruiter,
    isInterviewCoordinator,
    canUploadDocuments,
    canWriteCandidates,
    canUploadInterviews,
    subStatusName,
    assumeInterviewPassed = false,
  } = options;

  const hasPermission =
    canUploadDocuments ||
    canWriteCandidates ||
    isRecruiter ||
    (isInterviewCoordinator && canUploadInterviews);

  if (!hasPermission) return false;

  if (assumeInterviewPassed) return true;

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

export type OfferLetterInterviewItem = {
  id?: string;
  isOfferLetterUploaded?: boolean;
  offerLetterData?: {
    document?: {
      fileUrl?: string;
      uploadedByUser?: { name?: string; email?: string } | null;
    };
  } | null;
  candidateProjectMap?: {
    candidate?: { id?: string };
    project?: { id?: string };
    roleNeeded?: {
      roleCatalogId?: string;
      roleCatalog?: { id?: string };
    };
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
