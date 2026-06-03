import { describe, expect, it } from "vitest";
import { getAgentOrganizationLabel } from "./agent-form.utils";

describe("getAgentOrganizationLabel", () => {
  it("returns agency-specific label", () => {
    expect(getAgentOrganizationLabel("Agency")).toBe("Agent Organization Name");
  });

  it("returns sub-agent label", () => {
    expect(getAgentOrganizationLabel("Sub-Agent")).toBe("Sub Agent Organization");
  });

  it("returns generic label for other types", () => {
    expect(getAgentOrganizationLabel("Freelancer")).toBe("Organization Name");
    expect(getAgentOrganizationLabel("")).toBe("Organization Name");
  });
});
