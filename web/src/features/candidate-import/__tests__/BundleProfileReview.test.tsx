import { describe, expect, it } from "vitest";
import { validateProfileSuggestions } from "../components/BundleProfileReview";
import type { BundleProfileSuggestions } from "../data/document-bundle.dto";

describe("validateProfileSuggestions", () => {
  const base: BundleProfileSuggestions = {
    qualifications: [],
    workExperiences: [],
  };

  it("accepts an included qualification with a catalog id", () => {
    expect(
      validateProfileSuggestions({
        ...base,
        qualifications: [
          {
            id: "1",
            rawLabel: "BSc Nursing",
            qualificationId: "q1",
            included: true,
          },
        ],
      }),
    ).toBeNull();
  });

  it("rejects an included qualification without a match or proposal", () => {
    expect(
      validateProfileSuggestions({
        ...base,
        qualifications: [
          {
            id: "1",
            rawLabel: "Unknown",
            qualificationId: null,
            proposedNew: null,
            included: true,
          },
        ],
      }),
    ).toMatch(/catalog match/i);
  });

  it("requires an end date unless the role is current", () => {
    expect(
      validateProfileSuggestions({
        ...base,
        workExperiences: [
          {
            id: "w1",
            departmentRaw: "ICU",
            jobTitleRaw: "Nurse",
            roleDepartmentId: "d1",
            roleCatalogId: "r1",
            startDate: "2020-01-01",
            endDate: null,
            isCurrent: false,
            linkedSegmentIds: [],
            included: true,
          },
        ],
      }),
    ).toMatch(/end date/i);
  });

  it("allows a current role without an end date", () => {
    expect(
      validateProfileSuggestions({
        ...base,
        workExperiences: [
          {
            id: "w1",
            departmentRaw: "ICU",
            jobTitleRaw: "Nurse",
            roleDepartmentId: "d1",
            roleCatalogId: "r1",
            startDate: "2020-01-01",
            endDate: null,
            isCurrent: true,
            linkedSegmentIds: [],
            included: true,
          },
        ],
      }),
    ).toBeNull();
  });
});
