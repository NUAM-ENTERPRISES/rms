import { describe, expect, it } from "vitest";
import type { BundleProfileSuggestions, BundleSegment } from "../data/document-bundle.dto";
import {
  buildWizardSteps,
  hasResumeRole,
  stepPageRange,
  validateWizardAdvance,
} from "../components/bundle-wizard";

function segment(overrides: Partial<BundleSegment> = {}): BundleSegment {
  return {
    id: "seg_1",
    bundleId: "bundle_1",
    startPage: 1,
    endPage: 1,
    docType: "resume",
    docName: null,
    confidence: 0.9,
    extracted: null,
    warnings: null,
    status: "suggested",
    sortOrder: 0,
    documentId: null,
    error: null,
    ...overrides,
  };
}

const emptyProfile: BundleProfileSuggestions = {
  qualifications: [],
  workExperiences: [],
  resumeRole: null,
  identity: null,
};

describe("buildWizardSteps", () => {
  it("orders saveable types and omits everything else", () => {
    const steps = buildWizardSteps([
      segment({ id: "exp", docType: "experience_certificate", sortOrder: 6 }),
      segment({ id: "pcc", docType: "pcc", sortOrder: 3 }),
      segment({ id: "photo", docType: "passport_photo", sortOrder: 2 }),
      segment({ id: "resume", docType: "resume", sortOrder: 0 }),
      segment({
        id: "degree",
        docType: "degree_certificate",
        sortOrder: 1,
      }),
      segment({ id: "other", docType: "other", sortOrder: 9 }),
    ]);

    expect(steps.map((step) => step.kind)).toEqual([
      "resume",
      "degree_certificate",
      "passport_photo",
      "experience_certificate",
    ]);
  });

  it("groups experience certificates into one step and splits extra degrees", () => {
    const steps = buildWizardSteps([
      segment({ id: "d1", docType: "degree_certificate", startPage: 2 }),
      segment({ id: "d2", docType: "degree_certificate", startPage: 3 }),
      segment({ id: "e1", docType: "experience_certificate", startPage: 8 }),
      segment({ id: "e2", docType: "experience_certificate", startPage: 9 }),
    ]);

    expect(steps).toHaveLength(3);
    expect(steps[0].label).toMatch(/1 of 2/);
    expect(steps[1].label).toMatch(/2 of 2/);
    expect(steps[2].kind).toBe("experience_certificate");
    expect(steps[2].segments).toHaveLength(2);
  });
});

describe("validateWizardAdvance", () => {
  it("requires department and role on the resume step", () => {
    const step = buildWizardSteps([segment()])[0];
    expect(validateWizardAdvance(step, emptyProfile)).toMatch(/department and role/i);
  });

  it("accepts a proposed department and role", () => {
    const step = buildWizardSteps([segment()])[0];
    expect(
      validateWizardAdvance(step, {
        ...emptyProfile,
        resumeRole: {
          departmentId: null,
          roleCatalogId: null,
          proposedDepartment: { name: "ICU" },
          proposedRole: { label: "Staff Nurse" },
        },
      }),
    ).toBeNull();
  });

  it("requires passport number but not expiry", () => {
    const missingNumber = buildWizardSteps([
      segment({
        id: "pass",
        docType: "passport_copy",
        extracted: { expiryDate: "2030-01-01" },
      }),
    ])[0];
    expect(validateWizardAdvance(missingNumber, emptyProfile)).toMatch(
      /passport number is required/i,
    );

    const numberOnly = buildWizardSteps([
      segment({
        id: "pass",
        docType: "passport_copy",
        extracted: { documentNumber: "P123" },
      }),
    ])[0];
    expect(validateWizardAdvance(numberOnly, emptyProfile)).toBeNull();
  });

  it("uses identity passport fields when the segment extract is empty", () => {
    const step = buildWizardSteps([
      segment({
        id: "pass",
        docType: "passport_copy",
        extracted: null,
      }),
    ])[0];

    expect(
      validateWizardAdvance(step, {
        ...emptyProfile,
        identity: {
          passportNumber: "Y4403682",
          passportExpiry: "2028-05-29",
        },
      }),
    ).toBeNull();
  });
});

describe("hasResumeRole", () => {
  it("is false when role is missing", () => {
    expect(hasResumeRole(null)).toBe(false);
    expect(
      hasResumeRole({ departmentId: "d1", roleCatalogId: null }),
    ).toBe(false);
  });
});

describe("stepPageRange", () => {
  it("uses the union of grouped experience pages", () => {
    const steps = buildWizardSteps([
      segment({
        id: "e1",
        docType: "experience_certificate",
        startPage: 5,
        endPage: 6,
      }),
      segment({
        id: "e2",
        docType: "experience_certificate",
        startPage: 8,
        endPage: 10,
      }),
    ]);

    expect(stepPageRange(steps[0])).toEqual({ startPage: 5, endPage: 10 });
  });
});
