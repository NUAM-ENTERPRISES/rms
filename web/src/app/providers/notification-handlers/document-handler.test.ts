import { describe, expect, it, vi } from "vitest";
import {
  handleDocumentNotifications,
  handleDocumentSync,
} from "./document-handler";

describe("document-handler sync", () => {
  it("invalidates verification tags for DocumentVerification data sync", () => {
    const invalidateTags = vi.fn();
    const dispatch = vi.fn();

    const handled = handleDocumentSync(
      {
        type: "DocumentVerification",
        candidateId: "cand-1",
        projectId: "proj-1",
        message: "Document linked successfully",
      },
      { dispatch, invalidateTags },
    );

    expect(handled).toBe(true);
    expect(invalidateTags).toHaveBeenCalledWith([
      { type: "RecruiterDocuments" },
      { type: "VerificationCandidates" },
      { type: "IntroductionVideo" },
      { type: "DocumentVerification", id: "cand-1" },
      { type: "IntroductionVideo", id: "cand-1-proj-1" },
    ]);
  });

  it("invalidates verification tags for legacy RecruiterDocuments data sync", () => {
    const invalidateTags = vi.fn();

    const handled = handleDocumentSync(
      {
        type: "RecruiterDocuments",
        candidateId: "cand-2",
        message: "Document uploaded successfully",
      },
      { dispatch: vi.fn(), invalidateTags },
    );

    expect(handled).toBe(true);
    expect(invalidateTags).toHaveBeenCalledWith([
      { type: "RecruiterDocuments" },
      { type: "VerificationCandidates" },
      { type: "IntroductionVideo" },
      { type: "DocumentVerification", id: "cand-2" },
    ]);
  });

  it("returns false for unrelated sync types", () => {
    const handled = handleDocumentSync(
      { type: "Screening" },
      { dispatch: vi.fn(), invalidateTags: vi.fn() },
    );

    expect(handled).toBe(false);
  });
});

describe("document-handler notifications", () => {
  it("invalidates verification tags for missing document uploaded bell notification", () => {
    const invalidateTags = vi.fn();

    const handled = handleDocumentNotifications({
      notification: {
        type: "documentation_notification",
        meta: {
          type: "document_missing_uploaded",
          candidateId: "cand-1",
          projectId: "proj-1",
        },
      },
      dispatch: vi.fn(),
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(invalidateTags).toHaveBeenCalledWith(
      expect.arrayContaining([
        { type: "DocumentVerification", id: "cand-1" },
        { type: "VerificationCandidates" },
      ]),
    );
  });
});
