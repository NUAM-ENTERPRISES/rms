import { describe, expect, it } from "vitest";
import { buildCreateUserSchema, buildUpdateUserSchema } from "./user-schemas";

const validBase = {
  name: "Test User",
  employeeCode: "AFFEMP012026",
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
  professionTypeIds: [] as string[],
  handlesAllProfessions: false,
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
      recruiterSectorScope: "HEALTHCARE",
      professionTypeIds: ["pt_nurse_seed001"],
      recruiterLanguages: [
        { languageCode: "en", proficiency: "PRIMARY" as const },
      ],
      recruiterCountryCoverages: [
        { countryCode: "SA", sectorScopes: ["HEALTHCARE" as const] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts Recruiter Any profession without specific IDs", () => {
    const result = schema.safeParse({
      ...validBase,
      recruiterSectorScope: "HEALTHCARE",
      handlesAllProfessions: true,
      professionTypeIds: [],
      recruiterLanguages: [
        { languageCode: "en", proficiency: "PRIMARY" as const },
      ],
      recruiterCountryCoverages: [
        { countryCode: "SA", sectorScopes: ["HEALTHCARE" as const] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("requires profession types for recruiter roles", () => {
    const result = schema.safeParse({
      ...validBase,
      recruiterSectorScope: "HEALTHCARE",
      professionTypeIds: [],
      recruiterLanguages: [
        { languageCode: "en", proficiency: "PRIMARY" as const },
      ],
      recruiterCountryCoverages: [
        { countryCode: "SA", sectorScopes: ["HEALTHCARE" as const] },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.join(".") === "professionTypeIds"),
      ).toBe(true);
    }
  });

  it("does not require profession types for non-recruiter roles", () => {
    const nonRecruiterSchema = buildCreateUserSchema(false);
    const result = nonRecruiterSchema.safeParse({
      ...validBase,
      professionTypeIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts create without date of birth", () => {
    const nonRecruiterSchema = buildCreateUserSchema(false);
    expect(
      nonRecruiterSchema.safeParse({ ...validBase, dateOfBirth: undefined })
        .success,
    ).toBe(true);
    expect(
      nonRecruiterSchema.safeParse({ ...validBase, dateOfBirth: "" }).success,
    ).toBe(true);
  });

  it("accepts free-form or empty employee code", () => {
    const nonRecruiterSchema = buildCreateUserSchema(false);
    expect(
      nonRecruiterSchema.safeParse({ ...validBase, employeeCode: "EMP-42" })
        .success,
    ).toBe(true);
    expect(
      nonRecruiterSchema.safeParse({ ...validBase, employeeCode: "" }).success,
    ).toBe(true);
    expect(
      nonRecruiterSchema.safeParse({ ...validBase, employeeCode: undefined })
        .success,
    ).toBe(true);
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

  it("accepts empty date of birth", () => {
    const result = buildUpdateUserSchema(false).safeParse({
      name: "Ada Lovelace",
      dateOfBirth: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts free-form or empty employee code", () => {
    const schema = buildUpdateUserSchema(false);
    expect(
      schema.safeParse({ name: "Ada Lovelace", employeeCode: "EMP-42" })
        .success,
    ).toBe(true);
    expect(
      schema.safeParse({ name: "Ada Lovelace", employeeCode: "" }).success,
    ).toBe(true);
  });
});
