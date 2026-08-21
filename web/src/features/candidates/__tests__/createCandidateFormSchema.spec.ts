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
  eligibilityIssuedDate: "",
  eligibilityExpiryDate: "",
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

  it("accepts a valid 10-digit Indian mobile for +91", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });
    const result = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
    });
    expect(result.success).toBe(true);
  });

  it("rejects Indian mobiles that are not 10 digits for +91", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });

    const tooShort = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "987654321",
    });
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
      expect(tooShort.error.issues.some((i) => i.path.includes("mobileNumber"))).toBe(
        true,
      );
    }

    const tooLong = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "98765432101",
    });
    expect(tooLong.success).toBe(false);
  });

  it("validates UAE mobiles as 9 digits for +971", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });

    const valid = schema.safeParse({
      ...baseValid,
      countryCode: "+971",
      mobileNumber: "501234567",
    });
    expect(valid.success).toBe(true);

    const tooShort = schema.safeParse({
      ...baseValid,
      countryCode: "+971",
      mobileNumber: "50123456",
    });
    expect(tooShort.success).toBe(false);

    const tooLong = schema.safeParse({
      ...baseValid,
      countryCode: "+971",
      mobileNumber: "5012345678",
    });
    expect(tooLong.success).toBe(false);
  });

  it("validates Agent Coordinator phone with country rules when provided", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: true });

    const valid = schema.safeParse({
      ...baseValid,
      source: "agent",
      agentId: "agent-1",
      countryCode: "+91",
      mobileNumber: "9876543210",
      passportNumber: "AB123456",
    });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({
      ...baseValid,
      source: "agent",
      agentId: "agent-1",
      countryCode: "+91",
      mobileNumber: "987654321",
      passportNumber: "AB123456",
    });
    expect(invalid.success).toBe(false);
  });

  it("requires eligibility fields when eligibility is enabled", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });
    const missingNumber = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "",
      eligibilityIssuedDate: "2024-01-01",
      eligibilityExpiryDate: "2025-01-01",
    });
    expect(missingNumber.success).toBe(false);

    const missingDates = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "ELIG-123",
      eligibilityIssuedDate: "",
      eligibilityExpiryDate: "",
    });
    expect(missingDates.success).toBe(false);

    const invalidRange = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "ELIG-123",
      eligibilityIssuedDate: "2025-01-01",
      eligibilityExpiryDate: "2024-01-01",
    });
    expect(invalidRange.success).toBe(false);

    const withAllFields = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      eligibility: true,
      eligibilityNumber: "ELIG-123",
      eligibilityIssuedDate: "2024-01-01",
      eligibilityExpiryDate: "2025-01-01",
    });
    expect(withAllFields.success).toBe(true);
  });

  it("allows Any profession with a sector and no profession type", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });
    const result = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      professionTypeId: "",
      focusesAllProfessions: true,
      professionSector: "HEALTHCARE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects Any profession without a sector", () => {
    const schema = buildCreateCandidateSchema({ isAgentCoordinator: false });
    const result = schema.safeParse({
      ...baseValid,
      countryCode: "+91",
      mobileNumber: "9876543210",
      professionTypeId: "",
      focusesAllProfessions: true,
    });
    expect(result.success).toBe(false);
  });
});
