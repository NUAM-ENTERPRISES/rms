import { describe, expect, it } from "vitest";
import {
  computeLocalCandidateProfileCompletion,
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
