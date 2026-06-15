import { describe, expect, it } from "vitest";
import {
  getFirstInvalidSection,
  validateChecklistItemsForVisit,
} from "../utils/createCollectionFormValidation";
import { buildDefaultChecklistItems } from "../components/OriginalDocumentChecklist";

describe("createCollectionFormValidation", () => {
  it("requires at least one newly received document when unlocked items exist", () => {
    const items = buildDefaultChecklistItems();
    expect(validateChecklistItemsForVisit(items, [])).toBe(
      "Mark at least one document as received for this visit",
    );
  });

  it("allows empty new marks when every document is already on file", () => {
    const items = buildDefaultChecklistItems();
    const allDocTypes = items.map((item) => item.docType);
    expect(validateChecklistItemsForVisit(items, allDocTypes)).toBeNull();
  });

  it("returns the first invalid section in page order", () => {
    expect(
      getFirstInvalidSection({
        candidateId: { type: "manual", message: "Candidate is required" },
        collectedByUserId: {
          type: "manual",
          message: "Collected by is required",
        },
      }),
    ).toBe("candidate");

    expect(
      getFirstInvalidSection({
        collectedByUserId: {
          type: "manual",
          message: "Collected by is required",
        },
      }),
    ).toBe("collectionSource");

    expect(
      getFirstInvalidSection({
        items: {
          type: "manual",
          message: "Mark at least one document as received for this visit",
        },
      }),
    ).toBe("checklist");
  });
});
