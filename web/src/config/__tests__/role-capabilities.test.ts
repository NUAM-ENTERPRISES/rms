import { describe, expect, it } from "vitest";
import {
  ALL_CANDIDATES_VIEW_ROLES,
  canUpdateProjectStatus,
  hasAllCandidatesView,
  hasProjectCoordinatorRole,
  isProjectCoordinatorRole,
  PROJECT_COORDINATOR_ROLE,
  PROJECT_STATUS_UPDATE_ROLES,
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

  it("defines project status update roles", () => {
    expect(PROJECT_STATUS_UPDATE_ROLES).toEqual(
      expect.arrayContaining([
        "CEO",
        "Director",
        "Manager",
        "Recruiter Manager",
        "System Admin",
        "Admin",
        "Project Coordinator",
      ])
    );
  });

  describe("canUpdateProjectStatus", () => {
    it("allows manager and admin roles", () => {
      expect(canUpdateProjectStatus(["Manager"])).toBe(true);
      expect(canUpdateProjectStatus(["Recruiter Manager"])).toBe(true);
      expect(canUpdateProjectStatus(["System Admin"])).toBe(true);
      expect(canUpdateProjectStatus(["Project Coordinator"])).toBe(true);
    });

    it("denies team head and recruiter", () => {
      expect(canUpdateProjectStatus(["Team Head"])).toBe(false);
      expect(canUpdateProjectStatus(["Recruiter"])).toBe(false);
    });

    it("returns false for empty or undefined roles", () => {
      expect(canUpdateProjectStatus([])).toBe(false);
      expect(canUpdateProjectStatus(undefined)).toBe(false);
    });
  });
});
