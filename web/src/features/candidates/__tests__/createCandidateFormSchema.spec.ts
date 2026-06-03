import { describe, expect, it } from "vitest";
import { buildCreateCandidateSchema } from "@/features/candidates/createCandidateFormSchema";

const baseValid = {
  firstName: "John",
  lastName: "Doe",
  source: "manual" as const,
  gender: "MALE" as const,
  declaredProjectIds: [],
  dataFlow: false,
  eligibility: false,
};

describe("createCandidateFormSchema", () => {
  it("requires phone for non–Agent Coordinator", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });
    const result = schema.safeParse({
      ...baseValid,
      countryCode: "",
      mobileNumber: "",
      passportNumber: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty phone and requires passport for Agent Coordinator", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: true });
    const ok = schema.safeParse({
      ...baseValid,
      source: "agent",
      agentId: "agent-1",
      countryCode: "",
      mobileNumber: "",
      passportNumber: "AB123456",
    });
    expect(ok.success).toBe(true);

    const missingPassport = schema.safeParse({
      ...baseValid,
      source: "agent",
      agentId: "agent-1",
      countryCode: "",
      mobileNumber: "",
      passportNumber: "",
    });
    expect(missingPassport.success).toBe(false);
  });

  it("allows default country code with empty mobile for Agent Coordinator", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: true });
    const result = schema.safeParse({
      ...baseValid,
      source: "agent",
      agentId: "agent-1",
      countryCode: "+91",
      mobileNumber: "",
      passportNumber: "AB123456",
    });
    expect(result.success).toBe(true);
  });

  it("requires country code when mobile is provided for Agent Coordinator", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: true });
    const result = schema.safeParse({
      ...baseValid,
      source: "agent",
      agentId: "agent-1",
      countryCode: "",
      mobileNumber: "9876543210",
      passportNumber: "AB123456",
    });
    expect(result.success).toBe(false);
  });
});
