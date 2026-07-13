import { describe, expect, it } from "vitest";
import {
  CANDIDATE_OVERVIEW_TAG,
  getCandidateOverviewInvalidationTags,
} from "./candidateOverviewInvalidation";

describe("candidateOverviewInvalidation", () => {
  it("returns overview cache tags for invalidation", () => {
    expect(getCandidateOverviewInvalidationTags()).toEqual([
      CANDIDATE_OVERVIEW_TAG,
      "Candidate",
    ]);
  });
});
