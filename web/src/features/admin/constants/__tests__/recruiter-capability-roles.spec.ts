import { describe, expect, it } from "vitest";
import { roleNameHasRecruiterCapabilities } from "../recruiter-capability-roles";

describe("roleNameHasRecruiterCapabilities", () => {
  it("matches Recruiter, Recruitment Executive, and Recruitment Lead", () => {
    expect(roleNameHasRecruiterCapabilities("Recruiter")).toBe(true);
    expect(roleNameHasRecruiterCapabilities("Recruitment Executive")).toBe(true);
    expect(roleNameHasRecruiterCapabilities("Recruitment Lead")).toBe(true);
  });

  it("does not match other roles", () => {
    expect(roleNameHasRecruiterCapabilities("Manager")).toBe(false);
    expect(roleNameHasRecruiterCapabilities("Recruitment Team Lead")).toBe(
      false,
    );
  });
});
