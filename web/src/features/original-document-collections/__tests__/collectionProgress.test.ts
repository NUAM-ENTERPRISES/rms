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

  it("maps collection status to workflow progress", () => {
    expect(getCollectionWorkflowProgress("draft").percent).toBe(0);
    expect(getCollectionWorkflowProgress("merged_uploaded").currentLabel).toBe(
      "Merged",
    );
    expect(getCollectionWorkflowProgress("completed").percent).toBe(100);
  });
});
