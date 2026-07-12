export const INTERVIEWS_SHORTLIST_PENDING_FILTER = "shortlistPending";
export const INTERVIEWS_INTERVIEW_PASSED_FILTER = "interviewPassed";

export function parseSearchFromLink(link: string): string | undefined {
  const queryIndex = link.indexOf("?");
  if (queryIndex === -1) return undefined;

  const search = new URLSearchParams(link.slice(queryIndex + 1)).get("search");
  return search?.trim() ? search.trim() : undefined;
}

export function buildInterviewsPagePath(
  filter: string,
  search?: string,
): string {
  const params = new URLSearchParams();
  params.set("filter", filter);
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  return `/interviews?${params.toString()}`;
}

export function isInterviewsListLink(link: string): boolean {
  if (link === "/interviews" || link.startsWith("/interviews?")) {
    return true;
  }

  return (
    link.startsWith("/interviews/shortlist-pending") ||
    link.startsWith("/interviews/shortlisting") ||
    link.startsWith("/interviews/shortlisted") ||
    link.startsWith("/interviews/not-shortlisted")
  );
}

export function resolveInterviewsShortlistPendingPath(
  link?: string | null,
  meta?: Record<string, unknown> | null,
): string {
  const candidateName =
    typeof meta?.candidateName === "string" ? meta.candidateName : undefined;
  const search =
    candidateName ?? (link ? parseSearchFromLink(link) : undefined);

  return buildInterviewsPagePath(INTERVIEWS_SHORTLIST_PENDING_FILTER, search);
}

export function buildInterviewPassedHighlightPath(params: {
  candidateId: string;
  candidateName?: string;
  projectId?: string;
}): string {
  const urlParams = new URLSearchParams();
  urlParams.set("filter", INTERVIEWS_INTERVIEW_PASSED_FILTER);

  if (params.candidateName?.trim()) {
    urlParams.set("search", params.candidateName.trim());
  }

  urlParams.set("highlightCandidateId", params.candidateId);

  if (params.projectId) {
    urlParams.set("highlightProjectId", params.projectId);
  }

  return `/interviews?${urlParams.toString()}`;
}
