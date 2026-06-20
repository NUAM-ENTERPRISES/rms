import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcessingStatusChangeOutcomeBanner } from "./ProcessingStatusChangeOutcomeBanner";
import type { ReviewedStatusChangeRequest } from "@/features/candidates/api";

const baseRequest: ReviewedStatusChangeRequest = {
  id: "req-1",
  requestType: "processing_reactivate",
  requestedStatus: "processing_in_progress",
  reason: "Candidate confirmed availability to resume.",
  status: "approved",
  createdAt: "2026-06-19T10:00:00.000Z",
  reviewedAt: "2026-06-19T11:00:00.000Z",
  reviewNotes: "Approved to resume at HRD.",
  requester: { id: "u1", name: "Processing User", email: "proc@example.com" },
  reviewer: { id: "u2", name: "Manager One", email: "mgr@example.com" },
};

describe("ProcessingStatusChangeOutcomeBanner", () => {
  it("renders approved reactivation outcome with reviewer and notes", () => {
    render(<ProcessingStatusChangeOutcomeBanner request={baseRequest} />);

    expect(screen.getByText("Reactivation request approved")).toBeInTheDocument();
    expect(screen.getByText(/Manager One/)).toBeInTheDocument();
    expect(screen.getByText("Approved to resume at HRD.")).toBeInTheDocument();
  });

  it("renders rejected hold outcome", () => {
    render(
      <ProcessingStatusChangeOutcomeBanner
        request={{
          ...baseRequest,
          requestType: "processing_hold",
          requestedStatus: "processing_hold",
          status: "rejected",
          reviewNotes: null,
        }}
      />,
    );

    expect(screen.getByText("Hold request rejected")).toBeInTheDocument();
    expect(screen.getByText("No review notes were provided.")).toBeInTheDocument();
  });
});
