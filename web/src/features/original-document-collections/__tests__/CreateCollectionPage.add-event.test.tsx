import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CreateCollectionPage from "../views/CreateCollectionPage";

const mockAddEvent = vi.fn();
const mockCreateCollection = vi.fn();

const mockHistoryData = {
  collection: { id: "col-1", status: "locker_submitted" as string },
  events: [{ id: "evt-1" }, { id: "evt-2" }],
  cumulativeReceived: [{ docType: "sslc_certificate_original", isReceived: true }],
};

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
}));

vi.mock("@/components/molecules", () => ({
  SelectCandidate: () => <div data-testid="select-candidate" />,
}));

vi.mock("../components/SelectedCandidateSummary", () => ({
  SelectedCandidateSummary: () => <div data-testid="candidate-summary" />,
}));

vi.mock("../components/CollectionSourceForm", () => ({
  CollectionSourceForm: () => <div data-testid="source-form" />,
}));

vi.mock("../components/OriginalDocumentChecklist", () => ({
  OriginalDocumentChecklist: () => <div data-testid="checklist" />,
  buildDefaultChecklistItems: () => [],
}));

vi.mock("../components/CandidateCollectionHistoryPanel", () => ({
  CandidateCollectionHistoryBadges: () => (
    <div data-testid="history-badges">2 prior intake events</div>
  ),
  CandidateCollectionHistoryPanel: () => (
    <div data-testid="history-panel">history</div>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("../api", () => ({
  useGetCandidateOriginalDocumentCollectionsQuery: () => ({
    data: { data: mockHistoryData },
  }),
  useCreateOriginalDocumentCollectionMutation: () => [
    mockCreateCollection,
    { isLoading: false },
  ],
  useAddOriginalDocumentCollectionEventMutation: () => [
    mockAddEvent,
    { isLoading: false },
  ],
}));

describe("CreateCollectionPage add-event flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryData.collection = {
      id: "col-1",
      status: "locker_submitted",
    };
  });

  it("shows log intake event heading when candidate already has a collection", () => {
    render(
      <MemoryRouter
        initialEntries={["/original-documents/new?candidateId=cand-1"]}
      >
        <Routes>
          <Route path="/original-documents/new" element={<CreateCollectionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Log Intake Event")).toBeInTheDocument();
    expect(screen.getByTestId("history-badges")).toBeInTheDocument();
    expect(screen.getByTestId("history-panel")).toBeInTheDocument();
  });

  it("disables save and shows completed message when collection is completed", () => {
    mockHistoryData.collection = {
      id: "col-completed",
      status: "completed",
      completedBy: { name: "Jane Collector" },
      completedAt: "2026-06-12T10:00:00.000Z",
    };

    render(
      <MemoryRouter
        initialEntries={["/original-documents/new?candidateId=cand-1"]}
      >
        <Routes>
          <Route path="/original-documents/new" element={<CreateCollectionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Original documents already collected"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Collector/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Save & Continue" })).toBeNull();
    expect(screen.getByRole("link", { name: "View Collection" })).toHaveAttribute(
      "href",
      "/original-documents/col-completed",
    );
  });
});
