import { describe, expect, it } from "vitest";
import { shouldShowDashboardWelcomeHeader } from "../DashboardWelcomeHeader";

describe("shouldShowDashboardWelcomeHeader", () => {
  it("shows only on home dashboard routes for admin-panel roles", () => {
    const roles = ["System Admin"];
    expect(shouldShowDashboardWelcomeHeader("/", roles)).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/dashboard", roles)).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/interviews", roles)).toBe(false);
    expect(shouldShowDashboardWelcomeHeader("/processing-dashboard", roles)).toBe(
      false,
    );
    expect(shouldShowDashboardWelcomeHeader("/documents/verification", roles)).toBe(
      false,
    );
    expect(shouldShowDashboardWelcomeHeader("/screenings", roles)).toBe(false);
    expect(shouldShowDashboardWelcomeHeader("/processing-admin", roles)).toBe(false);
  });

  it("shows on /dashboard for manager and recruiter manager", () => {
    expect(shouldShowDashboardWelcomeHeader("/dashboard", ["Manager"])).toBe(true);
    expect(
      shouldShowDashboardWelcomeHeader("/dashboard", ["Recruiter Manager"]),
    ).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/interviews", ["Manager"])).toBe(
      false,
    );
  });

  it("shows on /interviews for interview coordinator home only", () => {
    const roles = ["Interview Coordinator"];
    expect(shouldShowDashboardWelcomeHeader("/interviews", roles)).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/interviews/list", roles)).toBe(false);
  });

  it("shows on recruiter candidate overview paths", () => {
    const roles = ["Recruiter"];
    expect(shouldShowDashboardWelcomeHeader("/", roles)).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/candidates/overview", roles)).toBe(
      true,
    );
    expect(shouldShowDashboardWelcomeHeader("/interviews", roles)).toBe(false);
  });

  it("shows on processing-dashboard for processing executive", () => {
    const roles = ["Processing Executive"];
    expect(shouldShowDashboardWelcomeHeader("/processing-dashboard", roles)).toBe(
      true,
    );
    expect(shouldShowDashboardWelcomeHeader("/processing-dashboard", ["Manager"])).toBe(
      false,
    );
  });

  it("shows on processing-admin for processing manager home only", () => {
    const roles = ["Processing Manager"];
    expect(shouldShowDashboardWelcomeHeader("/processing-admin", roles)).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/processing-dashboard", roles)).toBe(
      false,
    );
    expect(shouldShowDashboardWelcomeHeader("/interviews", roles)).toBe(false);
  });

  it("shows on candidate overview for recruiter manager", () => {
    const roles = ["Recruiter Manager"];
    expect(shouldShowDashboardWelcomeHeader("/candidates/overview", roles)).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/interviews", roles)).toBe(false);
  });

  it("shows on project coordinator home paths only", () => {
    const roles = ["Project Coordinator"];
    expect(
      shouldShowDashboardWelcomeHeader("/project-coordinator/dashboard", roles)
    ).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/", roles)).toBe(true);
    expect(shouldShowDashboardWelcomeHeader("/clients", roles)).toBe(false);
    expect(shouldShowDashboardWelcomeHeader("/candidates", roles)).toBe(false);
  });
});
