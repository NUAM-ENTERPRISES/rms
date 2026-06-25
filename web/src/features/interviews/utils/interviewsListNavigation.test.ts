import { describe, expect, it } from "vitest";
import {
  buildInterviewsPagePath,
  isInterviewsListLink,
  resolveInterviewsShortlistPendingPath,
} from "./interviewsListNavigation";

describe("interviewsListNavigation", () => {
  it("builds interviews page path with filter and search", () => {
    expect(buildInterviewsPagePath("shortlistPending", "Siva MB")).toBe(
      "/interviews?filter=shortlistPending&search=Siva+MB",
    );
  });

  it("detects interview list links", () => {
    expect(isInterviewsListLink("/interviews/shortlist-pending?search=test")).toBe(
      true,
    );
    expect(isInterviewsListLink("/interviews/detail/abc")).toBe(false);
  });

  it("resolves shortlist pending path from legacy notification link", () => {
    expect(
      resolveInterviewsShortlistPendingPath(
        "/interviews/shortlist-pending?search=Siva%20MB",
        { candidateId: "cand-1" },
      ),
    ).toBe("/interviews?filter=shortlistPending&search=Siva+MB");
  });
});
