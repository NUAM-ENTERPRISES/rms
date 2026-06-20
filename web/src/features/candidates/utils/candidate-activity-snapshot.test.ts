import { describe, expect, it } from "vitest";
import type { Candidate, CandidateActivitySnapshot } from "../api";

/** Mirrors CandidateDetailPage: Pipeline Activity uses embedded snapshot only. */
function activityStatsFromCandidate(
  candidate: Candidate | undefined
): CandidateActivitySnapshot | undefined {
  return candidate?.activitySnapshot;
}

const mockSnapshot: CandidateActivitySnapshot = {
  projectsAssigned: 2,
  inDocumentation: 1,
  inInterview: 0,
  processingOrDeployed: 1,
  offersInPipeline: 0,
  placements: 0,
  verifiedDocuments: 3,
  pendingDocuments: 1,
  profileCompletion: 72,
  pipelineUpdates: 4,
};

describe("activitySnapshot from GET /candidates/:id", () => {
  it("exposes backend snapshot for Pipeline Activity without client aggregation", () => {
    const candidate = {
      id: "c1",
      activitySnapshot: mockSnapshot,
    } as Candidate;

    const stats = activityStatsFromCandidate(candidate);

    expect(stats).toEqual(mockSnapshot);
    expect(stats?.verifiedDocuments).toBe(3);
    expect(stats?.pipelineUpdates).toBe(4);
  });

  it("returns undefined when snapshot is absent", () => {
    expect(activityStatsFromCandidate({ id: "c1" } as Candidate)).toBeUndefined();
    expect(activityStatsFromCandidate(undefined)).toBeUndefined();
  });
});
