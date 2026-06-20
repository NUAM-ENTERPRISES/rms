import { describe, expect, it } from "vitest";
import { resolveCandidatePassportNumber } from "../candidate-passport.util";

describe("resolveCandidatePassportNumber", () => {
  it("reads camelCase passportNumber", () => {
    expect(
      resolveCandidatePassportNumber({ passportNumber: "787898787898" }),
    ).toBe("787898787898");
  });

  it("reads snake_case passport_number", () => {
    expect(
      resolveCandidatePassportNumber({ passport_number: "AB123" }),
    ).toBe("AB123");
  });

  it("returns null when missing", () => {
    expect(resolveCandidatePassportNumber({})).toBeNull();
  });
});
