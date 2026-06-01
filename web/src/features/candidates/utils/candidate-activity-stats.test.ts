import { describe, expect, it } from "vitest";
import { computeCandidateActivityStats } from "./candidate-activity-stats";

describe("computeCandidateActivityStats", () => {
  it("counts project stages and verified documents from live data shapes", () => {
    const stats = computeCandidateActivityStats({
      projects: [
        {
          id: "1",
          candidate: { id: "c1", firstName: "A", lastName: "B" },
          project: { id: "p1", title: "Project 1" },
          currentProjectStatus: { statusName: "documents_verified" },
        },
        {
          id: "2",
          candidate: { id: "c1", firstName: "A", lastName: "B" },
          project: { id: "p2", title: "Project 2" },
          currentProjectStatus: { statusName: "interview_scheduled" },
        },
        {
          id: "3",
          candidate: { id: "c1", firstName: "A", lastName: "B" },
          project: { id: "p3", title: "Project 3" },
          currentProjectStatus: { statusName: "processing_medical" },
        },
      ] as any,
      projectsTotal: 3,
      documents: [
        { id: "d1", status: "verified" },
        { id: "d2", status: "pending" },
      ] as any,
      documentsTotal: 2,
      pipelineSteps: 5,
      profileCompletion: 82,
    });

    expect(stats.projectsAssigned).toBe(3);
    expect(stats.inDocumentation).toBe(1);
    expect(stats.inInterview).toBe(1);
    expect(stats.processingOrDeployed).toBe(1);
    expect(stats.offersInPipeline).toBe(0);
    expect(stats.placements).toBe(0);
    expect(stats.verifiedDocuments).toBe(1);
    expect(stats.pendingDocuments).toBe(1);
    expect(stats.profileCompletion).toBe(82);
    expect(stats.pipelineUpdates).toBe(5);
  });
});
