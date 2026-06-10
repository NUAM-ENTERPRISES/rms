import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequesterPendingStatusBanner } from "./RequesterPendingStatusBanner";
import type { PendingStatusChangeRequest } from "@/features/candidates/api";

describe("RequesterPendingStatusBanner", () => {
  const mockRequest: PendingStatusChangeRequest = {
    id: "test-request-id",
    requestedStatus: "withdrawn",
    reason: "Candidate declined to proceed with this project.",
    createdAt: "2026-06-09T10:30:00Z",
    requester: {
      id: "req-123",
      name: "Emma Recruiter",
      email: "emma@example.com",
    },
  };

  it("renders the banner with request details", () => {
    render(<RequesterPendingStatusBanner request={mockRequest} />);

    expect(
      screen.getByText("Withdrawn Request Submitted"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
    expect(screen.getByText("Your Remarks")).toBeInTheDocument();
    expect(
      screen.getByText("Candidate declined to proceed with this project."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Awaiting Approval"),
    ).toBeInTheDocument();
  });

  it("renders On Hold status correctly", () => {
    const onHoldRequest: PendingStatusChangeRequest = {
      ...mockRequest,
      requestedStatus: "on_hold",
    };

    render(<RequesterPendingStatusBanner request={onHoldRequest} />);

    expect(
      screen.getByText("On Hold Request Submitted"),
    ).toBeInTheDocument();
  });

  it("displays the formatted date", () => {
    render(<RequesterPendingStatusBanner request={mockRequest} />);

    const dateElement = screen.getByText(/Jun/);
    expect(dateElement).toBeInTheDocument();
  });

  it("displays the reason in a card with proper styling", () => {
    render(<RequesterPendingStatusBanner request={mockRequest} />);

    const reasonText = screen.getByText(
      "Candidate declined to proceed with this project.",
    );
    expect(reasonText).toBeInTheDocument();
    expect(reasonText).toHaveClass("text-sm");
  });

  it("displays pending badge", () => {
    render(<RequesterPendingStatusBanner request={mockRequest} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
