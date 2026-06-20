import { describe, it, expect, vi } from "vitest";
import { handleAgentCandidateRequestNotifications } from "./agent-candidate-request-handler";

describe("handleAgentCandidateRequestNotifications", () => {
  it("invalidates agent request and role fill tags when projectId is present", () => {
    const invalidateTags = vi.fn((tags: unknown) => ({ type: "invalidate", payload: tags }));
    const dispatch = vi.fn();

    const handled = handleAgentCandidateRequestNotifications({
      notification: {
        id: "n1",
        type: "agent_candidate_request_created",
        meta: { projectId: "proj-1" },
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.arrayContaining([
          { type: "Project", id: "AGENT_REQUESTS" },
          { type: "Project", id: "proj-1" },
          { type: "Project", id: "ROLE_FILL_proj-1" },
          { type: "Project", id: "AGENT_REQUESTS_proj-1" },
        ]),
      }),
    );
  });

  it("returns false for unrelated notification types", () => {
    const dispatch = vi.fn();
    const invalidateTags = vi.fn();

    const handled = handleAgentCandidateRequestNotifications({
      notification: { id: "n1", type: "other_event" },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
