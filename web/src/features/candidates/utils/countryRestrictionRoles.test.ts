import { describe, it, expect } from "vitest";
import {
  canEditCandidateCountryRestrictions,
  COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES,
} from "./countryRestrictionRoles";

describe("countryRestrictionRoles", () => {
  it("exports Manager and Recruitment Lead as profile edit roles", () => {
    expect(COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES).toEqual([
      "Manager",
      "Recruitment Lead",
    ]);
  });

  it("allows Manager and Recruitment Lead to edit restrictions", () => {
    expect(canEditCandidateCountryRestrictions(["Manager"])).toBe(true);
    expect(canEditCandidateCountryRestrictions(["Recruitment Lead"])).toBe(
      true,
    );
    expect(canEditCandidateCountryRestrictions(["Recruiter Manager"])).toBe(
      true,
    );
  });

  it("denies other roles from editing restrictions", () => {
    expect(canEditCandidateCountryRestrictions(["Processing Lead"])).toBe(
      false,
    );
    expect(canEditCandidateCountryRestrictions(["Recruitment Executive"])).toBe(false);
    expect(canEditCandidateCountryRestrictions(undefined)).toBe(false);
  });
});
