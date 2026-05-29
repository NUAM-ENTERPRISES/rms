import { describe, expect, it } from "vitest";
import {
  CANDIDATE_PIPELINE_STATUS_CONFIG,
  getCandidatePipelineStatusConfig,
  normalizeCandidateStatusKey,
} from "./candidatePipelineStatusConfig";

describe("candidatePipelineStatusConfig", () => {
  it("assigns a unique icon component per primary status", () => {
    const primaryKeys = [
      "untouched",
      "interested",
      "not interested",
      "not eligible",
      "other enquiry",
      "future",
      "on hold",
      "rnr",
      "qualified",
      "working",
      "deployed",
      "selected",
      "rejected",
      "shortlisted",
      "interviewed",
      "offered",
      "placed",
      "withdrawn",
      "backout",
    ] as const;

    const icons = primaryKeys.map(
      (key) => CANDIDATE_PIPELINE_STATUS_CONFIG[key].icon
    );
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });

  it("normalizes underscore status names", () => {
    expect(normalizeCandidateStatusKey("on_hold")).toBe("on hold");
    expect(normalizeCandidateStatusKey("NOT_INTERESTED")).toBe(
      "not interested"
    );
  });

  it("resolves deployed and on_hold aliases", () => {
    expect(getCandidatePipelineStatusConfig("deployed").description).toBe(
      "Successfully deployed"
    );
    expect(getCandidatePipelineStatusConfig("on_hold").icon).toBe(
      getCandidatePipelineStatusConfig("on hold").icon
    );
  });
});
