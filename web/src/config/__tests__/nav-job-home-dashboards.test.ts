import { describe, expect, it } from "vitest";
import { navigationConfig } from "@/config/nav";

const JOB_HOME_DASHBOARD_IDS = [
  "project-coordinator-dashboard",
  "dashboard",
  "documentation-dashboard",
  "processing-dashboard",
  "recruiter-dashboard",
  "agent-coordinator-dashboard",
  "interviews-dashboard-top",
  "screenings-dashboard-top",
];

describe("navigationConfig job-home dashboards", () => {
  it("keeps specialist homes role-only so wildcard users do not see duplicate Dashboard items", () => {
    for (const id of JOB_HOME_DASHBOARD_IDS) {
      const item = navigationConfig.find((navItem) => navItem.id === id);
      expect(item, id).toBeDefined();
      expect(item?.label).toBe("Dashboard");
      expect(item?.roles?.length).toBeGreaterThan(0);
      expect(item?.permissions, id).toBeUndefined();
    }
  });

  it("lets custom roles open the admin home with read:admin-dashboard", () => {
    const adminHome = navigationConfig.find((item) => item.id === "admin-dashboard");

    expect(adminHome).toMatchObject({
      label: "Dashboard",
      permissions: ["read:admin-dashboard"],
    });
  });
});
