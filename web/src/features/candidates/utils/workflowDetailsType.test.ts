import { describe, expect, it } from "vitest";
import {
  getWorkflowDetailsPageLabel,
  resolveWorkflowDetailsMainStatus,
} from "./workflowDetailsType";

describe("workflowDetailsType", () => {
  it("maps overview workflow types to project main status", () => {
    expect(resolveWorkflowDetailsMainStatus("profile_shortlisting")).toBe("nominated");
    expect(resolveWorkflowDetailsMainStatus("nominated")).toBe("nominated");
    expect(resolveWorkflowDetailsMainStatus("project_on_hold")).toBe("on_hold");
    expect(resolveWorkflowDetailsMainStatus("project_withdrawn")).toBe("withdrawn");
    expect(resolveWorkflowDetailsMainStatus(undefined)).toBeUndefined();
  });

  it("returns page labels for workflow types", () => {
    expect(getWorkflowDetailsPageLabel("project_on_hold")).toBe("Project On Hold");
    expect(getWorkflowDetailsPageLabel("project_withdrawn")).toBe("Project Withdrawn");
    expect(getWorkflowDetailsPageLabel("profile_shortlisting")).toBe("Profile Shortlisting");
  });
});
