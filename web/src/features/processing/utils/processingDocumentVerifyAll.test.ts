import { describe, it, expect, vi } from "vitest";
import {
  getPendingVerificationDocuments,
  verifyAllPendingProcessingDocuments,
} from "./processingDocumentVerifyAll";

describe("processingDocumentVerifyAll", () => {
  it("returns candidate docs that are not yet in processing", () => {
    const pending = getPendingVerificationDocuments(
      [
        { docType: "passport", label: "Passport" },
        { docType: "degree", label: "Degree" },
        { docType: "photo", label: "Photo" },
      ],
      {
        passport: [{ id: "doc-1", status: "pending" }],
        degree: [{ id: "doc-2", status: "verified" }],
      },
      {
        degree: [{ id: "proc-1", status: "verified" }],
      },
    );

    expect(pending).toEqual([
      { docType: "passport", label: "Passport", documentId: "doc-1" },
    ]);
  });

  it("verifies each pending document sequentially", async () => {
    const verifyDocument = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("failed"));

    const result = await verifyAllPendingProcessingDocuments({
      processingStepId: "step-1",
      pendingDocs: [
        { docType: "passport", label: "Passport", documentId: "doc-1" },
        { docType: "degree", label: "Degree", documentId: "doc-2" },
      ],
      verifyDocument,
      notesPrefix: "HRD",
    });

    expect(result).toEqual({ verifiedCount: 1, failedCount: 1 });
    expect(verifyDocument).toHaveBeenCalledTimes(2);
    expect(verifyDocument).toHaveBeenNthCalledWith(1, {
      documentId: "doc-1",
      processingStepId: "step-1",
      notes: "HRD: Passport",
    });
  });
});
