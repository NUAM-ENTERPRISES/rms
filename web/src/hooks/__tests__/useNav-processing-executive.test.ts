import { describe, expect, it } from "vitest";
import { navigationConfig } from "@/config/nav";

describe("useNav processing executive behavior", () => {
  it("hides Candidates parent for processing roles", () => {
    const candidates = navigationConfig.find((item) => item.id === "candidates");

    expect(candidates?.hiddenForRoles).toEqual(
      expect.arrayContaining([
        "Processing Executive",
        "Processing Manager",
        "Interview Coordinator",
        "Screening Trainer",
      ]),
    );
  });

  it("hides Projects and Administration from Interview Coordinator", () => {
    const projects = navigationConfig.find((item) => item.id === "projects");
    const admin = navigationConfig.find((item) => item.id === "admin");

    expect(projects?.roles).not.toContain("Interview Coordinator");
    expect(projects?.hiddenForRoles).toEqual(
      expect.arrayContaining(["Interview Coordinator"]),
    );
    expect(admin?.hiddenForRoles).toEqual(
      expect.arrayContaining(["Interview Coordinator"]),
    );
  });
});
