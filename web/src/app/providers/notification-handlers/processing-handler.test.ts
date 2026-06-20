import { describe, expect, it, vi } from "vitest";
import { handleProcessingNotifications } from "./processing-handler";

describe("handleProcessingNotifications", () => {
  it("handles leadership role notifications for candidate ready for processing", () => {
    const invalidateTags = vi.fn();
    const dispatch = vi.fn();

    const handled = handleProcessingNotifications({
      notification: {
        type: "role_notification",
        meta: {
          type: "candidate_ready_for_processing",
          candidateId: "cand-1",
          projectId: "proj-1",
        },
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      invalidateTags(
        expect.arrayContaining([
          "Interview",
          "RecruiterDocuments",
          { type: "Candidate", id: "cand-1" },
          { type: "Project", id: "proj-1" },
        ]),
      ),
    );
  });

  it("handles direct candidate_ready_for_processing notifications", () => {
    const invalidateTags = vi.fn();
    const dispatch = vi.fn();

    const handled = handleProcessingNotifications({
      notification: {
        type: "candidate_ready_for_processing",
        meta: { candidateId: "cand-1", projectId: "proj-1" },
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalled();
  });

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
