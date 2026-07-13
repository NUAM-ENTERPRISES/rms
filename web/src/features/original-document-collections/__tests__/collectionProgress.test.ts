import { describe, expect, it } from "vitest";
import {
  getCollectionDocumentProgress,
  getCollectionWorkflowProgress,
} from "../utils/collectionProgress";

describe("collectionProgress", () => {
  it("calculates document progress from cumulative received", () => {
    const result = getCollectionDocumentProgress([
      { docType: "sslc_certificate_original", isReceived: true },
      { docType: "degree_certificate_original", isReceived: true },
    ]);

    expect(result.receivedCount).toBe(2);
    expect(result.totalCount).toBe(8);
    expect(result.percent).toBe(25);
    expect(result.isComplete).toBe(false);
  });

  it("allows completion when only optional documents are missing", () => {
    const result = getCollectionDocumentProgress(
      [{ docType: "passport_original", isReceived: true }],
      [
        {
          id: "required",
          collectionId: "col-1",
          docType: "passport_original",
          mandatory: true,
          sortOrder: 0,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "optional",
          collectionId: "col-1",
          docType: "offer_letter_original",
          mandatory: false,
          sortOrder: 1,
          createdAt: "",
          updatedAt: "",
        },
      ],
    );

    expect(result.isComplete).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.mandatoryReceivedCount).toBe(1);
    expect(result.optionalCount).toBe(1);
  });

  it("blocks completion while a mandatory document is missing", () => {
    const result = getCollectionDocumentProgress([], [
      {
        id: "required",
        collectionId: "col-1",
        docType: "passport_original",
        mandatory: true,
        sortOrder: 0,
        createdAt: "",
        updatedAt: "",
      },
    ]);

    expect(result.isComplete).toBe(false);
    expect(result.percent).toBe(0);
  });

  it("maps collection status to workflow progress", () => {
    expect(getCollectionWorkflowProgress("draft").percent).toBe(0);
    expect(getCollectionWorkflowProgress("merged_uploaded").currentLabel).toBe(
      "Merged",
    );
    expect(getCollectionWorkflowProgress("completed").percent).toBe(100);
  });
});
