import { describe, it, expect } from "vitest";
import { defaultProjectValues, projectFormSchema } from "../schemas/project-schemas";

describe("projectFormSchema introduction video", () => {
  it("defaults introductionVideoRequired to false", () => {
    expect(defaultProjectValues.introductionVideoRequired).toBe(false);
  });

  it("accepts introductionVideoRequired in schema shape", () => {
    expect(
      projectFormSchema.shape.introductionVideoRequired.safeParse(true).success,
    ).toBe(true);
  });
});
