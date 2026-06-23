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
    useGetCandidateCountryRestrictionsQuery: vi.fn(),
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
  const mockUseGetCountryRestrictions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetCountryRestrictions.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 1 } },
      isLoading: false,
    });

    vi.mocked(candidatesApi.useGetCandidateCountryRestrictionsQuery).mockImplementation(
      mockUseGetCountryRestrictions,
    );

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

  it("shows processing status transition for reactivation review", () => {
    const processingRequest: PendingStatusChangeRequest = {
      id: "proc-request-id",
      requestType: "processing_reactivate",
      reason: "Candidate is ready to continue visa processing.",
      createdAt: "2026-06-09T10:30:00Z",
      stepKey: "visa",
      requester: {
        id: "req-123",
        name: "Alex Processing",
        email: "alex@example.com",
      },
    };

    render(
      <ReviewStatusChangeRequestModal
        isOpen
        onClose={mockOnClose}
        request={processingRequest}
        candidateId="cand-123"
        projectId="proj-456"
        processingStatus="cancelled"
        projectTitle="Hospital Project"
      />,
    );

    expect(
      screen.getByText("Review Processing Reactivation Request"),
    ).toBeInTheDocument();
    expect(screen.getByText("Reactivating processing")).toBeInTheDocument();
    expect(screen.getByText("Processing Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Processing In Progress")).toBeInTheDocument();
    expect(screen.getByText("Resume at: Visa")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Approving will change processing from Processing Cancelled to Processing In Progress at Visa.",
      ),
    ).not.toBeInTheDocument();
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

  it("shows country restriction banner for processing cancel with restrictCountryCode", () => {
    const processingCancelRequest: PendingStatusChangeRequest = {
      id: "processing-cancel-id",
      requestType: "processing_cancel",
      requestedStatus: "processing_cancelled",
      reason: "Data Flow verification failed for candidate documents.",
      createdAt: "2026-06-22T10:30:00Z",
      stepKey: "data_flow",
      restrictCountryCode: "SA",
      restrictCountryName: "Saudi Arabia",
      requester: {
        id: "req-123",
        name: "Processing User",
        email: "processing@example.com",
      },
    };

    render(
      <ReviewStatusChangeRequestModal
        isOpen
        onClose={mockOnClose}
        request={processingCancelRequest}
        candidateId="cand-123"
        projectId="proj-456"
        countryName="Saudi Arabia"
        processingStatus="in_progress"
      />,
    );

    expect(screen.getAllByText("Country restriction requested").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Saudi Arabia").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/SA · Data Flow/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Approving this request will cancel processing and restrict the candidate from all/i,
      ),
    ).toBeInTheDocument();
  });

  it("includes country restriction in approve confirmation for processing cancel", async () => {
    const user = userEvent.setup();
    const processingCancelRequest: PendingStatusChangeRequest = {
      id: "processing-cancel-id",
      requestType: "processing_cancel",
      requestedStatus: "processing_cancelled",
      reason: "Data Flow verification failed for candidate documents.",
      createdAt: "2026-06-22T10:30:00Z",
      stepKey: "data_flow",
      restrictCountryCode: "SA",
      restrictCountryName: "Saudi Arabia",
      requester: {
        id: "req-123",
        name: "Processing User",
        email: "processing@example.com",
      },
    };

    render(
      <ReviewStatusChangeRequestModal
        isOpen
        onClose={mockOnClose}
        request={processingCancelRequest}
        candidateId="cand-123"
        projectId="proj-456"
        processingStatus="in_progress"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Approve Request/i }));

    expect(
      screen.getByText(
        /This will also restrict the candidate from all Saudi Arabia projects/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows country restriction lift notice for cancelled processing reactivation review", async () => {
    const user = userEvent.setup();

    mockUseGetCountryRestrictions.mockReturnValue({
      data: {
        items: [
          {
            id: "restriction-1",
            candidateId: "cand-123",
            countryCode: "SA",
            restrictionType: "processing_step_cancel",
            reason: "Cancelled during Data Flow",
            restrictedAt: "2026-06-22T10:00:00.000Z",
            isActive: true,
            country: { code: "SA", name: "Saudi Arabia" },
          },
        ],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      },
      isLoading: false,
    });

    const reactivationRequest: PendingStatusChangeRequest = {
      id: "processing-reactivate-id",
      requestType: "processing_reactivate",
      requestedStatus: "processing_in_progress",
      reason: "Candidate cleared to resume processing after document correction.",
      createdAt: "2026-06-22T11:00:00Z",
      stepKey: "data_flow",
      requester: {
        id: "req-123",
        name: "Processing User",
        email: "processing@example.com",
      },
    };

    render(
      <ReviewStatusChangeRequestModal
        isOpen
        onClose={mockOnClose}
        request={reactivationRequest}
        candidateId="cand-123"
        projectId="proj-456"
        projectCountryCode="SA"
        countryName="Saudi Arabia"
        processingStatus="cancelled"
      />,
    );

    expect(
      await screen.findByText("Review Processing Reactivation Request"),
    ).toBeInTheDocument();
    expect(screen.getByText("Country restriction will be removed")).toBeInTheDocument();
    expect(
      screen.getByText(/Approving this request will lift that restriction automatically/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Approve Request/i }));

    expect(
      screen.getByText(/lift the active Saudi Arabia country restriction/i),
    ).toBeInTheDocument();
  });

  it("shows checkbox to opt out of country restriction on processing cancel review", () => {
    const processingCancelRequest: PendingStatusChangeRequest = {
      id: "processing-cancel-id",
      requestType: "processing_cancel",
      requestedStatus: "processing_cancelled",
      reason: "Data Flow verification failed for candidate documents.",
      createdAt: "2026-06-22T10:30:00Z",
      stepKey: "data_flow",
      restrictCountryCode: "SA",
      restrictCountryName: "Saudi Arabia",
      requester: {
        id: "req-123",
        name: "Processing User",
        email: "processing@example.com",
      },
    };

    render(
      <ReviewStatusChangeRequestModal
        isOpen
        onClose={mockOnClose}
        request={processingCancelRequest}
        candidateId="cand-123"
        projectId="proj-456"
        processingStatus="in_progress"
      />,
    );

    expect(
      screen.getByRole("checkbox", {
        name: /Apply country restriction for Saudi Arabia/i,
      }),
    ).toBeChecked();
  });

  it("updates approve confirmation when country restriction is unchecked", async () => {
    const user = userEvent.setup();
    const processingCancelRequest: PendingStatusChangeRequest = {
      id: "processing-cancel-id",
      requestType: "processing_cancel",
      requestedStatus: "processing_cancelled",
      reason: "Data Flow verification failed for candidate documents.",
      createdAt: "2026-06-22T10:30:00Z",
      stepKey: "data_flow",
      restrictCountryCode: "SA",
      restrictCountryName: "Saudi Arabia",
      requester: {
        id: "req-123",
        name: "Processing User",
        email: "processing@example.com",
      },
    };

    render(
      <ReviewStatusChangeRequestModal
        isOpen
        onClose={mockOnClose}
        request={processingCancelRequest}
        candidateId="cand-123"
        projectId="proj-456"
        processingStatus="in_progress"
      />,
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: /Apply country restriction for Saudi Arabia/i,
      }),
    );

    expect(
      screen.getByText(/cancel processing without applying a country restriction/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Approve Request/i }));

    expect(
      screen.queryByText(
        /This will also restrict the candidate from all Saudi Arabia projects/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("sends applyCountryRestriction false when approving without restriction", async () => {
    const user = userEvent.setup();
    mockApprove.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

    const processingCancelRequest: PendingStatusChangeRequest = {
      id: "processing-cancel-id",
      requestType: "processing_cancel",
      requestedStatus: "processing_cancelled",
      reason: "Data Flow verification failed for candidate documents.",
      createdAt: "2026-06-22T10:30:00Z",
      stepKey: "data_flow",
      restrictCountryCode: "SA",
      restrictCountryName: "Saudi Arabia",
      requester: {
        id: "req-123",
        name: "Processing User",
        email: "processing@example.com",
      },
    };

    render(
      <ReviewStatusChangeRequestModal
        isOpen
        onClose={mockOnClose}
        request={processingCancelRequest}
        candidateId="cand-123"
        projectId="proj-456"
        processingStatus="in_progress"
        onReviewed={mockOnReviewed}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: /Apply country restriction for Saudi Arabia/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Approve Request/i }));
    await user.click(screen.getByRole("button", { name: /Yes, approve/i }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "processing-cancel-id",
          applyCountryRestriction: false,
        }),
      );
    });
  });
});
