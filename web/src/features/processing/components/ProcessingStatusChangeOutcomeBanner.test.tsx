import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcessingStatusChangeOutcomeBanner } from "./ProcessingStatusChangeOutcomeBanner";
import type { ReviewedStatusChangeRequest } from "@/features/candidates/api";

describe("ProcessingStatusChangeOutcomeBanner", () => {
  const baseRequest: ReviewedStatusChangeRequest = {
    id: "req-1",
    requestType: "processing_cancel",
    reason: "Candidate withdrew from the project.",
    createdAt: "2026-06-19T10:00:00.000Z",
    status: "approved",
    reviewedAt: "2026-06-19T12:30:00.000Z",
    reviewNotes: "Confirmed with the processing team.",
    requester: { id: "u1", name: "Alex Processor", email: "alex@example.com" },
    reviewer: { id: "u2", name: "Maria Manager", email: "maria@example.com" },
  };

  it("shows reviewer, review date, and notes for approved cancellation", () => {
    render(<ProcessingStatusChangeOutcomeBanner request={baseRequest} />);

    expect(screen.getByText("Cancellation request approved")).toBeInTheDocument();
    expect(screen.getByText(/Approved by/i)).toBeInTheDocument();
    expect(screen.getByText("Maria Manager")).toBeInTheDocument();
    expect(screen.getByText(/Originally requested by Alex Processor/i)).toBeInTheDocument();
    expect(screen.getByText("Candidate withdrew from the project.")).toBeInTheDocument();
    expect(screen.getByText("Confirmed with the processing team.")).toBeInTheDocument();
  });

  it("shows rejected hold outcome copy", () => {
    render(
      <ProcessingStatusChangeOutcomeBanner
        request={{
          ...baseRequest,
          requestType: "processing_hold",
          status: "rejected",
          reviewNotes: null,
        }}
      />,
    );

    expect(screen.getByText("Hold request rejected")).toBeInTheDocument();
    expect(screen.getByText(/Rejected by/i)).toBeInTheDocument();
    expect(screen.getByText("No review notes were provided.")).toBeInTheDocument();
  });
});
