import { describe, expect, it, vi } from "vitest";
import { handleProcessingNotifications } from "./processing-handler";

describe("handleProcessingNotifications", () => {
  it("handles recruiter notifications for candidate ready for processing", () => {
    const invalidateTags = vi.fn();
    const dispatch = vi.fn();

    const handled = handleProcessingNotifications({
      notification: {
        type: "recruiter_notification",
        meta: { type: "candidate_ready_for_processing" },
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      invalidateTags([
        "Candidate",
        "Processing",
        "ProcessingSummary",
        "ProcessingDetails",
        { type: "ProcessingSummary", id: "LIST" },
        { type: "Processing", id: "LIST" },
      ]),
    );
  });
});
