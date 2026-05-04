import { describe, expect, it } from "vitest";
import { buildCreateUserSchema, buildUpdateUserSchema } from "./user-schemas";

const validBase = {
  name: "Test User",
  email: "test@example.com",
  password: "SecurePass1!",
  confirmPassword: "SecurePass1!",
  countryCode: "+91",
  mobileNumber: "1234567890",
  dateOfBirth: "1990-01-15",
  roleId: "role-1",
  addressCountryCode: "",
  addressStateId: "",
  address: "",
  recruiterLanguages: [] as { languageCode: string; proficiency: "PRIMARY" | "SECONDARY" | "TERTIARY" }[],
  recruiterCountryCoverages: [] as {
    countryCode: string;
    sectorScopes: ("HEALTHCARE" | "NON_HEALTH_CARE")[];
  }[],
};

describe("buildCreateUserSchema", () => {
  const schema = buildCreateUserSchema(true);

  it("rejects duplicate recruiter languages", () => {
    const result = schema.safeParse({
      ...validBase,
      recruiterLanguages: [
        { languageCode: "en", proficiency: "PRIMARY" as const },
        { languageCode: "en", proficiency: "SECONDARY" as const },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("recruiterLanguages"))).toBe(true);
    }
  });

  it("rejects more than one PRIMARY language", () => {
    const result = schema.safeParse({
      ...validBase,
      recruiterLanguages: [
        { languageCode: "en", proficiency: "PRIMARY" as const },
        { languageCode: "ml", proficiency: "PRIMARY" as const },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.path.join(".") === "recruiterLanguages.1.proficiency" &&
            i.message === "At most one PRIMARY language"
        )
      ).toBe(true);
    }
  });

  it("accepts recruiter rows when valid", () => {
    const result = schema.safeParse({
      ...validBase,
      recruiterLanguages: [
        { languageCode: "en", proficiency: "PRIMARY" as const },
      ],
      recruiterCountryCoverages: [
        { countryCode: "SA", sectorScopes: ["HEALTHCARE" as const] },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("buildUpdateUserSchema", () => {
  const schema = buildUpdateUserSchema(true);

  it("validates recruiter rows when enabled", () => {
    const result = schema.safeParse({
      name: "X",
      recruiterLanguages: [
        { languageCode: "en", proficiency: "PRIMARY" as const },
        { languageCode: "en", proficiency: "SECONDARY" as const },
      ],
      recruiterCountryCoverages: [],
    });
    expect(result.success).toBe(false);
  });
});
