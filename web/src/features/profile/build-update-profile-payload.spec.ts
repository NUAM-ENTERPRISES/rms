import { describe, expect, it } from "vitest";
import {
  buildUpdateProfilePayload,
  toDateInputValue,
} from "./build-update-profile-payload";

describe("toDateInputValue", () => {
  it("returns empty string when unset", () => {
    expect(toDateInputValue(undefined)).toBe("");
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue("")).toBe("");
  });

  it("strips ISO time to YYYY-MM-DD", () => {
    expect(toDateInputValue("1990-01-15T00:00:00.000Z")).toBe("1990-01-15");
    expect(toDateInputValue("1990-01-15")).toBe("1990-01-15");
  });
});

describe("buildUpdateProfilePayload", () => {
  it("converts empty address fields and DOB to null", () => {
    expect(
      buildUpdateProfilePayload({
        name: "Ada",
        email: "ada@example.com",
        mobileNumber: "1234567890",
        countryCode: "+91",
        dateOfBirth: "",
        addressCountryCode: "",
        addressStateId: "  ",
        address: "",
      }),
    ).toEqual({
      name: "Ada",
      email: "ada@example.com",
      mobileNumber: "1234567890",
      countryCode: "+91",
      dateOfBirth: null,
      addressCountryCode: null,
      addressStateId: null,
      address: null,
    });
  });

  it("keeps trimmed DOB as date-only string", () => {
    expect(
      buildUpdateProfilePayload({
        dateOfBirth: " 1990-01-15 ",
        addressCountryCode: "IN",
      }).dateOfBirth,
    ).toBe("1990-01-15");
  });
});
