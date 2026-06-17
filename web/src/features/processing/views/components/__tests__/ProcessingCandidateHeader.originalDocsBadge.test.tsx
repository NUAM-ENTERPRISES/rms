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

describe("ProcessingCandidateHeader original docs badge", () => {
  it("renders Affiniks badge with highlighted file number and opens modal on click", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProcessingCandidateHeader
          candidate={{
            firstName: "Test",
            lastName: "Candidate",
            candidateCode: "C-001",
          }}
          project={{ title: "Project A" }}
          role={{ designation: "Nurse" }}
          processingStatus="in_progress"
          processingId="processing-12345678"
          fileNumber="1112"
          recruiter={{ name: "Recruiter" }}
          originalDocumentCollection={{
            id: "odc-1",
            status: "collected",
            lockerFileNumber: "A-12",
            mergedDocument: {
              id: "doc-1",
              fileName: "merged.pdf",
              fileUrl: "https://example.com/merged.pdf",
              mimeType: "application/pdf",
            },
          }}
          documentReceivedStepStatus="completed"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Document collected by Affiniks")).toBeInTheDocument();
    expect(screen.getByText("1112")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /original document collection details/i }));
    expect(screen.getByText("Original Documents (Affiniks Collection)")).toBeInTheDocument();
    expect(screen.getByText("File #1112")).toBeInTheDocument();
  });
});

