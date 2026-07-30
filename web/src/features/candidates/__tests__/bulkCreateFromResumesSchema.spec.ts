import { describe, expect, it } from "vitest";
import {
  bulkCreateFromResumesSchema,
  bulkResumeReviewDraftSchema,
} from "@/features/candidates/bulkCreateFromResumesSchema";

describe("bulkCreateFromResumesSchema", () => {
  it("rejects non-pdf files", () => {
    const txtFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    const result = bulkCreateFromResumesSchema.safeParse({
      source: "manual",
      files: [txtFile],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid pdf files", () => {
    const pdfFile = new File(["pdf"], "resume.pdf", {
      type: "application/pdf",
    });
    const result = bulkCreateFromResumesSchema.safeParse({
      source: "manual",
      files: [pdfFile],
    });
    expect(result.success).toBe(true);
  });
});

describe("bulkResumeReviewDraftSchema", () => {
  it("requires valid phone fields", () => {
    const result = bulkResumeReviewDraftSchema.safeParse({
      draftId: "draft-1",
      countryCode: "",
      mobileNumber: "",
    });
    expect(result.success).toBe(false);
  });
});
