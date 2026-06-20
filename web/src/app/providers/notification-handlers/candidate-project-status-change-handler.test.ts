import { describe, it, expect, vi } from "vitest";
import { handleCandidateProjectStatusChangeNotifications } from "./candidate-project-status-change-handler";

describe("handleCandidateProjectStatusChangeNotifications", () => {
  const dispatch = vi.fn();
  const invalidateTags = vi.fn((tags) => ({ type: "invalidate", payload: tags }));

  it("returns false for unrelated notification types", () => {
    const result = handleCandidateProjectStatusChangeNotifications({
      notification: { id: "1", type: "other_event" },
      dispatch,
      invalidateTags,
    });

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("invalidates pipeline tags when status change is reviewed", () => {
    const result = handleCandidateProjectStatusChangeNotifications({
      notification: {
        id: "1",
        type: "candidate_project_status_change_reviewed",
        meta: {
          candidateId: "cand-1",
          projectId: "proj-1",
          candidateProjectMapId: "map-1",
          outcome: "rejected",
        },
      },
      dispatch,
      invalidateTags,
    });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      invalidateTags([
        { type: "Candidate", id: "cand-1" },
        { type: "Candidate", id: "pipeline-cand-1-proj-1" },
        { type: "Candidate", id: "status-change-history-map-1" },
      ]),
    );
  });

  it("invalidates pipeline tags when status change is requested", () => {
    const result = handleCandidateProjectStatusChangeNotifications({
      notification: {
        id: "1",
        type: "candidate_project_status_change_request",
        meta: {
          candidateId: "cand-2",
          projectId: "proj-2",
        },
      },
      dispatch,
      invalidateTags,
    });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      invalidateTags([
        { type: "Candidate", id: "cand-2" },
        { type: "Candidate", id: "pipeline-cand-2-proj-2" },
      ]),
    );
  });
});
