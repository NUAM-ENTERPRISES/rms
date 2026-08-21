import { describe, expect, it } from "vitest";
import {
  ALL_CANDIDATES_VIEW_ROLES,
  canEditEmployeeCode,
  canUpdateProjectStatus,
  EMPLOYEE_CODE_EDIT_ROLES,
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
    expect(hasProjectCoordinatorRole(["Recruitment Executive", "Project Coordinator"])).toBe(
      true
    );
  });

  it("grants all-candidates view to Project Coordinator", () => {
    expect(hasAllCandidatesView(["Project Coordinator"])).toBe(true);
    expect(hasAllCandidatesView(["Recruitment Executive"])).toBe(false);
    expect(hasAllCandidatesView(undefined)).toBe(false);
  });

  it("defines project status update roles", () => {
    expect(PROJECT_STATUS_UPDATE_ROLES).toEqual(
      expect.arrayContaining([
        "Managing Director",
        "Director",
        "Department Head",
        "Recruitment Team Lead",
        "Admin",
        "Project Coordinator",
      ])
    );
  });

  describe("canUpdateProjectStatus", () => {
    it("allows manager and admin roles", () => {
      expect(canUpdateProjectStatus(["Department Head"])).toBe(true);
      expect(canUpdateProjectStatus(["Recruitment Team Lead"])).toBe(true);
      expect(canUpdateProjectStatus(["Admin"])).toBe(true);
      expect(canUpdateProjectStatus(["Project Coordinator"])).toBe(true);
    });

    it("denies team head and recruiter", () => {
      expect(canUpdateProjectStatus(["Team Head"])).toBe(false);
      expect(canUpdateProjectStatus(["Recruitment Executive"])).toBe(false);
    });

    it("returns false for empty or undefined roles", () => {
      expect(canUpdateProjectStatus([])).toBe(false);
      expect(canUpdateProjectStatus(undefined)).toBe(false);
    });
  });

  describe("canEditEmployeeCode", () => {
    it("allows manager, recruiter manager, and admin roles", () => {
      expect(EMPLOYEE_CODE_EDIT_ROLES).toEqual([
        "Department Head",
        "Recruitment Team Lead",
        "Admin",
      ]);
      expect(canEditEmployeeCode(["Department Head"])).toBe(true);
      expect(canEditEmployeeCode(["Recruitment Team Lead"])).toBe(true);
      expect(canEditEmployeeCode(["Admin"])).toBe(true);
      expect(canEditEmployeeCode(["Admin"])).toBe(true);
    });

    it("denies recruiter, director, and ceo", () => {
      expect(canEditEmployeeCode(["Recruitment Executive"])).toBe(false);
      expect(canEditEmployeeCode(["Director"])).toBe(false);
      expect(canEditEmployeeCode(["Managing Director"])).toBe(false);
      expect(canEditEmployeeCode(undefined)).toBe(false);
    });
  });
});
