import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewedStatusChangeRequestBanner } from "./ReviewedStatusChangeRequestBanner";
import type { ReviewedStatusChangeRequest } from "@/features/candidates/api";

describe("ReviewedStatusChangeRequestBanner", () => {
  const baseRequest: ReviewedStatusChangeRequest = {
    id: "req-1",
    requestedStatus: "withdrawn",
    reason: "Candidate declined to proceed.",
    status: "rejected",
    createdAt: "2026-06-09T10:30:00Z",
    reviewedAt: "2026-06-09T11:00:00Z",
    reviewNotes: "Not enough context provided.",
    requester: { id: "u1", name: "Emma Recruiter" },
    reviewer: { id: "u2", name: "Manager One" },
  };

  it("renders rejected state", () => {
    render(<ReviewedStatusChangeRequestBanner request={baseRequest} />);

    expect(screen.getByText("Withdrawn Request Rejected")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Candidate declined to proceed.")).toBeInTheDocument();
    expect(screen.getByText("Not enough context provided.")).toBeInTheDocument();
    expect(screen.getByText(/by Manager One/i)).toBeInTheDocument();
  });

  it("renders approved state", () => {
    render(
      <ReviewedStatusChangeRequestBanner
        request={{ ...baseRequest, status: "approved", reviewNotes: null }}
      />,
    );

    expect(screen.getByText("Withdrawn Request Approved")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });
});
