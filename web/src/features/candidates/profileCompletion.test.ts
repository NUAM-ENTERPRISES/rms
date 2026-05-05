import { describe, expect, it } from "vitest";
import {
  computeLocalCandidateProfileCompletion,
  getCandidateProfileCompletion,
  getDocumentRepositorySlots,
  resolveCandidateProfileCompletion,
} from "./profileCompletion";

describe("computeLocalCandidateProfileCompletion", () => {
  it("scores partial profiles", () => {
    const result = computeLocalCandidateProfileCompletion(
      {
        email: "a@b.com",
        countryCode: "+91",
        mobileNumber: "9000000000",
        dateOfBirth: "1990-05-01",
      },
      [{ docType: "resume" }]
    );
    expect(result.percent).toBeGreaterThan(0);
    expect(result.percent).toBeLessThan(100);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

describe("getCandidateProfileCompletion (Document Repository)", () => {
  it("counts six mandatory types with aliases", () => {
    const r = getCandidateProfileCompletion([
      { docType: "resume" },
      { docType: "degree_certificate" },
      { docType: "passport_photo" },
      { docType: "passport_copy" },
      { docType: "aadhaar" },
      { docType: "registration_certificate" },
    ]);
    expect(r.percent).toBe(100);
    expect(r.requiredCount).toBe(6);
    expect(r.missing).toHaveLength(0);
  });

  it("returns missing slot labels with upload types", () => {
    const r = getCandidateProfileCompletion([{ docType: "resume" }]);
    expect(r.percent).toBeGreaterThan(0);
    expect(r.percent).toBeLessThan(100);
    expect(r.missing.some((m) => m.label === "Degree Certificate")).toBe(true);
    expect(
      r.missing.find((m) => m.key === "degree")?.uploadDocType
    ).toBe("degree_certificate");
  });
});

describe("getDocumentRepositorySlots", () => {
  it("marks satisfied slots when matching doc types exist", () => {
    const slots = getDocumentRepositorySlots([{ docType: "resume" }]);
    expect(slots).toHaveLength(6);
    expect(slots.find((s) => s.key === "resume")?.satisfied).toBe(true);
    expect(slots.find((s) => s.key === "degree")?.satisfied).toBe(false);
  });
});

describe("resolveCandidateProfileCompletion", () => {
  it("prefers server payload when present", () => {
    const r = resolveCandidateProfileCompletion(
      {
        email: null,
        countryCode: null,
        mobileNumber: null,
        dateOfBirth: null,
        profileCompletion: {
          percent: 80,
          requiredCount: 9,
          completedCount: 7,
          missing: [],
          breakdown: {
            personal: { completed: 3, total: 3 },
            documents: { completed: 4, total: 6 },
          },
        },
      },
      []
    );
    expect(r.percent).toBe(80);
  });
});
