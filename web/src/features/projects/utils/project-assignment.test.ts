import { ProjectStatus } from "@/entities/project/constants";
import { describe, expect, it } from "vitest";
import {
  getCandidateAssignmentBlockReason,
  getProjectClosureMessage,
  getProjectDeadlineNoticeMessage,
  isProjectDeadlineExpired,
  isProjectOpenForAssignment,
  isProjectOpenForPipelineActions,
  resolveProjectGateStatus,
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

  it("resolveProjectGateStatus normalizes API enum and legacy values", () => {
    expect(resolveProjectGateStatus("IN_PROGRESS")).toBe(ProjectStatus.IN_PROGRESS);
    expect(resolveProjectGateStatus("in_progress")).toBe(ProjectStatus.IN_PROGRESS);
    expect(resolveProjectGateStatus("active")).toBe(ProjectStatus.IN_PROGRESS);
    expect(resolveProjectGateStatus("ON_HOLD")).toBe(ProjectStatus.ON_HOLD);
    expect(resolveProjectGateStatus("COMPLETED")).toBe(ProjectStatus.COMPLETED);
    expect(resolveProjectGateStatus("CANCELLED")).toBe(ProjectStatus.CANCELLED);
    expect(resolveProjectGateStatus("inactive")).toBe(ProjectStatus.CANCELLED);
  });

  it("isProjectOpenForAssignment requires in-progress status only", () => {
    expect(
      isProjectOpenForAssignment(
        { status: ProjectStatus.IN_PROGRESS, deadline: "2026-12-01" }
      )
    ).toBe(true);
    expect(
      isProjectOpenForAssignment(
        { status: "IN_PROGRESS", deadline: "2026-12-01" }
      )
    ).toBe(true);
    expect(
      isProjectOpenForAssignment(
        { status: ProjectStatus.IN_PROGRESS, deadline: "2026-05-30" }
      )
    ).toBe(true);
    expect(
      isProjectOpenForAssignment(
        { status: ProjectStatus.COMPLETED, deadline: "2026-12-01" }
      )
    ).toBe(false);
    expect(
      isProjectOpenForAssignment(
        { status: "ON_HOLD", deadline: "2026-12-01" }
      )
    ).toBe(false);
  });

  it("isProjectOpenForPipelineActions is an alias for assignment gate", () => {
    expect(isProjectOpenForPipelineActions).toBe(isProjectOpenForAssignment);
  });

  it("getCandidateAssignmentBlockReason explains Call Back assignment block", () => {
    expect(getCandidateAssignmentBlockReason("Call Back")).toContain("callback");
    expect(getCandidateAssignmentBlockReason("call_back")).toContain("callback");
  });

  it("getProjectClosureMessage returns pipeline-closed copy by status", () => {
    expect(
      getProjectClosureMessage({ status: ProjectStatus.IN_PROGRESS, deadline: "2026-05-30" })
    ).toBeNull();
    expect(getProjectClosureMessage({ status: ProjectStatus.COMPLETED })).toBe(
      "This project is completed. The pipeline to this project is closed."
    );
    expect(getProjectClosureMessage({ status: "CANCELLED" })).toBe(
      "This project is cancelled. The pipeline to this project is closed."
    );
    expect(getProjectClosureMessage({ status: "ON_HOLD" })).toBe(
      "This project is on hold. The pipeline to this project is closed."
    );
    expect(
      getProjectClosureMessage({ status: ProjectStatus.IN_PROGRESS, deadline: "2030-01-01" })
    ).toBeNull();
  });

  it("getProjectDeadlineNoticeMessage returns notice for expired in-progress project", () => {
    expect(
      getProjectDeadlineNoticeMessage(
        { status: ProjectStatus.IN_PROGRESS, deadline: "2026-05-30" },
        now
      )
    ).toBe("Project deadline has passed.");
    expect(
      getProjectDeadlineNoticeMessage(
        { status: ProjectStatus.IN_PROGRESS, deadline: "2030-01-01" },
        now
      )
    ).toBeNull();
    expect(
      getProjectDeadlineNoticeMessage(
        { status: ProjectStatus.COMPLETED, deadline: "2026-05-30" },
        now
      )
    ).toBeNull();
  });
});
