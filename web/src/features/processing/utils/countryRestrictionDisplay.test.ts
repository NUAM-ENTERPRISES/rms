import { describe, expect, it } from "vitest";
import { resolveCountryRestrictionFromRequest } from "./countryRestrictionDisplay";

describe("resolveCountryRestrictionFromRequest", () => {
  it("returns null when no restriction code is present", () => {
    expect(resolveCountryRestrictionFromRequest({})).toBeNull();
  });

  it("uses restrictCountryName from the request when available", () => {
    expect(
      resolveCountryRestrictionFromRequest({
        restrictCountryCode: "SA",
        restrictCountryName: "Saudi Arabia",
      }),
    ).toEqual({
      countryCode: "SA",
      countryName: "Saudi Arabia",
    });
  });

  it("falls back to project country name when code matches", () => {
    expect(
      resolveCountryRestrictionFromRequest(
        { restrictCountryCode: "SA" },
        { code: "SA", name: "Saudi Arabia" },
      ),
    ).toEqual({
      countryCode: "SA",
      countryName: "Saudi Arabia",
    });
  });

  it("uses project country when requestedCountryRestriction is true without code", () => {
    expect(
      resolveCountryRestrictionFromRequest(
        { requestedCountryRestriction: true },
        { code: "SA", name: "Saudi Arabia" },
      ),
    ).toEqual({
      countryCode: "SA",
      countryName: "Saudi Arabia",
    });
  });
});
