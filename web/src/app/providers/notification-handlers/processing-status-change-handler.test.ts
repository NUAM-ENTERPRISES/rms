import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildProcessingStatusChangeInvalidationTags,
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

  it("invalidates processing tags when a new cancel/hold request arrives", () => {
    const result = handleProcessingStatusChangeNotifications({
      notification: {
        id: "1",
        type: "processing_status_change_request",
        meta: {
          processingCandidateId: "pc-1",
          candidateId: "cand-1",
          projectId: "proj-1",
          candidateProjectMapId: "cpm-1",
          requestType: "processing_cancel",
        },
      },
      dispatch,
      invalidateTags,
    });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      invalidateTags(
        buildProcessingStatusChangeInvalidationTags({
          processingCandidateId: "pc-1",
          candidateId: "cand-1",
          projectId: "proj-1",
          candidateProjectMapId: "cpm-1",
        }),
      ),
    );
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
        "ProcessingSummary",
        "Processing",
        "ProcessingDetails",
        "ProcessingSteps",
        { type: "ProcessingSummary", id: "LIST" },
        { type: "Processing", id: "LIST" },
        { type: "ProcessingDetails", id: "LIST" },
        { type: "ProcessingSteps", id: "LIST" },
        { type: "Processing", id: "pc-1" },
        { type: "ProcessingDetails", id: "pc-1" },
        { type: "ProcessingSteps", id: "pc-1" },
        { type: "Candidate", id: "cand-1" },
        { type: "Candidate", id: "country-restrictions-cand-1" },
        { type: "Candidate", id: "pipeline-cand-1-proj-1" },
      ]),
    );
  });

  it("invalidates processing tags when recruiter receives reviewed status change", () => {
    const result = handleProcessingStatusChangeNotifications({
      notification: {
        id: "1",
        type: "recruiter_notification",
        link: "/candidate-project/cand-1/projects/proj-1",
        meta: {
          type: "processing_status_change_reviewed",
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
      invalidateTags(
        buildProcessingStatusChangeInvalidationTags({
          processingCandidateId: "pc-1",
          candidateId: "cand-1",
          projectId: "proj-1",
        }),
      ),
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
      invalidateTags(
        buildProcessingStatusChangeInvalidationTags({
          processingCandidateId: "pc-2",
          candidateId: "cand-2",
          projectId: "proj-2",
        }),
      ),
    );
  });
});
