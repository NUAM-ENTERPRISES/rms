import { describe, it, expect } from "vitest";
import {
  canEditCandidateCountryRestrictions,
  COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES,
} from "./countryRestrictionRoles";

describe("countryRestrictionRoles", () => {
  it("exports Manager and Recruiter Manager as profile edit roles", () => {
    expect(COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES).toEqual([
      "Manager",
      "Recruiter Manager",
    ]);
  });

  it("allows Manager and Recruiter Manager to edit restrictions", () => {
    expect(canEditCandidateCountryRestrictions(["Manager"])).toBe(true);
    expect(canEditCandidateCountryRestrictions(["Recruiter Manager"])).toBe(
      true,
    );
  });

  it("denies other roles from editing restrictions", () => {
    expect(canEditCandidateCountryRestrictions(["Processing Manager"])).toBe(
      false,
    );
    expect(canEditCandidateCountryRestrictions(["Recruiter"])).toBe(false);
    expect(canEditCandidateCountryRestrictions(undefined)).toBe(false);
  });
});
