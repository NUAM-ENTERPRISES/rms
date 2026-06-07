import { describe, it, expect } from "vitest";
import {
  getOfferLetterOverrideKey,
  hasOfferLetter,
  resolveOfferLetterFileUrl,
} from "./offerLetter";

const baseItem = {
  id: "int-1",
  isOfferLetterUploaded: true,
  candidateProjectMap: {
    candidate: { id: "cand-1" },
    project: { id: "proj-1" },
    roleNeeded: {
      roleCatalogId: "role-1",
      roleCatalog: { id: "role-1" },
    },
  },
  offerLetterData: {
    document: {
      fileUrl: "https://cdn.example.com/new-offer.pdf",
      uploadedByUser: { name: "Recruiter One" },
    },
  },
};

describe("offerLetter utils", () => {
  it("builds a stable override key from candidate, project, and role", () => {
    expect(getOfferLetterOverrideKey(baseItem)).toBe("cand-1:proj-1:role-1");
  });

  it("prefers the server file URL over stale local overrides after recruiter re-upload", () => {
    const overrides = {
      "cand-1:proj-1:role-1": "https://cdn.example.com/old-offer.pdf",
      "cand-1": "https://cdn.example.com/old-offer.pdf",
    };

    expect(resolveOfferLetterFileUrl(baseItem, overrides)).toBe(
      "https://cdn.example.com/new-offer.pdf",
    );
    expect(hasOfferLetter(baseItem, overrides)).toBe(true);
  });
});
