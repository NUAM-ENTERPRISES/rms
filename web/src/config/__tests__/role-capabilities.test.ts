import { describe, expect, it } from "vitest";
import {
  ALL_CANDIDATES_VIEW_ROLES,
  hasAllCandidatesView,
  hasProjectCoordinatorRole,
  isProjectCoordinatorRole,
  PROJECT_COORDINATOR_ROLE,
} from "../role-capabilities";

describe("role-capabilities", () => {
  it("defines Project Coordinator role constant", () => {
    expect(PROJECT_COORDINATOR_ROLE).toBe("Project Coordinator");
  });

  it("includes Project Coordinator in all-candidates view roles", () => {
    expect(ALL_CANDIDATES_VIEW_ROLES).toContain("Project Coordinator");
  });

  it("detects Project Coordinator role", () => {
    expect(isProjectCoordinatorRole("Project Coordinator")).toBe(true);
    expect(hasProjectCoordinatorRole(["Recruiter", "Project Coordinator"])).toBe(
      true
    );
  });

  it("grants all-candidates view to Project Coordinator", () => {
    expect(hasAllCandidatesView(["Project Coordinator"])).toBe(true);
    expect(hasAllCandidatesView(["Recruiter"])).toBe(false);
    expect(hasAllCandidatesView(undefined)).toBe(false);
  });
});
