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
  pageLookup?: Set<string>,
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

/** Candidates already sent on any project in the current table page. */
export function buildCandidateSentForProcessingLookup(
  interviews: Array<{
    readyForProcessingAt?: string | null;
    candidateProjectMap?: { candidate?: { id?: string } };
    candidate?: { id?: string };
  }>,
): Set<string> {
  const sentCandidateIds = new Set<string>();

  for (const interview of interviews) {
    const candidateId = getInterviewCandidateId(interview);
    if (candidateId && interview.readyForProcessingAt) {
      sentCandidateIds.add(candidateId);
    }
  }

  return sentCandidateIds;
}

export function isCandidateSentViaAnotherProject(
  item: {
    readyForProcessingAt?: string | null;
    candidateSentForProcessingAt?: string | null;
    candidateProjectMap?: { candidate?: { id?: string } };
    candidate?: { id?: string };
  },
  pageLookup?: Set<string>,
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
