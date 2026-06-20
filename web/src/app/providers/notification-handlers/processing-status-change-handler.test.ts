import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleProcessingStatusChangeNotifications,
  handleProcessingStatusChangeSync,
} from "./processing-status-change-handler";

describe("processing-status-change-handler", () => {
  const dispatch = vi.fn();
  const invalidateTags = vi.fn((tags) => ({ type: "invalidate", payload: tags }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false for unrelated notification types", () => {
    const result = handleProcessingStatusChangeNotifications({
      notification: { id: "1", type: "other_event" },
      dispatch,
      invalidateTags,
    });

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("invalidates processing tags when a hold/cancel request is reviewed", () => {
    const result = handleProcessingStatusChangeNotifications({
      notification: {
        id: "1",
        type: "processing_status_change_reviewed",
        meta: {
          processingCandidateId: "pc-1",
          candidateId: "cand-1",
          projectId: "proj-1",
          outcome: "approved",
          requestType: "processing_cancel",
        },
      },
      dispatch,
      invalidateTags,
    });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      invalidateTags([
        { type: "ProcessingSummary", id: "LIST" },
        { type: "Processing", id: "LIST" },
        { type: "Processing", id: "pc-1" },
        { type: "ProcessingDetails", id: "pc-1" },
        { type: "ProcessingSteps", id: "pc-1" },
        { type: "Candidate", id: "cand-1" },
        { type: "Candidate", id: "pipeline-cand-1-proj-1" },
      ]),
    );
  });

  it("invalidates processing tags on ProcessingStatusChange data sync", () => {
    const result = handleProcessingStatusChangeSync(
      {
        type: "ProcessingStatusChange",
        processingCandidateId: "pc-2",
        candidateId: "cand-2",
        projectId: "proj-2",
        phase: "reviewed",
        outcome: "rejected",
      },
      { dispatch, invalidateTags },
    );

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      invalidateTags([
        { type: "ProcessingSummary", id: "LIST" },
        { type: "Processing", id: "LIST" },
        { type: "Processing", id: "pc-2" },
        { type: "ProcessingDetails", id: "pc-2" },
        { type: "ProcessingSteps", id: "pc-2" },
        { type: "Candidate", id: "cand-2" },
        { type: "Candidate", id: "pipeline-cand-2-proj-2" },
      ]),
    );
  });
});
