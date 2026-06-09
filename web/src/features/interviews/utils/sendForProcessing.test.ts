import { describe, expect, it } from "vitest";
import {
  buildCandidateSentForProcessingLookup,
  canSendInterviewForProcessing,
  isCandidateSentViaAnotherProject,
} from "./sendForProcessing";

describe("sendForProcessing utils", () => {
  it("blocks send when candidate already sent on another project", () => {
    const lookup = buildCandidateSentForProcessingLookup([
      {
        readyForProcessingAt: "2026-06-01T10:00:00.000Z",
        candidateProjectMap: { candidate: { id: "cand-1" } },
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
});
