import { describe, expect, it } from "vitest";
import {
  digitsOnly,
  getNationalNumberMaxLength,
  normalizeDialCode,
  validateMobileForDialCode,
} from "@/shared/utils/phone-number";

describe("phone-number utils", () => {
  it("normalizes dial codes and strips non-digits", () => {
    expect(normalizeDialCode("91")).toBe("+91");
    expect(normalizeDialCode("+91")).toBe("+91");
    expect(digitsOnly("98-765-43210")).toBe("9876543210");
  });

  it("returns max length 10 for +91 and 9 for +971", () => {
    expect(getNationalNumberMaxLength("+91")).toBe(10);
    expect(getNationalNumberMaxLength("+971")).toBe(9);
    expect(getNationalNumberMaxLength("")).toBe(15);
  });

  it("validates Indian and UAE mobiles by dial code", () => {
    expect(validateMobileForDialCode("+91", "9876543210")).toBeNull();
    expect(validateMobileForDialCode("+91", "987654321")).toMatch(/10 digits/);
    expect(validateMobileForDialCode("+91", "98765432101")).toMatch(/10 digits/);

    expect(validateMobileForDialCode("+971", "501234567")).toBeNull();
    expect(validateMobileForDialCode("+971", "50123456")).toMatch(/9 digits/);
  });
});
