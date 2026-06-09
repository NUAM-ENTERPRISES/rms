import { describe, expect, it } from "vitest";
import {
  getCandidateAssignmentBlockReason,
  getProjectClosureMessage,
  isProjectDeadlineExpired,
  isProjectOpenForAssignment,
} from "./project-assignment";

describe("project-assignment", () => {
  const now = new Date(2026, 5, 1, 12, 0, 0);

  it("detects expired deadline before start of today", () => {
    const yesterday = new Date(2026, 5, 0);
    const today = new Date(2026, 5, 1);
    const tomorrow = new Date(2026, 5, 2);
    expect(isProjectDeadlineExpired(yesterday.toISOString(), now)).toBe(true);
    expect(isProjectDeadlineExpired(today.toISOString(), now)).toBe(false);
    expect(isProjectDeadlineExpired(tomorrow.toISOString(), now)).toBe(false);
    expect(isProjectDeadlineExpired(null, now)).toBe(false);
  });

  it("isProjectOpenForAssignment requires active status and non-expired deadline", () => {
    expect(
      isProjectOpenForAssignment(
        { status: "active", deadline: "2026-12-01" },
        now
      )
    ).toBe(true);
    expect(
      isProjectOpenForAssignment(
        { status: "active", deadline: "2026-05-30" },
        now
      )
    ).toBe(false);
    expect(
      isProjectOpenForAssignment(
        { status: "completed", deadline: "2026-12-01" },
        now
      )
    ).toBe(false);
  });

  it("getCandidateAssignmentBlockReason explains Call Back assignment block", () => {
    expect(getCandidateAssignmentBlockReason("Call Back")).toContain("callback");
    expect(getCandidateAssignmentBlockReason("call_back")).toContain("callback");
  });

  it("getCandidateAssignmentBlockReason explains locked RNR vs reassigned RNR", () => {
    expect(getCandidateAssignmentBlockReason("RNR")).toContain("Operations");
    expect(getCandidateAssignmentBlockReason("RNR", { isCREReassigned: true })).toContain(
      "Update status",
    );
  });

  it("getProjectClosureMessage returns user-facing copy", () => {
    expect(
      getProjectClosureMessage({ status: "active", deadline: "2026-05-30" })
    ).toContain("deadline has passed");
    expect(getProjectClosureMessage({ status: "completed" })).toContain(
      "completed"
    );
    expect(
      getProjectClosureMessage({ status: "active", deadline: "2030-01-01" })
    ).toBeNull();
  });
});
