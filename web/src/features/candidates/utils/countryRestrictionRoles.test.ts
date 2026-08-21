import { describe, it, expect } from "vitest";
import {
  canEditCandidateCountryRestrictions,
  COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES,
} from "./countryRestrictionRoles";

describe("countryRestrictionRoles", () => {
  it("exports Manager and Recruiter Manager as profile edit roles", () => {
    expect(COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES).toEqual([
      "Department Head",
      "Recruitment Team Lead",
    ]);
  });

  it("allows Manager and Recruiter Manager to edit restrictions", () => {
    expect(canEditCandidateCountryRestrictions(["Department Head"])).toBe(true);
    expect(canEditCandidateCountryRestrictions(["Recruitment Team Lead"])).toBe(
      true,
    );
  });

  it("denies other roles from editing restrictions", () => {
    expect(canEditCandidateCountryRestrictions(["Processing Team Lead"])).toBe(
      false,
    );
    expect(canEditCandidateCountryRestrictions(["Recruitment Executive"])).toBe(false);
    expect(canEditCandidateCountryRestrictions(undefined)).toBe(false);
  });
});
