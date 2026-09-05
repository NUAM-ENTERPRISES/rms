import { describe, expect, it } from "vitest";
import { canShowAgentsAddCandidate } from "./canShowAgentsAddCandidate";

describe("canShowAgentsAddCandidate", () => {
  it("shows Add Candidate for Manager with wildcard permissions", () => {
    expect(
      canShowAgentsAddCandidate({
        permissions: ["*"],
        roles: ["Manager"],
      }),
    ).toBe(true);
  });

  it("shows Add Candidate when create:agent_candidates is granted", () => {
    expect(
      canShowAgentsAddCandidate({
        permissions: ["create:agent_candidates"],
        roles: ["Team Head"],
      }),
    ).toBe(true);
  });

  it("shows Add Candidate for recruiters with write:candidates", () => {
    expect(
      canShowAgentsAddCandidate({
        permissions: ["write:candidates"],
        roles: ["Recruitment Executive"],
      }),
    ).toBe(true);
  });

  it("hides Add Candidate for System Admin", () => {
    expect(
      canShowAgentsAddCandidate({
        permissions: ["*"],
        roles: ["System Admin"],
      }),
    ).toBe(false);
  });

  it("hides Add Candidate when the user has neither create nor write access", () => {
    expect(
      canShowAgentsAddCandidate({
        permissions: ["read:agents"],
        roles: ["Team Lead"],
      }),
    ).toBe(false);
  });
});
