import { describe, expect, it } from "vitest";
import { qualificationFormSchema } from "../QualificationFormDialog";

describe("qualificationFormSchema", () => {
  it("requires name, level, and field", () => {
    const result = qualificationFormSchema.safeParse({
      name: "  ",
      level: "BACHELOR",
      field: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["name", "field"]));
    }
  });

  it("accepts optional aliases", () => {
    const result = qualificationFormSchema.safeParse({
      name: "Bachelor of Science in Nursing (BSc Nursing)",
      shortName: "BSc Nursing",
      level: "BACHELOR",
      field: "Nursing",
      aliases: [{ alias: "RN", isCommon: true }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty alias rows", () => {
    const result = qualificationFormSchema.safeParse({
      name: "MBBS",
      level: "BACHELOR",
      field: "Medicine",
      aliases: [{ alias: "  ", isCommon: false }],
    });

    expect(result.success).toBe(false);
  });
});
