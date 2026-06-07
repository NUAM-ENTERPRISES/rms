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
