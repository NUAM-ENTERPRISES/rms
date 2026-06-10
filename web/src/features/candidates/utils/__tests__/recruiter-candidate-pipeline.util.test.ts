import { describe, expect, it } from "vitest";
import {
  canRecruiterManageCandidatePipeline,
  isRecruiterLockedRnrCandidate,
} from "../recruiter-candidate-pipeline.util";

describe("recruiter-candidate-pipeline.util", () => {
  it("locks RNR candidates until Operations reassigns them", () => {
    const locked = {
      currentStatus: { statusName: "RNR" },
      isCREReassigned: false,
    };

    expect(isRecruiterLockedRnrCandidate(locked)).toBe(true);
    expect(canRecruiterManageCandidatePipeline(locked)).toBe(false);
  });

  it("unlocks RNR candidates after cre_reassigned handoff", () => {
    const unlocked = {
      currentStatus: { statusName: "RNR" },
      isCREReassigned: true,
    };

    expect(isRecruiterLockedRnrCandidate(unlocked)).toBe(false);
    expect(canRecruiterManageCandidatePipeline(unlocked)).toBe(true);
  });

  it("does not lock non-RNR candidates", () => {
    const interested = {
      currentStatus: { statusName: "Interested" },
      isCREReassigned: false,
    };

    expect(isRecruiterLockedRnrCandidate(interested)).toBe(false);
    expect(canRecruiterManageCandidatePipeline(interested)).toBe(true);
  });
});
