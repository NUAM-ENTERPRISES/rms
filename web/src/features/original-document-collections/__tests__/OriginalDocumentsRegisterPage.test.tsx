import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import OriginalDocumentsRegisterPage from "../views/OriginalDocumentsRegisterPage";
import { baseApi } from "@/app/api/baseApi";

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          name: "Priya Documents Control",
          roles: ["Documents Control Executive"],
        },
      },
    }),
}));

vi.mock("../api", () => ({
  useGetOriginalDocumentCollectionStatsQuery: () => ({
    data: {
      data: {
        totalCollections: 1,
        totalDocumentsCollected: 3,
        completedCollections: 0,
        pendingCollections: 1,
        inLocker: 0,
        thisMonthCollections: 1,
        byType: { courier: 1 },
      },
    },
  }),
  useGetOriginalDocumentCollectionsQuery: () => ({
    data: {
      data: {
        collections: [
          {
            id: "col-1",
            candidateId: "cand-1",
            status: "draft",
            lockerFileNumber: null,
            eventCount: +2,
            cumulativeReceivedCount: 1,
            cumulativeReceived: [
              { docType: "degree_certificate_original", isReceived: true },
            ],
            events: [],
            candidate: {
              firstName: "Abhi",
              lastName: "Kumar",
              candidateCode: "ABH-001",
            },
            latestEvent: {
              id: "evt-2",
              collectionType: "courier",
              collectedAt: "2026-06-12T10:00:00.000Z",
              courierPartner: "Blue Dart",
              trackingNumber: "TRK123",
              collectedBy: { name: "Priya DCE" },
            },
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
    },
    isLoading: false,
    isFetching: false,
  }),
  useLazyExportOriginalDocumentCollectionsQuery: () => [
    vi.fn(),
    { isFetching: false },
  ],
}));

function renderPage() {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <OriginalDocumentsRegisterPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe("OriginalDocumentsRegisterPage", () => {
  it("renders register table with collection row", () => {
    renderPage();
    expect(screen.getByText("Original Documents Collected")).toBeInTheDocument();
    expect(screen.getAllByText("Original Document Intake").length).toBeGreaterThan(0);
    expect(screen.getByText("Abhi Kumar")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Courier")).toBeInTheDocument();
    expect(screen.getByText("1 doc")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("2/8")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });
});
