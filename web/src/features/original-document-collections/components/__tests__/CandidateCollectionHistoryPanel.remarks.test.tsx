import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidateCollectionHistoryPanel } from "../CandidateCollectionHistoryPanel";

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
}));

vi.mock("../EventMergeUploadRow", () => ({
  EventMergeUploadRow: () => <div data-testid="event-merge-row" />,
}));

vi.mock("../../api", () => ({
  useGetCandidateOriginalDocumentCollectionsQuery: () => ({
    isLoading: false,
    data: {
      data: {
        collection: {
          id: "col-1",
          status: "draft",
        },
        events: [
          {
            id: "evt-1",
            collectionType: "direct",
            collectedAt: "2026-06-12T10:00:00.000Z",
            remarks: "Collected at front desk",
            collectedBy: { id: "user-1", name: "Jane Collector" },
            directOffice: "kochi",
            items: [
              {
                docType: "sslc_certificate_original",
                isReceived: true,
                remarks: "Original copy, laminated",
              },
              {
                docType: "degree_certificate_original",
                isReceived: true,
                remarks: null,
              },
            ],
            mergedDocument: null,
          },
        ],
        cumulativeReceived: [
          {
            docType: "sslc_certificate_original",
            isReceived: true,
            remarks: "Original copy, laminated",
          },
          {
            docType: "degree_certificate_original",
            isReceived: true,
            remarks: null,
          },
        ],
      },
    },
  }),
  useGetOriginalDocumentCollectionEventMergesQuery: () => ({
    data: { data: { items: [], pagination: { total: 0, totalPages: 1, page: 1 } } },
  }),
}));

describe("CandidateCollectionHistoryPanel remarks", () => {
  it("renders visit notes and per-document remarks in the timeline", () => {
    render(
      <CandidateCollectionHistoryPanel
        candidateId="cand-1"
        variant="compact"
        showAddEventLink={false}
      />,
    );

    expect(screen.getByText(/Visit notes/i)).toBeInTheDocument();
    expect(screen.getByText("Collected at front desk")).toBeInTheDocument();
    expect(screen.getByText("Original copy, laminated")).toBeInTheDocument();
  });
});
