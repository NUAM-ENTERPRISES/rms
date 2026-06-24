import { describe, expect, it } from "vitest";
import { getProcessingStepTileCount } from "./getProcessingStepTileCount";

describe("getProcessingStepTileCount", () => {
  it("uses offer_letter_verified only for the offer letter tile", () => {
    expect(
      getProcessingStepTileCount("offer_letter_verified", {
        offer_letter_verified: 2,
        verify_offer_letter: 5,
      }),
    ).toBe(2);
  });

  it("returns 0 when offer letter has not been uploaded", () => {
    expect(
      getProcessingStepTileCount("offer_letter_verified", {
        verify_offer_letter: 3,
      }),
    ).toBe(0);
  });

  it("returns other step counts unchanged", () => {
    expect(getProcessingStepTileCount("hrd", { hrd: 4 })).toBe(4);
  });
});
