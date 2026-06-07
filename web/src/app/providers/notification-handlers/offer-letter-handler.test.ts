import { describe, it, expect, vi } from "vitest";
import {
  handleOfferLetterNotifications,
  handleOfferLetterSync,
} from "./offer-letter-handler";

describe("offer-letter-handler", () => {
  it("invalidates interview and processing tags on offer_letter_uploaded notification", () => {
    const dispatch = vi.fn();
    const invalidateTags = vi.fn((tags) => ({ type: "invalidate", payload: tags }));

    const handled = handleOfferLetterNotifications({
      notification: {
        type: "offer_letter_uploaded",
        meta: { candidateId: "cand-1", projectId: "proj-1" },
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.arrayContaining([
          "Interview",
          "ProcessingSummary",
          { type: "Candidate", id: "cand-1" },
          { type: "Project", id: "proj-1" },
        ]),
      }),
    );
  });

  it("invalidates tags on OfferLetterUploaded data sync", () => {
    const dispatch = vi.fn();
    const invalidateTags = vi.fn((tags) => ({ type: "invalidate", payload: tags }));

    const handled = handleOfferLetterSync(
      { type: "OfferLetterUploaded", candidateId: "cand-2", projectId: "proj-2" },
      { dispatch, invalidateTags },
    );

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalled();
  });
});
