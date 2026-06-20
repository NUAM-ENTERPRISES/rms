import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewStatusChangeRequestModal } from "./ReviewStatusChangeRequestModal";
import type { PendingStatusChangeRequest } from "@/features/candidates/api";
import * as candidatesApi from "@/features/candidates/api";

vi.mock("@/features/candidates/api", async () => {
  const actual = await vi.importActual("@/features/candidates/api");
  return {
    ...actual,
    useApproveCandidateProjectStatusChangeRequestMutation: vi.fn(),
    useRejectCandidateProjectStatusChangeRequestMutation: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ReviewStatusChangeRequestModal", () => {
  const mockRequest: PendingStatusChangeRequest = {
    id: "test-request-id",
    requestType: "block",
    requestedStatus: "withdrawn",
    reason: "Candidate declined to proceed with this project.",
    createdAt: "2026-06-09T10:30:00Z",
    requester: {
      id: "req-123",
      name: "Emma Recruiter",
      email: "emma@example.com",
    },
  };

  const mockOnClose = vi.fn();
  const mockOnReviewed = vi.fn();
  const mockApprove = vi.fn();
  const mockReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(
      candidatesApi.useApproveCandidateProjectStatusChangeRequestMutation,
    ).mockReturnValue([
      mockApprove,
      { isLoading: false },
    ] as any);

    vi.mocked(
      candidatesApi.useRejectCandidateProjectStatusChangeRequestMutation,
    ).mockReturnValue([
      mockReject,
      { isLoading: false },
    ] as any);
  });

  it("renders modal with request details when open", () => {
    render(
      <ReviewStatusChangeRequestModal
        isOpen={true}
        onClose={mockOnClose}
        request={mockRequest}
        candidateId="cand-123"
        projectId="proj-456"
        onReviewed={mockOnReviewed}
      />,
    );

    expect(screen.getByText("Review Withdrawn Request")).toBeInTheDocument();
    expect(screen.getByText("Emma Recruiter")).toBeInTheDocument();
    expect(screen.getByText("emma@example.com")).toBeInTheDocument();
    expect(
      screen.getByText("Candidate declined to proceed with this project."),
    ).toBeInTheDocument();
    expect(screen.getByText("Requested status")).toBeInTheDocument();
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ReviewStatusChangeRequestModal
        isOpen={false}
        onClose={mockOnClose}
        request={mockRequest}
        candidateId="cand-123"
        projectId="proj-456"
      />,
    );

    expect(screen.queryByText("Review Withdrawn Request")).not.toBeInTheDocument();
  });

  it("allows entering review notes", async () => {
    const user = userEvent.setup();
    render(
      <ReviewStatusChangeRequestModal
        isOpen={true}
        onClose={mockOnClose}
        request={mockRequest}
        candidateId="cand-123"
        projectId="proj-456"
      />,
    );

    const textarea = screen.getByPlaceholderText(
      "Add notes for the requester (optional)...",
    );
    await user.type(textarea, "Approved as requested");

    expect(textarea).toHaveValue("Approved as requested");
  });

  it("shows confirmation step when Approve button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ReviewStatusChangeRequestModal
        isOpen={true}
        onClose={mockOnClose}
        request={mockRequest}
        candidateId="cand-123"
        projectId="proj-456"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Approve Request/i }),
    );

    expect(
      screen.getByText("Approve withdrawn request?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go back/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Yes, approve/i }),
    ).toBeInTheDocument();
  });

  it("calls approve mutation when Approve button is clicked", async () => {
    const user = userEvent.setup();
    mockApprove.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

    render(
      <ReviewStatusChangeRequestModal
        isOpen={true}
        onClose={mockOnClose}
        request={mockRequest}
        candidateId="cand-123"
        projectId="proj-456"
        onReviewed={mockOnReviewed}
      />,
    );

    const approveButton = screen.getByRole("button", {
      name: /Approve Request/i,
    });
    await user.click(approveButton);

    const confirmApproveButton = screen.getByRole("button", {
      name: /Yes, approve/i,
    });
    await user.click(confirmApproveButton);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith({
        requestId: "test-request-id",
        candidateId: "cand-123",
        projectId: "proj-456",
        reviewNotes: undefined,
      });
    });
  });

  it("calls reject mutation when Reject button is clicked", async () => {
    const user = userEvent.setup();
    mockReject.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

    render(
      <ReviewStatusChangeRequestModal
        isOpen={true}
        onClose={mockOnClose}
        request={mockRequest}
        candidateId="cand-123"
        projectId="proj-456"
        onReviewed={mockOnReviewed}
      />,
    );

    const rejectButton = screen.getByRole("button", {
      name: /Reject Request/i,
    });
    await user.click(rejectButton);

    const confirmRejectButton = screen.getByRole("button", {
      name: /Yes, reject/i,
    });
    await user.click(confirmRejectButton);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith({
        requestId: "test-request-id",
        candidateId: "cand-123",
        projectId: "proj-456",
        reviewNotes: undefined,
      });
    });
  });

  it("closes modal after successful approval", async () => {
    const user = userEvent.setup();
    mockApprove.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

    render(
      <ReviewStatusChangeRequestModal
        isOpen={true}
        onClose={mockOnClose}
        request={mockRequest}
        candidateId="cand-123"
        projectId="proj-456"
        onReviewed={mockOnReviewed}
      />,
    );

    const approveButton = screen.getByRole("button", {
      name: /Approve Request/i,
    });
    await user.click(approveButton);

    const confirmApproveButton = screen.getByRole("button", {
      name: /Yes, approve/i,
    });
    await user.click(confirmApproveButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnReviewed).toHaveBeenCalled();
    });
  });
});
