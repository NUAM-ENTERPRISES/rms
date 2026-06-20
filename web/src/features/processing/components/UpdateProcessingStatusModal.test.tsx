import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateProcessingStatusModal } from "./UpdateProcessingStatusModal";

const createRequestMock = vi.fn();
const useGetContextMock = vi.fn();

vi.mock("@/app/hooks", () => ({
  useAppSelector: vi.fn((selector: (state: { auth: { user?: { roles?: string[] } } }) => unknown) =>
    selector({ auth: { user: { roles: ["Processing Executive"] } } }),
  ),
}));

vi.mock("@/features/processing/data/processing.endpoints", () => ({
  useCreateProcessingStatusChangeRequestMutation: () => [
    createRequestMock,
    { isLoading: false },
  ],
  useGetProcessingStatusUpdateContextQuery: (...args: unknown[]) =>
    useGetContextMock(...args),
}));

describe("UpdateProcessingStatusModal", () => {
  beforeEach(async () => {
    createRequestMock.mockReset();
    createRequestMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { status: "pending" } }),
    });

    const { useAppSelector } = await import("@/app/hooks");
    vi.mocked(useAppSelector).mockImplementation(
      (selector: (state: { auth: { user?: { roles?: string[] } } }) => unknown) =>
        selector({ auth: { user: { roles: ["Processing Executive"] } } }),
    );
  });

  it("shows current status and target transitions when processing is cancelled", async () => {
    useGetContextMock.mockReturnValue({
      data: {
        data: {
          processingStatus: "cancelled",
          anchorStepId: "step-1",
          stepKey: "hrd",
          stepLabel: "HRD",
          availableRequestTypes: ["processing_hold", "processing_reactivate"],
        },
      },
      isLoading: false,
      isError: false,
    });

    render(
      <UpdateProcessingStatusModal
        isOpen
        onClose={() => undefined}
        processingId="pc-1"
        processingStatus="cancelled"
        stepKey="hrd"
      />,
    );

    expect(await screen.findByText("Current: Processing Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Move to Hold")).toBeInTheDocument();
    expect(screen.getByText("Reactivate Processing")).toBeInTheDocument();
    expect(screen.getAllByText("Processing In Progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Processing On Hold").length).toBeGreaterThan(0);
  });

  it("shows cancel and reactivate options when processing is on hold", async () => {
    useGetContextMock.mockReturnValue({
      data: {
        data: {
          processingStatus: "on_hold",
          anchorStepId: "step-2",
          stepKey: "visa",
          stepLabel: "Visa",
          availableRequestTypes: ["processing_cancel", "processing_reactivate"],
        },
      },
      isLoading: false,
      isError: false,
    });

    render(
      <UpdateProcessingStatusModal
        isOpen
        onClose={() => undefined}
        processingId="pc-1"
        processingStatus="on_hold"
      />,
    );

    expect(await screen.findByText("Current: Processing On Hold")).toBeInTheDocument();
    expect(screen.getByText("Cancel Processing")).toBeInTheDocument();
    expect(screen.getByText("Reactivate Processing")).toBeInTheDocument();
    expect(screen.getAllByText("Processing Cancelled").length).toBeGreaterThan(0);
  });

  it("submits a reactivation request after confirmation", async () => {
    useGetContextMock.mockReturnValue({
      data: {
        data: {
          processingStatus: "on_hold",
          anchorStepId: "step-2",
          stepKey: "visa",
          availableRequestTypes: ["processing_cancel", "processing_reactivate"],
        },
      },
      isLoading: false,
      isError: false,
    });

    const user = userEvent.setup();

    render(
      <UpdateProcessingStatusModal
        isOpen
        onClose={() => undefined}
        processingId="pc-1"
        processingStatus="on_hold"
      />,
    );

    await user.click(await screen.findByText("Reactivate Processing"));
    await user.type(
      screen.getByPlaceholderText(
        "Explain why this status change is needed (minimum 10 characters)",
      ),
      "Candidate is ready to continue processing",
    );
    await user.click(screen.getByRole("button", { name: "Review & Submit" }));
    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => {
      expect(createRequestMock).toHaveBeenCalledWith({
        processingStepId: "step-2",
        requestType: "processing_reactivate",
        reason: "Candidate is ready to continue processing",
      });
    });
  });

  it("applies changes directly for manager without approval step", async () => {
    const { useAppSelector } = await import("@/app/hooks");
    vi.mocked(useAppSelector).mockImplementation(
      (selector: (state: { auth: { user?: { roles?: string[] } } }) => unknown) =>
        selector({ auth: { user: { roles: ["Manager"] } } }),
    );

    createRequestMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { status: "approved" } }),
    });

    useGetContextMock.mockReturnValue({
      data: {
        data: {
          processingStatus: "on_hold",
          anchorStepId: "step-2",
          stepKey: "visa",
          availableRequestTypes: ["processing_reactivate"],
        },
      },
      isLoading: false,
      isError: false,
    });

    const user = userEvent.setup();

    render(
      <UpdateProcessingStatusModal
        isOpen
        onClose={() => undefined}
        processingId="pc-1"
        processingStatus="on_hold"
      />,
    );

    expect(
      await screen.findByText(
        "Select the new processing status. Changes take effect immediately.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Submitting creates an approval request/),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(
        "Explain why this status change is needed (minimum 10 characters)",
      ),
      "Candidate is ready to continue processing",
    );
    await user.click(screen.getByRole("button", { name: "Apply Change" }));

    await waitFor(() => {
      expect(createRequestMock).toHaveBeenCalledWith({
        processingStepId: "step-2",
        requestType: "processing_reactivate",
        reason: "Candidate is ready to continue processing",
      });
    });
  });
});
