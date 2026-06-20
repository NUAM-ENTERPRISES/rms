import { describe, expect, it } from "vitest";
import {
  agentFormFieldsToPayload,
  getAgentOrganizationLabel,
} from "./agent-form.utils";

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

describe("agentFormFieldsToPayload", () => {
  it("includes optional location when provided", () => {
    expect(
      agentFormFieldsToPayload({
        name: "Jane Agent",
        email: "",
        mobileNumber: "",
        whatsappNumber: "",
        alternatePhone1: "",
        alternatePhone2: "",
        countryCode: "",
        companyName: "",
        location: "  Mumbai  ",
        agentType: "",
      }),
    ).toEqual({
      name: "Jane Agent",
      location: "Mumbai",
    });
  });

  it("omits empty location", () => {
    expect(
      agentFormFieldsToPayload({
        name: "Jane Agent",
        email: "",
        mobileNumber: "",
        whatsappNumber: "",
        alternatePhone1: "",
        alternatePhone2: "",
        countryCode: "",
        companyName: "",
        location: "   ",
        agentType: "",
      }),
    ).toEqual({
      name: "Jane Agent",
    });
  });
});
