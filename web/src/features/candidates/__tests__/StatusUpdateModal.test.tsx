import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { StatusUpdateModal } from "../components/StatusUpdateModal";
import { CANDIDATE_STATUS } from "@/constants/statuses";

// JSDOM doesn't implement scrollIntoView which Radix Select calls; stub it for tests
(global as any).HTMLElement.prototype.scrollIntoView = () => {};

// Mock the API hook
let mockUpdate = vi
  .fn()
  .mockImplementation(() => ({ unwrap: () => Promise.resolve({ success: true }) }));

vi.mock("../api", () => ({
  useUpdateCandidateStatusMutation: () => [mockUpdate, { isLoading: false }],
  useGetCandidateStatusesQuery: () => ({ data: { data: { statuses: [] } }, isLoading: false }),
}));

// Mock the toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock candidates API statuses hook (used via services/candidatesApi)
vi.mock("@/services/candidatesApi", () => ({
  useGetCandidateStatusesQuery: () => ({ data: { data: [ { id: 1, statusName: "Interested" }, { id: 2, statusName: "Not Interested" }, { id: 3, statusName: "RNR" } ] }, isLoading: false }),
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
    expect(screen.getByText(/Update the status for/i)).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("displays current status", () => {
    render(<StatusUpdateModal {...defaultProps} />);

    // current status badge should show (case-insensitive match)
    expect(screen.getByText(/Untouched/i)).toBeInTheDocument();
  });

  it("shows status options in dropdown", async () => {
    render(<StatusUpdateModal {...defaultProps} />);

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      expect(screen.getAllByText(/Interested/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Not Interested/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/RNR/i).length).toBeGreaterThan(0);
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
    const updateStatus = vi
      .fn()
      .mockImplementation(() => ({ unwrap: () => Promise.resolve({ success: true }) }));

    // replace mocked implementation for this test
    mockUpdate.mockImplementation(updateStatus);

    render(<StatusUpdateModal {...defaultProps} />);

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      const interestedOption = options.find((o) => /Interested/i.test(o.textContent || ""));
      expect(interestedOption).toBeTruthy();
      fireEvent.click(interestedOption!);
    });

    const submitButton = screen.getByText("Update Status");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith({
        candidateId: "test-candidate-id",
        status: {
          currentStatusId: 1,
          reason: "",
        },
      });
    });
  });
});
