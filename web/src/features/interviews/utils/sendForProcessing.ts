import {
  getInterviewProcessingReleaseReason,
  type ProcessingReleaseReason,
} from "../constants/sendForProcessing";

export function getInterviewCandidateId(item: {
  candidateProjectMap?: { candidate?: { id?: string } };
  candidate?: { id?: string };
}): string | undefined {
  return item.candidateProjectMap?.candidate?.id || item.candidate?.id;
}

/** Whether this interview row can be sent for processing. */
export function canSendInterviewForProcessing(
  item: {
    readyForProcessingAt?: string | null;
    candidateSentForProcessingAt?: string | null;
    candidateProjectMap?: { candidate?: { id?: string } };
    candidate?: { id?: string };
  },
  pageLookup?: CandidateSentForProcessingLookup,
): boolean {
  if (item.readyForProcessingAt) {
    return false;
  }

  if (item.candidateSentForProcessingAt) {
    return false;
  }

  const candidateId = getInterviewCandidateId(item);
  if (candidateId && pageLookup?.has(candidateId)) {
    return false;
  }

  return true;
}

/** Whether a passed interview row has already been sent for processing. */
export function isPassedInterviewSentForProcessing(
  item: Parameters<typeof canSendInterviewForProcessing>[0],
  pageLookup?: CandidateSentForProcessingLookup,
): boolean {
  return !canSendInterviewForProcessing(item, pageLookup);
}

export type CandidateSentForProcessingLookup = Map<string, string>;

function getInterviewProjectTitle(interview: {
  candidateProjectMap?: { project?: { title?: string } };
  project?: { title?: string };
}): string {
  return (
    interview.candidateProjectMap?.project?.title ||
    interview.project?.title ||
    "another project"
  );
}

export type CandidateReleasedProcessingLookup = Map<
  string,
  {
    projectTitle: string;
    releaseReason: ProcessingReleaseReason;
    projectId?: string;
  }
>;

/** Released send-for-processing on another project (hold/cancelled) within the page. */
export function buildCandidateReleasedProcessingLookup(
  interviews: Array<{
    readyForProcessingAt?: string | null;
    candidateProjectMap?: {
      candidate?: { id?: string };
      project?: { id?: string; title?: string };
      subStatus?: { name?: string };
      processing?: { processingStatus?: string };
    };
    candidate?: { id?: string };
    project?: { id?: string; title?: string };
  }>,
): CandidateReleasedProcessingLookup {
  const releasedByCandidateId: CandidateReleasedProcessingLookup = new Map();

  for (const interview of interviews) {
    const candidateId = getInterviewCandidateId(interview);
    if (!candidateId || !interview.readyForProcessingAt) {
      continue;
    }

    const releaseReason = getInterviewProcessingReleaseReason(interview);
    if (!releaseReason) {
      continue;
    }

    const projectId =
      interview.candidateProjectMap?.project?.id || interview.project?.id;
    const projectTitle = getInterviewProjectTitle(interview);

    releasedByCandidateId.set(candidateId, {
      projectId,
      projectTitle,
      releaseReason,
    });
  }

  return releasedByCandidateId;
}

export function getOtherProjectReleasedProcessingInfo(
  item: {
    readyForProcessingAt?: string | null;
    candidateOtherProjectReleasedProcessingProjectTitle?: string | null;
    candidateOtherProjectReleasedProcessingReason?: ProcessingReleaseReason | null;
    candidateProjectMap?: {
      candidate?: { id?: string };
      project?: { id?: string };
    };
    project?: { id?: string };
  },
  pageLookup?: CandidateReleasedProcessingLookup,
): { projectTitle: string; releaseReason: ProcessingReleaseReason } | null {
  if (item.readyForProcessingAt) {
    return null;
  }

  if (
    item.candidateOtherProjectReleasedProcessingProjectTitle &&
    item.candidateOtherProjectReleasedProcessingReason
  ) {
    return {
      projectTitle: item.candidateOtherProjectReleasedProcessingProjectTitle,
      releaseReason: item.candidateOtherProjectReleasedProcessingReason,
    };
  }

  const candidateId = getInterviewCandidateId(item);
  if (!candidateId || !pageLookup?.has(candidateId)) {
    return null;
  }

  const currentProjectId =
    item.candidateProjectMap?.project?.id || item.project?.id;
  const released = pageLookup.get(candidateId);
  if (!released) {
    return null;
  }

  if (
    released.projectId &&
    currentProjectId &&
    released.projectId === currentProjectId
  ) {
    return null;
  }

  return {
    projectTitle: released.projectTitle,
    releaseReason: released.releaseReason,
  };
}

/** Candidates with an active send lock on any project in the current table page. */
export function buildCandidateSentForProcessingLookup(
  interviews: Array<{
    readyForProcessingAt?: string | null;
    candidateProjectMap?: {
      candidate?: { id?: string };
      project?: { title?: string };
      subStatus?: { name?: string };
      processing?: { processingStatus?: string };
    };
    candidate?: { id?: string };
    project?: { title?: string };
  }>,
): CandidateSentForProcessingLookup {
  const sentByCandidateId = new Map<string, string>();

  for (const interview of interviews) {
    const candidateId = getInterviewCandidateId(interview);
    if (!candidateId || !interview.readyForProcessingAt) {
      continue;
    }

    if (getInterviewProcessingReleaseReason(interview)) {
      continue;
    }

    sentByCandidateId.set(candidateId, getInterviewProjectTitle(interview));
  }

  return sentByCandidateId;
}

export function getCandidateSentViaAnotherProjectTitle(
  item: {
    candidateSentForProcessingProjectTitle?: string | null;
    candidateProjectMap?: { candidate?: { id?: string } };
    candidate?: { id?: string };
  },
  pageLookup?: CandidateSentForProcessingLookup,
): string {
  const candidateId = getInterviewCandidateId(item);
  if (candidateId && pageLookup?.has(candidateId)) {
    return pageLookup.get(candidateId) ?? "another project";
  }

  return item.candidateSentForProcessingProjectTitle ?? "another project";
}

/** Hide review outcome for passed interviews already sent (this or another project). */
export function shouldHidePassedInterviewReviewOutcome(
  item: {
    outcome?: string | null;
    readyForProcessingAt?: string | null;
    candidateSentForProcessingAt?: string | null;
    candidateProjectMap?: { candidate?: { id?: string } };
    candidate?: { id?: string };
  },
  pageLookup?: CandidateSentForProcessingLookup,
): boolean {
  if (item.outcome !== "passed") {
    return false;
  }

  return (
    Boolean(item.readyForProcessingAt) ||
    isCandidateSentViaAnotherProject(item, pageLookup)
  );
}

export function isCandidateSentViaAnotherProject(
  item: {
    readyForProcessingAt?: string | null;
    candidateSentForProcessingAt?: string | null;
    candidateProjectMap?: { candidate?: { id?: string } };
    candidate?: { id?: string };
  },
  pageLookup?: CandidateSentForProcessingLookup,
): boolean {
  if (item.readyForProcessingAt) {
    return false;
  }

  return Boolean(item.candidateSentForProcessingAt) ||
    (() => {
      const candidateId = getInterviewCandidateId(item);
      return Boolean(candidateId && pageLookup?.has(candidateId));
    })();
}
