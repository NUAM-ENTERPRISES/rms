import { describe, expect, it } from "vitest";
import {
  getStatusChangeTargetLabel,
  isCandidateProjectPipelineBlocked,
} from "./candidateProjectPipelineBlocked";

describe("candidateProjectPipelineBlocked", () => {
  it("detects withdrawn and on_hold as blocked", () => {
    expect(isCandidateProjectPipelineBlocked("withdrawn")).toBe(true);
    expect(isCandidateProjectPipelineBlocked("on_hold")).toBe(true);
    expect(isCandidateProjectPipelineBlocked("documents")).toBe(false);
  });

  it("maps status labels", () => {
    expect(getStatusChangeTargetLabel("on_hold")).toBe("On Hold");
    expect(getStatusChangeTargetLabel("withdrawn")).toBe("Withdrawn");
  });
});
