import { describe, expect, it } from "vitest";
import { roleNameHasRecruiterCapabilities } from "../recruiter-capability-roles";

describe("roleNameHasRecruiterCapabilities", () => {
  it("matches Recruiter and Recruitment Executive", () => {
    expect(roleNameHasRecruiterCapabilities("Recruiter")).toBe(true);
    expect(roleNameHasRecruiterCapabilities("Recruitment Executive")).toBe(true);
    expect(roleNameHasRecruiterCapabilities("recruitment executive")).toBe(true);
  });

  it("does not match other roles", () => {
    expect(roleNameHasRecruiterCapabilities("Manager")).toBe(false);
    expect(roleNameHasRecruiterCapabilities("Recruitment Team Lead")).toBe(
      false,
    );
  });
});
