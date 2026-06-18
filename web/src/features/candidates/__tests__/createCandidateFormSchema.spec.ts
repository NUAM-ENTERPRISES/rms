import { describe, expect, it } from "vitest";
import { buildCreateCandidateSchema } from "@/features/candidates/createCandidateFormSchema";

const baseValid = {
  firstName: "John",
  lastName: "Doe",
  source: "manual" as const,
  gender: "MALE" as const,
  professionTypeId: "prof-1",
  declaredProjectIds: [],
  dataFlow: false,
  eligibility: false,
  eligibilityNumber: "",
  religionId: "",
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

  it("requires eligibility number when eligibility is enabled", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });
    const missingNumber = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "",
      eligibilityIssuedAt: "2024-01-01",
      eligibilityExpiryAt: "2025-01-01",
    });
    expect(missingNumber.success).toBe(false);

    const withNumber = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "ELIG-123",
      eligibilityIssuedAt: "2024-01-01",
      eligibilityExpiryAt: "2025-01-01",
    });
    expect(withNumber.success).toBe(true);
  });

  it("requires eligibility dates and validates expiry ordering", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });
    const missingDates = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "ELIG-123",
      eligibilityIssuedAt: "",
      eligibilityExpiryAt: "",
    });
    expect(missingDates.success).toBe(false);

    const invalidOrder = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "ELIG-123",
      eligibilityIssuedAt: "2025-01-01",
      eligibilityExpiryAt: "2024-01-01",
    });
    expect(invalidOrder.success).toBe(false);
  });
});
