import { describe, expect, it } from "vitest";
import {
  buildCandidateSentForProcessingLookup,
  canSendInterviewForProcessing,
  getCandidateSentViaAnotherProjectTitle,
  isCandidateSentViaAnotherProject,
  isPassedInterviewSentForProcessing,
  shouldHidePassedInterviewReviewOutcome,
} from "./sendForProcessing";

describe("sendForProcessing utils", () => {
  it("blocks send when candidate already sent on another project", () => {
    const lookup = buildCandidateSentForProcessingLookup([
      {
        readyForProcessingAt: "2026-06-01T10:00:00.000Z",
        candidateProjectMap: {
          candidate: { id: "cand-1" },
          project: { title: "ICU Project" },
        },
      },
    ]);

    expect(
      canSendInterviewForProcessing(
        {
          readyForProcessingAt: null,
          candidateProjectMap: { candidate: { id: "cand-1" } },
        },
        lookup,
      ),
    ).toBe(false);
  });

  it("flags passed interviews already sent for processing", () => {
    expect(
      isPassedInterviewSentForProcessing({
        readyForProcessingAt: "2026-06-02T10:00:00.000Z",
        candidateProjectMap: { candidate: { id: "cand-1" } },
      }),
    ).toBe(true);

    expect(
      isPassedInterviewSentForProcessing({
        readyForProcessingAt: null,
        candidateSentForProcessingAt: null,
        candidateProjectMap: { candidate: { id: "cand-2" } },
      }),
    ).toBe(false);
  });

  it("allows send when candidate has not been sent yet", () => {
    expect(
      canSendInterviewForProcessing({
        readyForProcessingAt: null,
        candidateSentForProcessingAt: null,
        candidateProjectMap: { candidate: { id: "cand-2" } },
      }),
    ).toBe(true);
  });

  it("flags rows sent via another project", () => {
    expect(
      isCandidateSentViaAnotherProject({
        readyForProcessingAt: null,
        candidateSentForProcessingAt: "2026-06-02T10:00:00.000Z",
        candidateProjectMap: { candidate: { id: "cand-1" } },
      }),
    ).toBe(true);
  });

  it("returns project title from page lookup when available", () => {
    const lookup = buildCandidateSentForProcessingLookup([
      {
        readyForProcessingAt: "2026-06-01T10:00:00.000Z",
        candidateProjectMap: {
          candidate: { id: "cand-1" },
          project: { title: "ER Project" },
        },
      },
    ]);

    expect(
      getCandidateSentViaAnotherProjectTitle(
        {
          candidateProjectMap: { candidate: { id: "cand-1" } },
        },
        lookup,
      ),
    ).toBe("ER Project");
  });

  it("hides review outcome when candidate was sent via another project", () => {
    expect(
      shouldHidePassedInterviewReviewOutcome({
        outcome: "passed",
        readyForProcessingAt: null,
        candidateSentForProcessingAt: "2026-06-02T10:00:00.000Z",
        candidateProjectMap: { candidate: { id: "cand-1" } },
      }),
    ).toBe(true);
  });

  it("shows review outcome for passed interviews not yet sent", () => {
    expect(
      shouldHidePassedInterviewReviewOutcome({
        outcome: "passed",
        readyForProcessingAt: null,
        candidateSentForProcessingAt: null,
        candidateProjectMap: { candidate: { id: "cand-2" } },
      }),
    ).toBe(false);
  });

  it("returns project title from API field when page lookup is unavailable", () => {
    expect(
      getCandidateSentViaAnotherProjectTitle({
        candidateSentForProcessingProjectTitle: "OT Project",
        candidateProjectMap: { candidate: { id: "cand-1" } },
      }),
    ).toBe("OT Project");
  });
});
