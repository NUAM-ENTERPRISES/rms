import { describe, expect, it, vi } from "vitest";
import {
  handleIntroductionVideoNotifications,
  handleIntroductionVideoSocketEvents,
} from "./introduction-video-handler";

describe("introduction-video-handler", () => {
  it("invalidates introduction video tags for bell notifications", () => {
    const invalidateTags = vi.fn();
    const dispatch = vi.fn();

    const handled = handleIntroductionVideoNotifications({
      notification: {
        type: "introduction_video_rejected",
        meta: {
          candidateId: "c1",
          projectId: "p1",
        },
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(invalidateTags).toHaveBeenCalledWith([
      "RecruiterDocuments",
      "DocumentSummary",
      { type: "DocumentVerification" },
      { type: "IntroductionVideo", id: "c1" },
      { type: "DocumentVerification", id: "c1" },
      { type: "Candidate", id: "c1" },
      { type: "IntroductionVideo", id: "c1-p1" },
      { type: "Project", id: "p1" },
    ]);
  });

  it("returns false for unrelated notification types", () => {
    const handled = handleIntroductionVideoNotifications({
      notification: { type: "document_rejected" },
      dispatch: vi.fn(),
      invalidateTags: vi.fn(),
    });

    expect(handled).toBe(false);
  });

  it("invalidates tags for direct socket events", () => {
    const invalidateTags = vi.fn();

    handleIntroductionVideoSocketEvents("introduction_video_resubmitted", {
      data: { candidateId: "c1", projectId: "p1" },
      dispatch: vi.fn(),
      invalidateTags,
    });

    expect(invalidateTags).toHaveBeenCalledWith([
      "RecruiterDocuments",
      "DocumentSummary",
      { type: "DocumentVerification" },
      { type: "IntroductionVideo", id: "c1" },
      { type: "DocumentVerification", id: "c1" },
      { type: "IntroductionVideo", id: "c1-p1" },
    ]);
  });
});
