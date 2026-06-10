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

/** Candidates already sent on any project in the current table page. */
export function buildCandidateSentForProcessingLookup(
  interviews: Array<{
    readyForProcessingAt?: string | null;
    candidateProjectMap?: {
      candidate?: { id?: string };
      project?: { title?: string };
    };
    candidate?: { id?: string };
    project?: { title?: string };
  }>,
): CandidateSentForProcessingLookup {
  const sentByCandidateId = new Map<string, string>();

  for (const interview of interviews) {
    const candidateId = getInterviewCandidateId(interview);
    if (candidateId && interview.readyForProcessingAt) {
      sentByCandidateId.set(candidateId, getInterviewProjectTitle(interview));
    }
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
