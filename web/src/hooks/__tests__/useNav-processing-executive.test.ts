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

  it("shows Projects for Interview Coordinator", () => {
    const projects = navigationConfig.find((item) => item.id === "projects");

    expect(projects?.roles).toContain("Interview Coordinator");
    expect(projects?.hiddenForRoles).toBeUndefined();
  });
});
