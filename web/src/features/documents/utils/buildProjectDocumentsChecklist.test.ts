import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE } from "@/constants/document-types";
import { buildProjectDocumentsChecklist } from "./buildProjectDocumentsChecklist";

describe("buildProjectDocumentsChecklist", () => {
  it("marks requirements as uploaded or missing", () => {
    const result = buildProjectDocumentsChecklist({
      requirements: [
        { id: "1", docType: "degree_certificate", mandatory: true },
        { id: "2", docType: "resume", mandatory: false },
      ],
      verifications: [
        {
          status: "pending",
          document: { docType: "degree_certificate", fileName: "degree.pdf" },
        },
      ],
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      label: "Degree Certificate",
      isUploaded: true,
      fileName: "degree.pdf",
      mandatory: true,
    });
    expect(result.rows[1]).toMatchObject({
      isUploaded: false,
      mandatory: false,
    });
    expect(result.summary.totalRequired).toBe(2);
    expect(result.summary.totalSubmitted).toBe(1);
    expect(result.summary.missingCount).toBe(1);
    expect(result.summary.missingMandatoryCount).toBe(0);
  });

  it("appends introduction video when required", () => {
    const result = buildProjectDocumentsChecklist({
      requirements: [{ id: "1", docType: "degree", mandatory: true }],
      verifications: [],
      introductionVideoRequired: true,
      introductionVideo: {
        status: "pending",
        document: {
          docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
          fileName: "intro.mp4",
        },
      },
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toMatchObject({
      key: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
      isUploaded: true,
      mandatory: true,
      fileName: "intro.mp4",
    });
    expect(result.summary.totalRequired).toBe(2);
  });

  it("counts missing mandatory documents", () => {
    const result = buildProjectDocumentsChecklist({
      requirements: [
        { id: "1", docType: "passport", mandatory: true },
        { id: "2", docType: "aadhaar", mandatory: true },
      ],
      verifications: [],
      introductionVideoRequired: true,
    });

    expect(result.summary.missingMandatoryCount).toBe(3);
    expect(result.summary.missingCount).toBe(3);
  });

  it("uses API summary totals when provided", () => {
    const result = buildProjectDocumentsChecklist({
      requirements: [{ id: "1", docType: "passport", mandatory: true }],
      verifications: [
        {
          status: "pending",
          document: { docType: "passport", fileName: "p.pdf" },
        },
      ],
      summary: { totalRequired: 5, totalSubmitted: 3 },
    });

    expect(result.summary.totalRequired).toBe(5);
    expect(result.summary.totalSubmitted).toBe(3);
  });
});
