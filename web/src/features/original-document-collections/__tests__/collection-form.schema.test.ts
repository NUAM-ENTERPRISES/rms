import { describe, expect, it } from "vitest";
import { createCollectionSchema } from "../schemas/collection-form.schema";
import { COLLECTION_TYPE } from "../constants";

describe("createCollectionSchema", () => {
  const base = {
    candidateId: "cand-1",
    collectedByUserId: "user-1",
    collectedAt: new Date().toISOString(),
  };

  it("requires office for direct collection type", () => {
    const result = createCollectionSchema.safeParse({
      ...base,
      collectionType: COLLECTION_TYPE.DIRECT,
    });
    expect(result.success).toBe(false);
  });

  it("accepts recruiter type with collectedBy only", () => {
    const result = createCollectionSchema.safeParse({
      ...base,
      collectionType: COLLECTION_TYPE.RECRUITER,
    });
    expect(result.success).toBe(true);
  });

  it("requires agent name when agent type without agentId", () => {
    const result = createCollectionSchema.safeParse({
      ...base,
      collectionType: COLLECTION_TYPE.AGENT,
    });
    expect(result.success).toBe(false);
  });
});
