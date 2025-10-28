import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { StatusUpdateModal } from "../components/StatusUpdateModal";
import { CANDIDATE_STATUS } from "@/constants/statuses";

// Mock the API hook
vi.mock("../api", () => ({
  useUpdateCandidateStatusMutation: () => [
    vi.fn().mockResolvedValue({
      unwrap: () => Promise.resolve({ success: true }),
    }),
    { isLoading: false },
  ],
}));

// Mock the toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StatusUpdateModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    candidateId: "test-candidate-id",
    currentStatus: CANDIDATE_STATUS.UNTOUCHED,
    candidateName: "John Doe",
  };

  it("renders the modal when open", () => {
    render(<StatusUpdateModal {...defaultProps} />);

    expect(screen.getByText("Update Candidate Status")).toBeInTheDocument();
    expect(
      screen.getByText("Update the status for John Doe")
    ).toBeInTheDocument();
  });

  it("displays current status", () => {
    render(<StatusUpdateModal {...defaultProps} />);

    expect(screen.getByText("Untouched")).toBeInTheDocument();
  });

  it("shows status options in dropdown", async () => {
    render(<StatusUpdateModal {...defaultProps} />);

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      expect(screen.getByText("Interested")).toBeInTheDocument();
      expect(screen.getByText("Not Interested")).toBeInTheDocument();
      expect(screen.getByText("RNR")).toBeInTheDocument();
    });
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(<StatusUpdateModal {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("submits form with selected status", async () => {
    const updateStatus = vi.fn().mockResolvedValue({
      unwrap: () => Promise.resolve({ success: true }),
    });

    vi.mocked(
      require("../api").useUpdateCandidateStatusMutation
    ).mockReturnValue([updateStatus, { isLoading: false }]);

    render(<StatusUpdateModal {...defaultProps} />);

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const interestedOption = screen.getByText("Interested");
      fireEvent.click(interestedOption);
    });

    const submitButton = screen.getByText("Update Status");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith({
        candidateId: "test-candidate-id",
        status: {
          status: CANDIDATE_STATUS.INTERESTED,
          reason: "",
        },
      });
    });
  });
});
