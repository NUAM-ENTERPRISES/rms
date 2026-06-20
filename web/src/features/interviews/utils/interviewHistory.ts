type HistoryLike = {
  id: string;
  interviewId?: string;
  status?: string;
  statusSnapshot?: string;
  statusAt?: string;
  previousStatus?: string | null;
  reason?: string;
  changedByName?: string;
  changedBy?: { name?: string };
};

type InterviewLike = {
  id: string;
  readyForProcessingAt?: string | null;
  outcome?: string | null;
  candidateProjectMap?: { project?: { title?: string } };
  project?: { title?: string };
  readyForProcessingBy?: { name?: string } | null;
};

function pickActorName(item?: HistoryLike): string | undefined {
  return item?.changedByName?.trim() || item?.changedBy?.name?.trim() || undefined;
}

function resolveSentForProcessingActor(
  items: HistoryLike[],
  interview?: InterviewLike | null,
): { name: string } | null {
  const fromInterview = interview?.readyForProcessingBy?.name?.trim();
  if (fromInterview) {
    return { name: fromInterview };
  }

  const sentAt = interview?.readyForProcessingAt
    ? new Date(interview.readyForProcessingAt).getTime()
    : null;

  const actorCandidates = items.filter(
    (item) =>
      item.status !== "sent_for_processing" &&
      (item.status === "passed" || item.status === "completed") &&
      pickActorName(item),
  );

  if (sentAt && actorCandidates.length > 0) {
    const closest = actorCandidates
      .map((item) => ({
        item,
        delta: Math.abs(new Date(item.statusAt ?? 0).getTime() - sentAt),
      }))
      .sort((a, b) => a.delta - b.delta)[0];

    const closestName = closest ? pickActorName(closest.item) : undefined;
    if (closestName && closest.delta <= 30 * 60 * 1000) {
      return { name: closestName };
    }
  }

  const passed = actorCandidates.find((item) => item.status === "passed");
  const passedName = passed ? pickActorName(passed) : undefined;
  if (passedName) {
    return { name: passedName };
  }

  const completed = actorCandidates.find((item) => item.status === "completed");
  const completedName = completed ? pickActorName(completed) : undefined;
  if (completedName) {
    return { name: completedName };
  }

  const anyActor = items.find(
    (item) => item.status !== "sent_for_processing" && pickActorName(item),
  );
  const anyName = anyActor ? pickActorName(anyActor) : undefined;
  return anyName ? { name: anyName } : null;
}

function enrichSentForProcessingActor(
  items: HistoryLike[],
  actor?: { name?: string } | null,
): HistoryLike[] {
  const actorName = actor?.name?.trim();
  if (!actorName) {
    return items;
  }

  return items.map((item) => {
    if (item.status !== "sent_for_processing") {
      return item;
    }
    if (item.changedByName?.trim() || item.changedBy?.name?.trim()) {
      return item;
    }

    return {
      ...item,
      changedByName: actorName,
      changedBy: item.changedBy ?? actor,
    };
  });
}

export function mergeSentForProcessingHistoryItem(
  items: HistoryLike[],
  interview?: InterviewLike | null,
): HistoryLike[] {
  const actor = resolveSentForProcessingActor(items, interview);
  const enrichedItems = enrichSentForProcessingActor(items, actor);

  if (!interview?.readyForProcessingAt) {
    return enrichedItems;
  }

  const hasEntry = enrichedItems.some(
    (entry) =>
      entry.status === "sent_for_processing" &&
      (entry.interviewId === interview.id || entry.interviewId == null),
  );
  if (hasEntry) {
    return enrichedItems;
  }

  const projectTitle =
    interview.candidateProjectMap?.project?.title ||
    interview.project?.title ||
    "project";

  const synthetic: HistoryLike = {
    id: `sent-for-processing-${interview.id}`,
    interviewId: interview.id,
    status: "sent_for_processing",
    statusSnapshot: "Sent for Processing",
    statusAt: interview.readyForProcessingAt,
    previousStatus: interview.outcome ?? "passed",
    reason: `Sent for processing on ${projectTitle} project`,
    changedByName: actor?.name,
    changedBy: actor ?? undefined,
  };

  return [...enrichedItems, synthetic].sort(
    (a, b) =>
      new Date(b.statusAt ?? 0).getTime() - new Date(a.statusAt ?? 0).getTime(),
  );
}
