import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProcessingCandidateHeader } from "../ProcessingCandidateHeader";

vi.mock("@/features/processing/data/processing.endpoints", () => ({
  useGetDocumentCollectionHistoryPaginatedQuery: () => ({
    data: { success: true, data: { items: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } }, message: "" },
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
  useGetCourierHistoryPaginatedQuery: () => ({
    data: { success: true, data: { items: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } }, message: "" },
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/courier-shipments/components/ShipmentStatusBadge", () => ({
  ShipmentStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/features/courier-shipments/constants", () => ({
  DELIVERY_MODE_LABELS: {},
}));

const baseProps = {
  candidate: {
    firstName: "Test",
    lastName: "Candidate",
    candidateCode: "C-001",
  },
  project: { title: "Project A" },
  role: { designation: "Nurse" },
  processingStatus: "in_progress",
  processingId: "processing-12345678",
};

describe("ProcessingCandidateHeader previous projects button", () => {
  it("renders previous projects button and badge when count is provided", async () => {
    const user = userEvent.setup();
    const onOpenPreviousProjects = vi.fn();

    render(
      <MemoryRouter>
        <ProcessingCandidateHeader
          {...baseProps}
          onOpenPreviousProjects={onOpenPreviousProjects}
          previousProjectsCount={2}
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", {
      name: /view previous projects processing/i,
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    await user.click(button);
    expect(onOpenPreviousProjects).toHaveBeenCalledTimes(1);
  });

  it("renders previous projects button without badge when count is zero", () => {
    render(
      <MemoryRouter>
        <ProcessingCandidateHeader
          {...baseProps}
          onOpenPreviousProjects={() => undefined}
          previousProjectsCount={0}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: /view previous projects processing/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
